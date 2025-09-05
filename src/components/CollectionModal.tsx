import { useState, useEffect } from 'react'
import { X, Plus, Calendar, Star, Loader2, Sparkles } from 'lucide-react'
import { tmdbAPI, TMDBMovie } from '../lib/tmdb'
import { openaiAPI } from '../lib/openai'
import { cn, formatRating, getGenreColor } from '../lib/utils'

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

interface CollectionModalProps {
  isOpen: boolean
  onClose: () => void
  movieTitle: string
  movieId: number
  onAddMovie: (movie: TMDBMovie) => Promise<void>
  watchlistMovies: Movie[]
  onRemoveMovie: (movieId: string) => Promise<void>
}

interface CollectionData {
  id: number
  name: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  parts: TMDBMovie[]
}

export function CollectionModal({ 
  isOpen, 
  onClose, 
  movieTitle, 
  movieId, 
  onAddMovie,
  watchlistMovies,
  onRemoveMovie
}: CollectionModalProps) {
  const [collection, setCollection] = useState<CollectionData | null>(null)
  const [aiInsight, setAiInsight] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [addingMovies, setAddingMovies] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (isOpen && movieId) {
      loadCollection()
    }
  }, [isOpen, movieId])

  const loadCollection = async () => {
    setLoading(true)
    try {
      const collectionData = await tmdbAPI.getMovieCollection(movieId)
      if (collectionData) {
        setCollection(collectionData)
        // Get AI insight about the collection
        const insight = await openaiAPI.analyzeMovieCollection(movieTitle, collectionData.name)
        setAiInsight(insight)
      } else {
        onClose() // Close if no collection found
      }
    } catch (error) {
      console.error('Error loading collection:', error)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleAddMovie = async (movie: TMDBMovie) => {
    if (addingMovies.has(movie.id)) return
    
    const isInWatchlist = watchlistMovies.some(w => w.tmdb_id === movie.id)
    
    setAddingMovies(prev => new Set(prev).add(movie.id))
    try {
      if (isInWatchlist) {
        const watchlistMovie = watchlistMovies.find(w => w.tmdb_id === movie.id)
        if (watchlistMovie) {
          await onRemoveMovie(watchlistMovie.id)
        }
      } else {
        await onAddMovie(movie)
      }
    } catch (error) {
      console.error('Failed to add movie:', error)
    } finally {
      setAddingMovies(prev => {
        const newSet = new Set(prev)
        newSet.delete(movie.id)
        return newSet
      })
    }
  }

  const handleClose = () => {
    setCollection(null)
    setAiInsight('')
    setAddingMovies(new Set())
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-400">Discovering movie collection...</p>
          </div>
        ) : collection ? (
          <>
            {/* Header */}
            <div className="relative">
              {collection.backdrop_path && (
                <div className="h-48 bg-gradient-to-r from-gray-900 to-gray-800 relative overflow-hidden">
                  <img
                    src={tmdbAPI.getImageUrl(collection.backdrop_path)}
                    alt={collection.name}
                    className="w-full h-full object-cover opacity-30"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-800 to-transparent" />
                </div>
              )}
              
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              
              <div className="absolute bottom-4 left-6 right-6">
                <h2 className="text-2xl font-bold text-white mb-2">{collection.name}</h2>
                <p className="text-gray-300 text-sm">{collection.parts.length} movies in collection</p>
              </div>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {/* AI Insight */}
              {aiInsight && (
                <div className="mb-6 p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl border border-purple-500/20">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-purple-300 mb-1">AI Insight</h3>
                      <p className="text-gray-300 text-sm">{aiInsight}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Collection Overview */}
              {collection.overview && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-2">About the Collection</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">{collection.overview}</p>
                </div>
              )}

              {/* Movies Grid */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Movies in Collection</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {collection.parts
                    .sort((a, b) => new Date(a.release_date || '').getTime() - new Date(b.release_date || '').getTime())
                    .map((movie) => {
                      const isAdding = addingMovies.has(movie.id)
                      const isInWatchlist = watchlistMovies.some(w => w.tmdb_id === movie.id)
                      const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : 'TBA'

                      return (
                        <div key={movie.id} className="group relative bg-gray-700 rounded-lg overflow-hidden hover:bg-gray-650 transition-all duration-300">
                          <div className="aspect-[2/3] relative overflow-hidden">
                            <img
                              src={tmdbAPI.getImageUrl(movie.poster_path)}
                              alt={movie.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = 'https://images.unsplash.com/photo-1489599511986-c2b8e5b1b5b5?w=400&h=600&fit=crop'
                              }}
                            />
                            
                            {/* Add button */}
                            <button
                              onClick={() => handleAddMovie(movie)}
                              disabled={isAdding}
                              className={cn(
                                "absolute top-2 right-2 p-2 rounded-full transition-all duration-300",
                                "opacity-0 group-hover:opacity-100",
                                isInWatchlist
                                  ? "bg-green-600 hover:bg-red-600 text-white backdrop-blur-sm"
                                  : "bg-black/60 hover:bg-blue-600 text-white backdrop-blur-sm"
                              )}
                              title={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
                            >
                              {isAdding ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : isInWatchlist ? (
                                <X className="h-4 w-4" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                            </button>

                            {/* Rating badge */}
                            {movie.vote_average > 0 && (
                              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                                <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                <span className="text-xs text-white font-medium">
                                  {formatRating(movie.vote_average)}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="p-3">
                            <h4 className="font-semibold text-white text-sm mb-1 line-clamp-2 leading-tight">
                              {movie.title}
                            </h4>
                            
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <Calendar className="h-3 w-3" />
                              <span>{releaseYear}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-700 p-4 flex justify-end">
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}