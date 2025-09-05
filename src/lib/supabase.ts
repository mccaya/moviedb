import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Movie {
  id: string
  user_id: string
  tmdb_id: number
  title: string
  poster_path: string | null
  overview: string | null
  release_date: string | null
  rating: number | null
  genres: string[]
  watched: boolean
  personal_rating: number | null
  added_at: string
  user_preference: 'thumbs_up' | 'thumbs_down' | null
  // New Emby integration fields
  emby_item_id?: string | null
  emby_available?: boolean
  last_emby_check?: string | null
}

interface CreateMovieData {
  tmdb_id: number
  title: string
  poster_path: string | null
  overview: string | null
  release_date: string | null
  rating: number | null
  genres: string[]
  watched: boolean
}

export const movieService = {
  async getWatchlist() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    return supabase
      .from('watchlist_items')
      .select('*')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false })
  },

  async addToWatchlist(movieData: CreateMovieData) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    return supabase
      .from('watchlist_items')
      .insert([{ ...movieData, user_id: user.id }])
      .select()
      .single()
  },

  async removeFromWatchlist(id: string) {
    return supabase
      .from('watchlist_items')
      .delete()
      .eq('id', id)
  },

  async updateWatchedStatus(id: string, watched: boolean) {
    return supabase
      .from('watchlist_items')
      .update({ watched })
      .eq('id', id)
      .select()
      .single()
  },

  async updateUserPreference(id: string, preference: 'thumbs_up' | 'thumbs_down' | null) {
    return supabase
      .from('watchlist_items')
      .update({ user_preference: preference })
      .eq('id', id)
      .select()
      .single()
  },

  // New Emby integration methods
  async updateEmbyStatus(id: string, embyItemId: string | null, available: boolean) {
    return supabase
      .from('watchlist_items')
      .update({ 
        emby_item_id: embyItemId,
        emby_available: available,
        last_emby_check: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
  },

  async getMoviesNeedingEmbyCheck() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get movies that haven't been checked in the last 24 hours or never checked
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    return supabase
      .from('watchlist_items')
      .select('*')
      .eq('user_id', user.id)
      .or(`last_emby_check.is.null,last_emby_check.lt.${yesterday.toISOString()}`)
  }
}