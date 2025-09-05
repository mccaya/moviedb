import React from 'react'
import { Loader2, Film } from 'lucide-react'
import { MovieCard } from './MovieCard'
import { Movie } from '../lib/supabase'

interface WatchlistGridProps {
  movies: Movie[]
  viewMode: 'grid' | 'list'
  loading: boolean
  onRemove: (id: string) => Promise<void>
  onToggleWatched: (id: string, watched: boolean) => Promise<void>
  onUpdatePreference: (id: string, preference: 'thumbs_up' | 'thumbs_down' | null) => Promise<void>
}

export function WatchlistGrid({ 
  movies, 
  viewMode, 
  loading, 
  onRemove, 
  onToggleWatched, 
  onUpdatePreference 
}: WatchlistGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-400">Loading your watchlist...</span>
      </div>
    )
  }

  if (movies.length === 0) {
    return (
      <div className="text-center py-16">
        <Film className="h-16 w-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-300 mb-2">No movies found</h3>
        <p className="text-gray-500">
          Start building your watchlist by searching for movies above!
        </p>
      </div>
    )
  }

  return (
    <div className={
      viewMode === 'grid' 
        ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6'
        : 'space-y-4'
    }>
      {movies.map((movie) => (
        <MovieCard
          key={movie.id}
          movie={movie}
          viewMode={viewMode}
          onRemove={onRemove}
          onToggleWatched={onToggleWatched}
          onUpdatePreference={onUpdatePreference}
        />
      ))}
    </div>
  )
}