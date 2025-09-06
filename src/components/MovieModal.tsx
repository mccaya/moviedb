import { useState, useEffect } from 'react'
import { X, Calendar, Star, Clock, Play, Plus, Check, Eye, EyeOff, ThumbsUp, ThumbsDown, Loader2, Crown } from 'lucide-react'
import { tmdbAPI, TMDBMovie } from '../lib/tmdb'
import { embyAPI } from '../lib/emby'
import { cn, formatDate, formatRating, getGenreColor } from '../lib/utils'
import { PersonalRatingStars } from './PersonalRatingStars'

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
  // Emby integration fields
  emby_item_id?: string | null
  emby_available?: boolean
  last_emby_check?: string | null
}

interface MovieDetails extends TMDBMovie {
  runtime?: number
  budget?: number
  revenue?: number
  production_companies?: { name: string; logo_path: string | null }[]
  spoken_languages?: { name: string }[]
  videos?: {
    results: {
      key: string
      name: string
      type: string
      site: string
    }[]
  }
  credits?: {
    cast: {
      name: string
      character: string
      profile_path: string | null
    }[]
    crew: {
      name: string
      job: string
    }[]
  }
}

interface MovieModalProps {
  isOpen: boolean
  onClose: () => void
  movie: TMDBMovie | Movie
  isInWatchlist?: boolean
  onAddToWatchlist?: (movie: TMDBMovie) => Promise<void>
  onRemoveFromWatchlist?: (id: string) => Promise<void>
  onToggleWatched?: (id: string, watched: boolean) => Promise<void>
  onUpdatePreference?: (id: string, preference: 'thumbs_up' | 'thumbs_down' | null) => Promise<void>
  onUpdatePersonalRating?: (id: string, rating: number | null) => Promise<void>
  onUpdateEmbyStatus?: (id: string, embyItemId: string | null, available: boolean) => Promise<void>
}

export function MovieModal({ 
  isOpen, 
  onClose, 
  movie, 
  isInWatchlist = false,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  onToggleWatched,
  onUpdatePreference,
  onUpdatePersonalRating,
  onUpdateEmbyStatus
}: MovieModalProps) {
  const [movieDetails, setMovieDetails] = useState<MovieDetails | null>(null)
  const [streamingProviders, setStreamingProviders] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'cast' | 'streaming' | 'details'>('overview')
  const [embyLoading, setEmbyLoading] = useState(false)
  const [embyAvailable, setEmbyAvailable] = useState(false)
  const [embyItemId, setEmbyItemId] = useState<string | null>(null)

  const tmdbId = 'tmdb_id' in movie ? movie.tmdb_id : movie.id
  const isWatchlistMovie = 'user_id' in movie

  // Check if movie has Emby data
  const hasEmbyData = isWatchlistMovie && 'emby_available' in movie
  const initialEmbyAvailable = hasEmbyData ? (movie as Movie).emby_available : false
  const initialEmbyItemId = hasEmbyData ? (movie as Movie).emby_item_id : null

  useEffect(() => {
    if (isOpen && tmdbId) {
      loadMovieDetails()
      
      // Set initial Emby state or check Emby if not checked recently
      if (hasEmbyData) {
        setEmbyAvailable(!!initialEmbyAvailable)
        setEmbyItemId(initialEmbyItemId || null)
        
        // Check if we need to refresh Emby status
        const lastCheck = (movie as Movie).last_emby_check
        if (!lastCheck || shouldRefreshEmbyCheck(lastCheck)) {
          checkEmbyAvailability()
        }
      } else {
        // For non-watchlist movies, don't check Emby
        setEmbyAvailable(false)
        setEmbyItemId(null)
      }
    }
  }, [isOpen, tmdbId, hasEmbyData])

  const shouldRefreshEmbyCheck = (lastCheckString: string): boolean => {
    const lastCheck = new Date(lastCheckString)
    const now = new Date()
    const hoursSinceCheck = (now.getTime() - lastCheck.getTime()) / (1000 * 60 * 60)
    return hoursSinceCheck > 24 // Refresh after 24 hours
  }

  const checkEmbyAvailability = async () => {
    if (!isWatchlistMovie || embyLoading) return
    
    setEmbyLoading(true)
    try {
      // Check Emby connection first
      const isConnected = await embyAPI.checkConnection()
      if (!isConnected) {
        console.warn('Emby server not accessible')
        return
      }

      // Search for movie on Emby
      const year = movie.release_date ? new Date(movie.release_date).getFullYear() : undefined
      const embyItem = await embyAPI.searchMovie(movie.title, year)
      
      const available = !!embyItem
      const itemId = embyItem?.Id || null
      
      setEmbyAvailable(available)
      setEmbyItemId(itemId)
      
      // Update database if we have the callback
      if (onUpdateEmbyStatus && isWatchlistMovie) {
        await onUpdateEmbyStatus((movie as Movie).id, itemId, available)
      }
      
    } catch (error) {
      console.error('Error checking Emby availability:', error)
    } finally {
      setEmbyLoading(false)
    }
  }

  const handlePremiumPlay = async () => {
    if (!embyItemId) return
    
    try {
      // Check connection
      const isConnected = await embyAPI.checkConnection()
      if (!isConnected) {
        alert('Cannot connect to Emby server. Please check your connection.')
        return
      }

      // Open Emby web player
      const webPlayerUrl = embyAPI.getWebPlayerUrl(embyItemId)
      window.open(webPlayerUrl, '_blank', 'noopener,noreferrer')
      
    } catch (error) {
      console.error('Error opening Emby player:', error)
      alert('Failed to open movie in Emby player.')
    }
  }

  const loadMovieDetails = async () => {
    setLoading(true)
    try {
      const [details, providers] = await Promise.all([
        tmdbAPI.getMovieDetails(tmdbId),
        tmdbAPI.getStreamingProviders(tmdbId)
      ])
      
      if (details) {
        setMovieDetails(details)
      }
      if (providers) {
        setStreamingProviders(providers)
      }
    } catch (error) {
      console.error('Error loading movie details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    console.log('Modal close button clicked')
    setMovieDetails(null)
    setStreamingProviders(null)
    setLoading(false)
    setActionLoading(false)
    setActiveTab('overview')
    setEmbyLoading(false)
    setEmbyAvailable(false)
    setEmbyItemId(null)
    onClose()
  }

  const handleAddToWatchlist = async () => {
    if (!onAddToWatchlist || isInWatchlist) return
    
    setActionLoading(true)
    try {
      await onAddToWatchlist(movie as TMDBMovie)
    } catch (error) {
      console.error('Failed to add to watchlist:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleRemoveFromWatchlist = async () => {
    if (!onRemoveFromWatchlist || !isWatchlistMovie) return
    
    setActionLoading(true)
    try {
      await onRemoveFromWatchlist((movie as Movie).id)
      onClose()
    } catch (error) {
      console.error('Failed to remove from watchlist:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleWatched = async () => {
    if (!onToggleWatched || !isWatchlistMovie) return
    
    setActionLoading(true)
    try {
      await onToggleWatched((movie as Movie).id, !(movie as Movie).watched)
    } catch (error) {
      console.error('Failed to toggle watched status:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdatePreference = async (preference: 'thumbs_up' | 'thumbs_down' | null) => {
    if (!onUpdatePreference || !isWatchlistMovie) return
    
    setActionLoading(true)
    try {
      const currentPreference = (movie as Movie).user_preference
      const newPreference = currentPreference === preference ? null : preference
      await onUpdatePreference((movie as Movie).id, newPreference)
    } catch (error) {
      console.error('Failed to update preference:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdatePersonalRating = async (rating: number | null) => {
    if (!onUpdatePersonalRating || !isWatchlistMovie) return
    
    setActionLoading(true)
    try {
      await onUpdatePersonalRating((movie as Movie).id, rating)
    } catch (error) {
      console.error('Failed to update personal rating:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const getTrailerUrl = () => {
    const trailer = movieDetails?.videos?.results?.find(
      video => video.type === 'Trailer' && video.site === 'YouTube'
    )
    return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null
  }

  const formatRuntime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getStreamingServices = () => {
    if (!streamingProviders?.US?.flatrate) return []
    
    return streamingProviders.US.flatrate.map((provider: any) => ({
      provider_id: provider.provider_id,
      provider_name: provider.provider_name,
      logo_url: tmdbAPI.getImageUrl(provider.logo_path)
    }))
  }

  if (!isOpen) return null

  const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : 'TBA'
  const genres = movieDetails?.genres?.map(genre => genre.name) || tmdbAPI.getGenreNames(movie.genre_ids || [])
  const director = movieDetails?.credits?.crew?.find(person => person.job === 'Director')
  const trailerUrl = getTrailerUrl()

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 backdrop-blur-xl border border-purple-500/20 w-full max-w-md sm:max-w-4xl max-h-[85vh] rounded-xl overflow-hidden flex flex-col shadow-2xl">
        {/* Header with backdrop */}
        <div className="relative flex-shrink-0">
          {movieDetails?.backdrop_path && (
            <div className="h-40 sm:h-48 md:h-64 bg-gradient-to-r from-gray-900 via-purple-900/30 to-gray-800 relative overflow-hidden">
              <img
                src={tmdbAPI.getImageUrl(movieDetails.backdrop_path)}
                alt={movie.title}
                className="w-full h-full object-cover opacity-40"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-800 via-purple-900/20 to-transparent" />
            </div>
          )}
          
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleClose()
            }}
            className="absolute top-4 right-4 p-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 z-10 font-bold"
            type="button"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
          
          {/* Movie info overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-6">
            <div className="flex gap-2 sm:gap-6">
              <div className="w-20 h-30 sm:w-32 sm:h-48 flex-shrink-0">
                <img
                  src={tmdbAPI.getImageUrl(movie.poster_path)}
                  alt={movie.title}
                  className="w-full h-full object-cover rounded-lg shadow-xl"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = 'https://images.unsplash.com/photo-1489599511986-c2b8e5b1b5b5?w=400&h=600&fit=crop'
                  }}
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <h1 className="text-sm sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-3 line-clamp-2">{movie.title}</h1>
                
                <div className="flex flex-wrap items-center gap-1 sm:gap-4 text-xs sm:text-sm text-gray-300 mb-1 sm:mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>{releaseYear}</span>
                  </div>
                  
                  {movieDetails?.runtime && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>{formatRuntime(movieDetails.runtime)}</span>
                    </div>
                  )}
                  
                  {movie.vote_average && movie.vote_average > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400 fill-current" />
                      <span>{formatRating(movie.vote_average)}</span>
                    </div>
                  )}
                  
                  {director && (
                    <div className="hidden sm:block">
                      <span className="text-gray-400">Directed by</span> {director.name}
                    </div>
                  )}

                  {/* Emby Status Indicator */}
                  {isWatchlistMovie && (
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${embyAvailable ? 'bg-purple-400' : 'bg-gray-500'}`} />
                      <span className="text-xs text-gray-400">
                        {embyLoading ? 'Checking Emby...' : embyAvailable ? 'Available on Emby' : 'Not on Emby'}
                      </span>
                    </div>
                  )}
                </div>
                
                {genres.length > 0 && (
                  <div className="flex flex-wrap gap-1 sm:gap-2 mb-2 sm:mb-4">
                    {genres.slice(0, 2).map((genre) => (
                      <span
                        key={genre}
                        className={cn(
                          "px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs sm:text-sm text-white font-medium",
                          getGenreColor(genre)
                        )}
                      >
                        {genre}
                      </span>
                    ))}
                    {genres.length > 2 && (
                      <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs sm:text-sm text-gray-400 bg-gray-700">
                        +{genres.length - 2}
                      </span>
                    )}
                  </div>
                )}
                
                {/* Personal Rating */}
                {isWatchlistMovie && onUpdatePersonalRating && (
                  <div className="mb-4 hidden sm:block">
                    <PersonalRatingStars
                      rating={(movie as Movie).personal_rating}
                      onRatingChange={handleUpdatePersonalRating}
                      disabled={actionLoading}
                      size="md"
                    />
                  </div>
                )}
                
                {/* Action buttons */}
                <div className="flex flex-wrap gap-1 sm:gap-3">
                  {/* Premium Button - Shows when available on Emby */}
                  {isWatchlistMovie && embyAvailable && embyItemId && (
                    <button
                      onClick={handlePremiumPlay}
                      disabled={embyLoading}
                      className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold text-xs sm:text-sm"
                    >
                      {embyLoading ? (
                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                      ) : (
                        <Crown className="h-3 w-3 sm:h-4 sm:w-4" />
                      )}
                      <span className="hidden sm:inline">Premium</span>
                    </button>
                  )}
                  
                  {trailerUrl && (
                    <a
                      href={trailerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 text-xs sm:text-sm"
                    >
                      <Play className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Trailer</span>
                    </a>
                  )}
                  
                  {!isInWatchlist ? (
                    <button
                      onClick={handleAddToWatchlist}
                      disabled={actionLoading}
                      className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 text-xs sm:text-sm"
                    >
                      {actionLoading ? (
                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                      ) : (
                        <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                      )}
                      <span className="hidden sm:inline">Add</span>
                    </button>
                  ) : (
                    <div className="flex gap-1 sm:gap-2">
                      <button
                        onClick={handleToggleWatched}
                        disabled={actionLoading}
                        className={cn(
                          "flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 text-xs sm:text-sm",
                          isWatchlistMovie && (movie as Movie).watched
                            ? "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white"
                            : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white"
                        )}
                      >
                        {actionLoading ? (
                          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                        ) : isWatchlistMovie && (movie as Movie).watched ? (
                          <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" />
                        ) : (
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                        )}
                        <span className="hidden sm:inline">
                          {isWatchlistMovie && (movie as Movie).watched ? 'Mark Unwatched' : 'Mark Watched'}
                        </span>
                      </button>
                      
                      <button
                        onClick={() => handleUpdatePreference('thumbs_up')}
                        disabled={actionLoading}
                        className={cn(
                          "p-1.5 sm:p-3 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105",
                          isWatchlistMovie && (movie as Movie).user_preference === 'thumbs_up'
                            ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white"
                            : "bg-black/40 backdrop-blur-sm border border-gray-600/30 hover:bg-black/60 text-white"
                        )}
                      >
                        <ThumbsUp className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleUpdatePreference('thumbs_down')}
                        disabled={actionLoading}
                        className={cn(
                          "p-1.5 sm:p-3 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105",
                          isWatchlistMovie && (movie as Movie).user_preference === 'thumbs_down'
                            ? "bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white"
                            : "bg-black/40 backdrop-blur-sm border border-gray-600/30 hover:bg-black/60 text-white"
                        )}
                      >
                        <ThumbsDown className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content tabs - Rest of the modal remains the same */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-6">
          <div className="flex gap-1 mb-2 sm:mb-6 bg-black/40 backdrop-blur-sm border border-gray-600/30 rounded-lg p-1">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'cast', label: 'Cast' },
              { key: 'streaming', label: 'Watch' },
              { key: 'details', label: 'Details' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={cn(
                  "flex-1 px-1 sm:px-3 py-1 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-300",
                  activeTab === key
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                    : "text-gray-300 hover:text-white hover:bg-black/40 backdrop-blur-sm"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-3 text-gray-400">Loading details...</span>
            </div>
          ) : (
            <div className="overflow-y-auto">
              {activeTab === 'overview' && (
                <div>
                  <h3 className="text-sm sm:text-lg font-semibold text-white mb-2 sm:mb-4">Synopsis</h3>
                  <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                    {movie.overview || movieDetails?.overview || 'No synopsis available.'}
                  </p>
                </div>
              )}

              {activeTab === 'cast' && (
                <div>
                  {movieDetails?.credits?.cast && movieDetails.credits.cast.length > 0 ? (
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Cast</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {movieDetails.credits.cast.slice(0, 12).map((actor, index) => (
                          <div key={index} className="flex items-center gap-2 sm:gap-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-700 rounded-full flex-shrink-0 overflow-hidden">
                              {actor.profile_path ? (
                                <img
                                  src={tmdbAPI.getImageUrl(actor.profile_path)}
                                  alt={actor.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <span className="text-sm">{actor.name.charAt(0)}</span>
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-white text-xs sm:text-sm font-medium truncate">{actor.name}</p>
                              <p className="text-gray-400 text-xs truncate">{actor.character}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm sm:text-base text-gray-400">Cast information not available.</p>
                  )}
                </div>
              )}

              {activeTab === 'streaming' && (
                <div>
                  {(() => {
                    const services = getStreamingServices()
                    return services.length > 0 ? (
                      <div>
                        <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Streaming Services</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          {services.map((service: any) => (
                            <div 
                              key={service.provider_id} 
                              className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-black/40 backdrop-blur-sm border border-gray-600/30 rounded-lg hover:bg-black/60 transition-all duration-300 hover:scale-105"
                            >
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-lg overflow-hidden flex-shrink-0">
                                <img
                                  src={service.logo_url}
                                  alt={service.provider_name}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.style.display = 'none'
                                  }}
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-white font-medium text-xs sm:text-sm">{service.provider_name}</p>
                                <p className="text-green-400 text-xs">Included with subscription</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Add Emby Premium notice if available */}
                        {isWatchlistMovie && embyAvailable && (
                          <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-gradient-to-r from-purple-900/30 to-indigo-900/30 backdrop-blur-sm border border-purple-500/30 rounded-lg shadow-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Crown className="h-4 w-4 text-purple-400" />
                              <span className="text-purple-300 font-medium text-sm">Premium Access</span>
                            </div>
                            <p className="text-purple-200 text-xs sm:text-sm">
                              This movie is available on your personal Emby server. Click the Premium button to watch instantly.
                            </p>
                          </div>
                        )}
                        
                        <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-gradient-to-r from-blue-900/30 to-cyan-900/30 backdrop-blur-sm border border-blue-500/30 rounded-lg shadow-lg">
                          <p className="text-blue-300 text-xs sm:text-sm">
                            <strong>Note:</strong> Availability may vary by region and can change over time. 
                            Check the streaming service directly to confirm current availability.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gradient-to-r from-gray-700 to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                          <span className="text-2xl">📺</span>
                        </div>
                        <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Not available on streaming</h3>
                        <p className="text-gray-400 text-xs sm:text-sm mb-4">
                          This movie may be available for rent or purchase on digital platforms like 
                          Amazon Prime Video, Apple TV, Google Play, or Vudu.
                        </p>
                        
                        {/* Premium option notice */}
                        {isWatchlistMovie && embyAvailable && (
                          <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-gradient-to-r from-purple-900/30 to-indigo-900/30 backdrop-blur-sm border border-purple-500/30 rounded-lg shadow-lg">
                            <div className="flex items-center justify-center gap-2 mb-2">
                              <Crown className="h-5 w-5 text-purple-400" />
                              <span className="text-purple-300 font-medium text-sm">Good news!</span>
                            </div>
                            <p className="text-purple-200 text-xs sm:text-sm">
                              This movie is available on your personal Emby server. Click the Premium button above to watch.
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )}

              {activeTab === 'details' && (
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Movie Details</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {movieDetails?.runtime && (
                      <div>
                        <span className="text-gray-400 text-xs sm:text-sm">Runtime:</span>
                        <p className="text-white text-sm sm:text-base">{formatRuntime(movieDetails.runtime)}</p>
                      </div>
                    )}
                    
                    {movieDetails?.budget && movieDetails.budget > 0 && (
                      <div>
                        <span className="text-gray-400 text-xs sm:text-sm">Budget:</span>
                        <p className="text-white text-sm sm:text-base">{formatCurrency(movieDetails.budget)}</p>
                      </div>
                    )}
                    
                    {movieDetails?.revenue && movieDetails.revenue > 0 && (
                      <div>
                        <span className="text-gray-400 text-xs sm:text-sm">Revenue:</span>
                        <p className="text-white text-sm sm:text-base">{formatCurrency(movieDetails.revenue)}</p>
                      </div>
                    )}
                    
                    {movieDetails?.spoken_languages && movieDetails.spoken_languages.length > 0 && (
                      <div>
                        <span className="text-gray-400 text-xs sm:text-sm">Languages:</span>
                        <p className="text-white text-sm sm:text-base">
                          {movieDetails.spoken_languages.map(lang => lang.name).join(', ')}
                        </p>
                      </div>
                    )}
                    
                    {movieDetails?.production_companies && movieDetails.production_companies.length > 0 && (
                      <div className="sm:col-span-2">
                        <span className="text-gray-400 text-xs sm:text-sm">Production Companies:</span>
                        <p className="text-white text-sm sm:text-base">
                          {movieDetails.production_companies.map(company => company.name).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
  )
}