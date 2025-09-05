import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return supabaseUrl && 
         supabaseAnonKey && 
         supabaseUrl !== 'https://your-project.supabase.co' && 
         supabaseAnonKey !== 'your-supabase-anon-key'
}

// Create client with fallback values to prevent crashes
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
)

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
  added_at: string
  user_preference?: 'thumbs_up' | 'thumbs_down' | null
}

export const movieService = {
  async addToWatchlist(movie: Omit<Movie, 'id' | 'user_id' | 'added_at'>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('watchlist_items')
      .insert({
        user_id: user.id,
        tmdb_id: movie.tmdb_id,
        title: movie.title,
        poster_path: movie.poster_path,
        overview: movie.overview,
        release_date: movie.release_date,
        rating: movie.rating,
        genres: Array.isArray(movie.genres) ? movie.genres : [],
        watched: movie.watched,
        user_preference: movie.user_preference
      })
      .select()
      .single()

    return { data, error }
  },

  async getWatchlist() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: [], error: null }

    const { data, error } = await supabase
      .from('watchlist_items')
      .select('id, user_id, tmdb_id, title, poster_path, overview, release_date, rating, genres, watched, added_at, user_preference')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false })

    return { data, error }
  },

  async removeFromWatchlist(id: string) {
    const { error } = await supabase
      .from('watchlist_items')
      .delete()
      .eq('id', id)

    return { error }
  },

  async updateWatchedStatus(id: string, watched: boolean) {
    const { data, error } = await supabase
      .from('watchlist_items')
      .update({ watched })
      .eq('id', id)
      .select()
      .single()

    return { data, error }
  },

  async updateUserPreference(id: string, preference: 'thumbs_up' | 'thumbs_down' | null) {
    const { data, error } = await supabase
      .from('watchlist_items')
      .update({ user_preference: preference })
      .eq('id', id)
      .select()
      .single()

    return { data, error }
  }
}