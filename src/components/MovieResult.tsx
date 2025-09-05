import { useState } from 'react'
import { Plus, Calendar, Star, Loader2 } from 'lucide-react'
import { tmdbAPI, TMDBMovie } from '../lib/tmdb'
import { cn, formatRating, getGenreColor } from '../lib/utils'
import { MovieModal } from './MovieModal'

interface Movie {
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
  user_preference: string | null
}

interface MovieResultProps {
  movie: TMDBMovie
  onAdd: (movie: TMDBMovie) => Promise<void>
  isAdded?: boolean
  watchlistMovies?: Movie[]
  onRemoveMovie?: (movieId: string) => Promise<void>
  onShowCollection?: (movieTitle: string, movieId: number) => void
}

export function MovieResult({ 
  movie, 
  onAdd, 
  isAdded = false, 
  watchlistMovies = [], 
  onRemoveMovie = async () => {}, 
  onShowCollection 
}: MovieResultProps) {
  const [adding, setAdding] = useState(false)
  const [showMovieModal, setShowMovieModal] = useState(false)

  const handleAdd = async () => {
    if (isAdded) return
    
    setAdding(true)
    try {
      await onAdd(movie)
      
      // Check if movie is part of a collection and show modal
      const collection = await tmdbAPI.getMovieCollection(movie.id)
      if (collection && onShowCollection) {
        onShowCollection(movie.title, movie.id)
      }
    } catch (error) {
      console.error('Failed to add movie:', error)
    } finally {
      setAdding(false)
    }
  }

  const handleMovieClick = (e: React.MouseEvent) => {
    // Don't open modal if clicking on the add button
    if ((e.target as HTMLElement).closest('button')) {
      return
    }
    setShowMovieModal(true)
  }
  const genres = tmdbAPI.getGenreNames(movie.genre_ids || [])
  const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : 'TBA'

  return (
    <>
      <div 
        className="group relative bg-gray-800 rounded-xl overflow-hidden hover:bg-gray-750 transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer"
        onClick={handleMovieClick}
      >
      <div className="aspect-[2/3] relative overflow-hidden">
        <img
          src={tmdbAPI.getImageUrl(movie.poster_path)}
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = 'https://images.unsplash.com/photo-1489599511986-c2b8e5b1b5b5?w=400&h=600&fit=crop'
          }}
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Add button */}
        <button
          onClick={handleAdd}
          disabled={adding || isAdded}
          className={cn(
            "absolute top-3 right-3 p-2 rounded-full transition-all duration-300",
            "opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0",
            isAdded 
              ? "bg-green-600 text-white" 
              : "bg-black/60 hover:bg-blue-600 text-white backdrop-blur-sm"
          )}
        >
          {adding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isAdded ? (
            <div className="h-4 w-4 flex items-center justify-center">✓</div>
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </button>

        {/* Rating badge */}
        {movie.vote_average > 0 && (
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
            <Star className="h-3 w-3 text-yellow-400 fill-current" />
            <span className="text-xs text-white font-medium">
              {formatRating(movie.vote_average)}
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-white text-sm mb-2 line-clamp-2 leading-tight">
          {movie.title}
        </h3>
        
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
          <Calendar className="h-3 w-3" />
          <span>{releaseYear}</span>
        </div>

        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {genres.slice(0, 2).map((genre) => (
              <span
                key={genre}
                className={cn(
                  "px-2 py-1 rounded-full text-xs text-white font-medium",
                  getGenreColor(genre)
                )}
              >
                {genre}
              </span>
            ))}
            {genres.length > 2 && (
              <span className="px-2 py-1 rounded-full text-xs text-gray-400 bg-gray-700">
                +{genres.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
      </div>
      
      <MovieModal
        isOpen={showMovieModal}
        onClose={() => setShowMovieModal(false)}
        movie={movie}
        isInWatchlist={isAdded}
        onAddToWatchlist={onAddToWatchlist}
        onRemoveFromWatchlist={onRemoveMovie}
      />
    </>
  )
}