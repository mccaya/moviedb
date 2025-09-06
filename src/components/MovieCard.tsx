import React, { useState } from 'react'
import { 
  Calendar, 
  ThumbsUp,
  ThumbsDown,
  Trash2, 
  Check, 
  X, 
  Eye, 
  EyeOff,
  MoreVertical,
  Star,
  Play
} from 'lucide-react'
import { Movie } from '../lib/supabase'
import { tmdbAPI } from '../lib/tmdb'
import { cn, formatDate, getGenreColor } from '../lib/utils'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { PlayButton, EmbyStatusIndicator } from './PlayButton'
import { MovieModal } from './MovieModal'
import { PersonalRatingStars } from './PersonalRatingStars'

interface MovieCardProps {
  movie: Movie
  viewMode: 'grid' | 'list'
  onRemove: (id: string) => Promise<void>
  onToggleWatched: (id: string, watched: boolean) => Promise<void>
  onUpdatePreference: (id: string, preference: 'thumbs_up' | 'thumbs_down' | null) => Promise<void>
  onUpdatePersonalRating: (id: string, rating: number | null) => Promise<void>
  streamingProviders: number[]
}

export function MovieCard({ 
  movie, 
  viewMode, 
  onRemove, 
  onToggleWatched, 
  onUpdatePreference,
  onUpdatePersonalRating,
  streamingProviders
}: MovieCardProps) {
  const [showActions, setShowActions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showMovieModal, setShowMovieModal] = useState(false)

  const handleRemove = async () => {
    setLoading(true)
    try {
      await onRemove(movie.id)
    } catch (error) {
      console.error('Failed to remove movie:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleWatched = async () => {
    setLoading(true)
    try {
      await onToggleWatched(movie.id, !movie.watched)
    } catch (error) {
      console.error('Failed to update watched status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleThumbsUp = async () => {
    setLoading(true)
    try {
      const newPreference = movie.user_preference === 'thumbs_up' ? null : 'thumbs_up'
      await onUpdatePreference(movie.id, newPreference)
    } catch (error) {
      console.error('Failed to update preference:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleThumbsDown = async () => {
    setLoading(true)
    try {
      const newPreference = movie.user_preference === 'thumbs_down' ? null : 'thumbs_down'
      await onUpdatePreference(movie.id, newPreference)
    } catch (error) {
      console.error('Failed to update preference:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMovieClick = (e: React.MouseEvent) => {
    // Don't open modal if clicking on action buttons
    if ((e.target as HTMLElement).closest('button')) {
      return
    }
    setShowMovieModal(true)
  }

  const handleCloseModal = () => {
    setShowMovieModal(false)
  }

  const handleUpdateEmbyStatus = async (id: string, embyItemId: string | null, available: boolean) => {
    // This would typically update the database, but for now we'll just update local state
    // You might want to add this functionality to your movieService
    console.log('Update Emby status:', { id, embyItemId, available })
  }

  const handlePersonalRatingChange = async (rating: number | null) => {
    setLoading(true)
    try {
      await onUpdatePersonalRating(movie.id, rating)
    } catch (error) {
      console.error('Failed to update personal rating:', error)
    } finally {
      setLoading(false)
    }
  }

  const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : 'TBA'

  if (viewMode === 'list') {
    return (
      <>
        <div 
          className="bg-gray-800 rounded-xl p-4 flex gap-4 hover:bg-gray-750 transition-colors cursor-pointer"
          onClick={handleMovieClick}
        >
        <div className="w-16 h-24 flex-shrink-0">
          <img
            src={tmdbAPI.getImageUrl(movie.poster_path)}
            alt={movie.title}
            className="w-full h-full object-cover rounded-lg"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = 'https://images.unsplash.com/photo-1489599511986-c2b8e5b1b5b5?w=400&h=600&fit=crop'
            }}
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-white text-lg truncate pr-2">
              {movie.title}
            </h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Emby Play Button */}
              {movie.emby_available && movie.emby_item_id && (
                <PlayButton 
                  embyItemId={movie.emby_item_id}
                  movieTitle={movie.title}
                  size="sm"
                />
              )}
              
              {movie.watched && (
                <div className="flex items-center gap-1 text-green-500">
                  <Eye className="h-4 w-4" />
                  <span className="text-sm">Watched</span>
                </div>
              )}
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-400 mb-2">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{releaseYear}</span>
            </div>
            {movie.rating && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-400 fill-current" />
                <span>{movie.rating.toFixed(1)}</span>
              </div>
            )}
            {movie.personal_rating && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-blue-400 fill-current" />
                <span>My Rating: {movie.personal_rating}/10</span>
              </div>
            )}
          </div>

          {/* Personal Rating */}
          <div className="mb-2">
            <PersonalRatingStars
              rating={movie.personal_rating}
              onRatingChange={handlePersonalRatingChange}
              disabled={loading}
              size="sm"
            />
          </div>

          {/* Emby Status Indicator */}
          <EmbyStatusIndicator 
            available={!!movie.emby_available}
            lastChecked={movie.last_emby_check}
            className="mb-2"
          />
          
          {movie.genres && movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {movie.genres.slice(0, 3).map((genre) => (
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
            </div>
          )}
          
          {movie.overview && (
            <p className="text-sm text-gray-400 line-clamp-2">
              {movie.overview}
            </p>
          )}
        </div>
        
        {showActions && (
          <div className="flex flex-col gap-2 flex-shrink-0">
            <button
              onClick={handleToggleWatched}
              disabled={loading}
              className={cn(
                "p-2 rounded-lg transition-colors flex items-center gap-2 text-sm",
                movie.watched
                  ? "bg-orange-600 hover:bg-orange-700 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              )}
            >
              {movie.watched ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {movie.watched ? 'Mark Unwatched' : 'Mark Watched'}
            </button>
            
            <button
              onClick={handleThumbsUp}
              disabled={loading}
              className={cn(
                "p-2 rounded-lg transition-colors flex items-center gap-2 text-sm",
                movie.user_preference === 'thumbs_up'
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-gray-600 hover:bg-gray-500 text-white"
              )}
            >
              <ThumbsUp className="h-4 w-4" />
              Like
            </button>
            
            <button
              onClick={handleThumbsDown}
              disabled={loading}
              className={cn(
                "p-2 rounded-lg transition-colors flex items-center gap-2 text-sm",
                movie.user_preference === 'thumbs_down'
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-gray-600 hover:bg-gray-500 text-white"
              )}
            >
              <ThumbsDown className="h-4 w-4" />
              Dislike
            </button>
            
            <button
              onClick={() => setShowDeleteDialog(true)}
              disabled={loading}
              className="p-2 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white rounded-lg transition-all duration-300 flex items-center gap-2 text-sm shadow-lg hover:shadow-xl"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </button>
          </div>
        )}
      </div>
        
        <MovieModal
          isOpen={showMovieModal}
          onClose={handleCloseModal}
          movie={movie}
          isInWatchlist={true}
          onRemoveFromWatchlist={onRemove}
          onToggleWatched={onToggleWatched}
          onUpdatePreference={onUpdatePreference}
          onUpdateEmbyStatus={handleUpdateEmbyStatus}
        />
        
        <DeleteConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleRemove}
          movieTitle={movie.title}
        />
      </>
    )
  }

  return (
    <>
      <div 
        className="group relative bg-black/40 backdrop-blur-sm border border-gray-700/30 rounded-xl overflow-hidden hover:bg-black/60 hover:border-purple-500/30 transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer"
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-purple-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Top left indicators */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {/* Watched indicator */}
            {movie.watched && (
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full p-1 shadow-lg">
                <Eye className="h-3 w-3 text-white" />
              </div>
            )}

            {/* Emby availability indicator */}
            {movie.emby_available && (
              <div className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full p-1 shadow-lg" title="Available on Emby">
                <Play className="h-3 w-3 text-white fill-current" />
              </div>
            )}
          </div>
          
          {/* Rating badge */}
          {movie.rating && (
            <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1 shadow-lg">
              <Star className="h-3 w-3 text-yellow-400 fill-current" />
              <span className="text-xs text-white font-medium">
                {movie.rating.toFixed(1)}
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="absolute bottom-3 left-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {/* Play button - prominent if available */}
            {movie.emby_available && movie.emby_item_id ? (
              <PlayButton 
                embyItemId={movie.emby_item_id}
                movieTitle={movie.title}
                className="flex-1"
                size="sm"
              />
            ) : (
              <button
                onClick={handleToggleWatched}
                disabled={loading}
                className={cn( 
                  "flex-1 p-2 rounded-lg transition-all duration-300 flex items-center justify-center gap-1 text-sm font-medium shadow-lg hover:shadow-xl",
                  movie.watched
                    ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white"
                    : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white"
                )}
              >
                {movie.watched ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {movie.watched ? 'Unwatch' : 'Watched'}
              </button>
            )}
            
            <button
              onClick={handleThumbsUp}
              disabled={loading}
              className={cn( 
                "p-2 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl",
                movie.user_preference === 'thumbs_up'
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white"
                  : "bg-black/40 hover:bg-black/60 text-white border border-gray-600/30"
              )}
            >
              <ThumbsUp className="h-3 w-3" />
            </button>
            
            <button
              onClick={handleThumbsDown}
              disabled={loading}
              className={cn( 
                "p-2 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl",
                movie.user_preference === 'thumbs_down'
                  ? "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-400 hover:to-pink-400 text-white"
                  : "bg-black/40 hover:bg-black/60 text-white border border-gray-600/30"
              )}
            >
              <ThumbsDown className="h-3 w-3" />
            </button>
            
            <button
              onClick={() => setShowDeleteDialog(true)}
              disabled={loading}
              className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-white text-sm line-clamp-2 leading-tight">
              {movie.title}
            </h3>
            
            {/* Emby Play Button in card footer */}
            {movie.emby_available && movie.emby_item_id && (
              <PlayButton 
                embyItemId={movie.emby_item_id}
                movieTitle={movie.title}
                size="sm"
                className="ml-2"
              />
            )}
          </div>
          
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
            <Calendar className="h-3 w-3" />
            <span>{releaseYear}</span>
            {movie.user_preference && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-400 fill-current" />
                  <span>My Rating: {movie.personal_rating}/10</span>
                </div>
              </>
            )}
          </div>

          {/* Personal Rating */}
          <div className="mb-3">
            <PersonalRatingStars
              rating={movie.personal_rating}
              onRatingChange={handlePersonalRatingChange}
              disabled={loading}
              size="sm"
            />
          </div>

          {/* Emby Status in footer */}
          <EmbyStatusIndicator 
            available={!!movie.emby_available}
            lastChecked={movie.last_emby_check}
            className="mb-3"
          />

          {movie.genres && movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {movie.genres.slice(0, 2).map((genre) => (
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
              {movie.genres.length > 2 && (
                <span className="px-2 py-1 rounded-full text-xs text-gray-400 bg-gray-700">
                  +{movie.genres.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      
      <MovieModal
        isOpen={showMovieModal}
        onClose={handleCloseModal}
        movie={movie}
        isInWatchlist={true}
        onRemoveFromWatchlist={onRemove}
        onToggleWatched={onToggleWatched}
        onUpdatePreference={onUpdatePreference}
        onUpdatePersonalRating={onUpdatePersonalRating}
        onUpdateEmbyStatus={handleUpdateEmbyStatus}
      />
      
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleRemove}
        movieTitle={movie.title}
      />
    </>
  )
}