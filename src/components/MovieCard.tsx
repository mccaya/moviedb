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

interface MovieCardProps {
  movie: Movie
  viewMode: 'grid' | 'list'
  onRemove: (id: string) => Promise<void>
  onToggleWatched: (id: string, watched: boolean) => Promise<void>
  onUpdatePreference: (id: string, preference: 'thumbs_up' | 'thumbs_down' | null) => Promise<void>
}

export function MovieCard({ 
  movie, 
  viewMode, 
  onRemove, 
  onToggleWatched, 
  onUpdatePreference 
}: MovieCardProps) {
  const [showActions, setShowActions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

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

  const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : 'TBA'

  if (viewMode === 'list') {
    return (
      <div className="bg-gray-800 rounded-xl p-4 flex gap-4 hover:bg-gray-750 transition-colors">
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
              className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="group relative bg-gray-800 rounded-xl overflow-hidden hover:bg-gray-750 transition-all duration-300 hover:scale-105 hover:shadow-xl">
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
          
          {/* Top left indicators */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {/* Watched indicator */}
            {movie.watched && (
              <div className="bg-green-600 rounded-full p-1">
                <Eye className="h-3 w-3 text-white" />
              </div>
            )}

            {/* Emby availability indicator */}
            {movie.emby_available && (
              <div className="bg-purple-600 rounded-full p-1" title="Available on Emby">
                <Play className="h-3 w-3 text-white fill-current" />
              </div>
            )}
          </div>
          
          {/* Rating badge */}
          {movie.rating && (
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
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
                  "flex-1 p-2 rounded-lg transition-colors flex items-center justify-center gap-1 text-sm font-medium",
                  movie.watched
                    ? "bg-orange-600 hover:bg-orange-700 text-white"
                    : "bg-green-600 hover:bg-green-700 text-white"
                )}
              >
                {movie.watched ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {movie.watched ? 'Unwatch' : 'Watched'}
              </button>
            )}