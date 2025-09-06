import React, { useState, useEffect } from 'react'
import { Film, User, LogOut, Upload, Download, Grid, List, Server, WifiSync as Sync, Loader2 } from 'lucide-react'
import { useAuth } from './hooks/useAuth'
import { useEmbySync } from './hooks/useEmbySync'
import { movieService, Movie } from './lib/supabase'
import { tmdbAPI, TMDBMovie } from './lib/tmdb'
import { embyAPI } from './lib/emby'
import { SearchBar } from './components/SearchBar'
import { WatchlistGrid } from './components/WatchlistGrid'
import { FilterBar } from './components/FilterBar'
import { AuthModal } from './components/AuthModal'
import { ImportModal } from './components/ImportModal'
import { EmbyInfoModal } from './components/EmbyInfoModal'
import { ExportModal } from './components/ExportModal'
import { VipInfoModal } from './components/VipInfoModal'

function App() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { isChecking, checkAllMovies, checkMovie, syncProgress } = useEmbySync()
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'watched' | 'unwatched'>('all')
  const [sortBy, setSortBy] = useState<'added' | 'title' | 'preference' | 'release'>('added')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showEmbyInfoModal, setShowEmbyInfoModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showVipInfoModal, setShowVipInfoModal] = useState(false)
  const [embyConnected, setEmbyConnected] = useState(false)
  const [selectedStreamingServices, setSelectedStreamingServices] = useState<number[]>([])
  const [movieStreamingData, setMovieStreamingData] = useState<Record<number, number[]>>({})
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin')

  useEffect(() => {
    if (user) {
      loadWatchlist()
      checkEmbyConnection()
      // Check for auto-import settings and run if needed
      checkAutoImports()
    } else {
      setLoading(false)
    }
  }, [user])

  // Auto-import check for Trakt lists
  const checkAutoImports = async () => {
    try {
      const settings = localStorage.getItem('traktListSettings')
      if (settings) {
        const listSettings = JSON.parse(settings)
        const autoImportLists = Object.entries(listSettings).filter(
          ([_, config]: [string, any]) => config.autoImport
        )
        
        if (autoImportLists.length > 0) {
          console.log(`Found ${autoImportLists.length} lists with auto-import enabled`)
          // You could implement background auto-import here
          // For now, we'll just log it
        }
      }
    } catch (error) {
      console.error('Error checking auto-imports:', error)
    }
  }

  // Fetch streaming data for movies
  useEffect(() => {
    const fetchStreamingData = async () => {
      if (movies.length === 0) return
      
      const streamingData: Record<number, number[]> = {}
      
      for (const movie of movies) {
        try {
          const providers = await tmdbAPI.getStreamingProviders(movie.tmdb_id)
          // Extract US flatrate providers and map to provider IDs
          const usProviders = providers?.US?.flatrate || []
          streamingData[movie.tmdb_id] = usProviders.map((provider: any) => provider.provider_id)
        } catch (error) {
          console.error(`Failed to fetch streaming data for ${movie.title}:`, error)
          streamingData[movie.tmdb_id] = []
        }
      }
      
      setMovieStreamingData(streamingData)
    }
    
    fetchStreamingData()
  }, [movies])

  // Auto-sync with Emby when movies are loaded
  useEffect(() => {
    if (movies.length > 0 && embyConnected && !isChecking) {
      // Check for movies that need Emby sync (haven't been checked recently)
      const needsCheck = movies.filter(movie => {
        if (!movie.last_emby_check) return true
        
        const lastCheck = new Date(movie.last_emby_check)
        const now = new Date()
        const hoursSinceCheck = (now.getTime() - lastCheck.getTime()) / (1000 * 60 * 60)
        
        // Re-check after 24 hours
        return hoursSinceCheck > 24
      })

      if (needsCheck.length > 0) {
        console.log(`Auto-syncing ${needsCheck.length} movies with Emby`)
        checkAllMovies(needsCheck).then(() => {
          // Reload the watchlist to get updated Emby statuses
          loadWatchlist()
        })
      }
    }
  }, [movies.length, embyConnected, isChecking, checkAllMovies])

  const checkEmbyConnection = async () => {
    try {
      console.log('🔍 Checking Emby connection...')
      const connected = await embyAPI.checkConnection()
      console.log('📡 Emby connection result:', connected ? '✅ Connected' : '❌ Not connected')
      setEmbyConnected(connected)
      if (!connected) {
        console.log('ℹ️ Emby server not accessible - app will work without Emby features')
      } else {
        console.log('✅ Emby server connected successfully')
      }
    } catch (error) {
      console.log('ℹ️ Emby connection check failed - continuing without Emby features')
      setEmbyConnected(false)
    }
  }

  const loadWatchlist = async () => {
    try {
      const { data, error } = await movieService.getWatchlist()
      if (error) throw error
      setMovies(data || [])
    } catch (error) {
      console.error('Error loading watchlist:', error)
    } finally {
      setLoading(false)
    }
  }

  const addToWatchlist = async (tmdbMovie: TMDBMovie) => {
    if (!user) {
      setAuthModalMode('signin')
      setShowAuthModal(true)
      return
    }

    // Check if movie is already in watchlist
    const existingMovie = movies.find(movie => movie.tmdb_id === tmdbMovie.id)
    if (existingMovie) {
      throw new Error('Movie is already in your watchlist')
    }

    try {
      const movieData = {
        tmdb_id: tmdbMovie.id,
        title: tmdbMovie.title,
        poster_path: tmdbMovie.poster_path,
        overview: tmdbMovie.overview,
        release_date: tmdbMovie.release_date,
        rating: tmdbMovie.vote_average,
        genres: tmdbAPI.getGenreNames(tmdbMovie.genre_ids || []),
        watched: false
      }

      const { data, error } = await movieService.addToWatchlist(movieData)
      if (error) {
        if (error.message?.includes('duplicate key')) {
          throw new Error('Movie is already in your watchlist')
        }
        throw error
      }

      if (data) {
        setMovies(prev => [data, ...prev])
        
        // Check Emby availability for the new movie
        if (embyConnected) {
          setTimeout(() => checkMovie(data), 500)
        }
      }
    } catch (error) {
      console.error('Error adding movie:', error)
      throw error
    }
  }

  const removeFromWatchlist = async (id: string) => {
    try {
      const { error } = await movieService.removeFromWatchlist(id)
      if (error) throw error
      setMovies(prev => prev.filter(movie => movie.id !== id))
    } catch (error) {
      console.error('Error removing movie:', error)
      throw error
    }
  }

  const toggleWatchedStatus = async (id: string, watched: boolean) => {
    try {
      const { data, error } = await movieService.updateWatchedStatus(id, watched)
      if (error) throw error
      if (data) {
        setMovies(prev => prev.map(movie => 
          movie.id === id ? { ...movie, watched } : movie
        ))
      }
    } catch (error) {
      console.error('Error updating watched status:', error)
      throw error
    }
  }

  const updateUserPreference = async (id: string, preference: 'thumbs_up' | 'thumbs_down' | null) => {
    try {
      const { data, error } = await movieService.updateUserPreference(id, preference)
      if (error) throw error
      if (data) {
        setMovies(prev => prev.map(movie => 
          movie.id === id ? { ...movie, user_preference: preference } : movie
        ))
      }
    } catch (error) {
      console.error('Error updating preference:', error)
      throw error
    }
  }

  const updatePersonalRating = async (id: string, rating: number | null) => {
    try {
      const { data, error } = await movieService.updatePersonalRating(id, rating)
      if (error) throw error
      if (data) {
        setMovies(prev => prev.map(movie => 
          movie.id === id ? { ...movie, personal_rating: rating } : movie
        ))
      }
    } catch (error) {
      console.error('Error updating personal rating:', error)
      throw error
    }
  }

  const handleImport = async (importedMovies: TMDBMovie[]) => {
    let successCount = 0
    let failedCount = 0
    
    for (const movie of importedMovies) {
      try {
        await addToWatchlist(movie)
        successCount++
      } catch (error) {
        // Continue with other movies even if one fails
        console.error('Failed to import movie:', movie.title, error)
        failedCount++
      }
    }
    
    if (successCount > 0) {
      console.log(`Successfully imported ${successCount} movies`)
    }
    
    if (failedCount > 0) {
      console.warn(`Failed to import ${failedCount} movies`)
    }
    
    // Reload watchlist to reflect changes
    await loadWatchlist()
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      setMovies([])
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleManualEmbySync = async () => {
    // Show info modal instead of attempting connection in WebContainer
    setShowEmbyInfoModal(true)
  }

  // Filter and sort movies
  const filteredMovies = movies
    .filter(movie => {
      if (filter === 'watched') return movie.watched
      if (filter === 'unwatched') return !movie.watched
      return true
    })
    .filter(movie => {
      if (selectedStreamingServices.length === 0) return true
      const movieProviders = movieStreamingData[movie.tmdb_id] || []
      return selectedStreamingServices.some(serviceId => movieProviders.includes(serviceId))
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title)
        case 'preference':
          const aValue = a.user_preference === 'thumbs_up' ? 2 : a.user_preference === 'thumbs_down' ? 0 : 1
          const bValue = b.user_preference === 'thumbs_up' ? 2 : b.user_preference === 'thumbs_down' ? 0 : 1
          return bValue - aValue
        case 'release':
          return new Date(b.release_date || 0).getTime() - new Date(a.release_date || 0).getTime()
        default:
          return new Date(b.added_at).getTime() - new Date(a.added_at).getTime()
      }
    })

  // Calculate available streaming movies
  const availableStreamingMovies = selectedStreamingServices.length === 0 
    ? 0 
    : movies.filter(movie => {
        const movieProviders = movieStreamingData[movie.tmdb_id] || []
        return selectedStreamingServices.some(serviceId => movieProviders.includes(serviceId))
      }).length

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Film className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 border-b border-purple-500/20 backdrop-blur-sm sticky top-0 z-40 px-safe">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18 gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="relative">
                <Film className="h-7 w-7 sm:h-8 sm:w-8 text-transparent bg-gradient-to-r from-red-500 via-purple-500 to-pink-500 bg-clip-text" />
                <div className="absolute inset-0 h-7 w-7 sm:h-8 sm:w-8 bg-gradient-to-r from-red-500 via-purple-500 to-pink-500 opacity-20 blur-sm rounded-full"></div>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent truncate">
                FilmFolio
              </h1>
              
              {/* Emby Status Indicator */}
              {user && (
                <div className="hidden md:flex items-center gap-2 ml-4">
                  <div className={`w-2 h-2 rounded-full ${embyConnected ? 'bg-emerald-400 shadow-emerald-400/50 shadow-lg' : 'bg-red-400 shadow-red-400/50 shadow-lg'}`} />
                  <span className="text-xs text-gray-300">
                    Emby {embyConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 flex-shrink-0">
              {user && (
                <>
                  {/* VIP Button */}
                  <button
                    onClick={() => setShowVipInfoModal(true)}
                    className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-400 hover:via-orange-400 hover:to-red-400 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                    title="VIP Features - Radarr Integration"
                  >
                    <span className="text-lg">👑</span>
                    <span className="hidden md:inline text-white font-semibold">VIP</span>
                  </button>
                  
                  {/* Emby Sync Button */}
                  <button
                    onClick={handleManualEmbySync}
                    disabled={isChecking}
                    className="hidden md:flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-gray-600 disabled:to-gray-700 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                    title={`Sync with Emby${!embyConnected ? ' (Server Disconnected)' : ''}`}
                  >
                    {isChecking ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Server className="h-4 w-4" />
                    )}
                    <span className="hidden lg:inline">
                      {isChecking ? `Syncing ${syncProgress.current}/${syncProgress.total}` : 'Sync Emby'}
                    </span>
                  </button>
                  
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="hidden sm:inline">Import</span>
                  </button>
                  
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="hidden lg:flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden lg:inline">Export</span>
                  </button>
                  
                  <div className="hidden sm:flex items-center gap-1 bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded transition-all duration-300 ${
                        viewMode === 'grid' 
                          ? 'bg-gradient-to-r from-red-500 to-pink-500 shadow-lg' 
                          : 'hover:bg-white/10'
                      }`}
                    >
                      <Grid className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded transition-all duration-300 ${
                        viewMode === 'list' 
                          ? 'bg-gradient-to-r from-red-500 to-pink-500 shadow-lg' 
                          : 'hover:bg-white/10'
                      }`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
              
              {user ? (
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="hidden lg:flex items-center gap-2 text-sm text-gray-300">
                    <User className="h-4 w-4" />
                    <span className="truncate max-w-32">{user.email}</span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={() => {
                      setAuthModalMode('signup') 
                      setShowAuthModal(true)
                    }}
                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 font-semibold text-sm sm:text-base"
                  >
                    <User className="h-4 w-4" />
                    <span>Sign Up</span>
                  </button>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 font-semibold text-sm sm:text-base"
                  >
                    <User className="h-4 w-4" />
                    <span>Sign In</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {user ? (
          <>
            <SearchBar 
              onAddMovie={addToWatchlist} 
              watchlistMovies={movies}
              onRemoveMovie={removeFromWatchlist}
            />
            
            {/* Stats Overview - Enhanced with Emby stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6 mb-8">
              <button 
                onClick={() => setFilter('all')}
                className={`bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 rounded-xl p-4 sm:p-6 transition-all duration-300 text-left w-full border border-gray-700/50 hover:border-purple-500/50 hover:shadow-xl hover:scale-105 ${
                  filter === 'all' ? 'ring-2 ring-purple-500 shadow-purple-500/25 shadow-xl' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-300">Total Movies</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white">{movies.length}</p>
                  </div>
                  <div className="relative">
                    <Film className="h-8 w-8 text-purple-500" />
                    <div className="absolute inset-0 h-8 w-8 bg-purple-500 opacity-20 blur-sm rounded-full"></div>
                  </div>
                </div>
              </button>
              
              <button 
                onClick={() => setFilter('watched')}
                className={`bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 rounded-xl p-4 sm:p-6 transition-all duration-300 text-left w-full border border-gray-700/50 hover:border-emerald-500/50 hover:shadow-xl hover:scale-105 ${
                  filter === 'watched' ? 'ring-2 ring-emerald-500 shadow-emerald-500/25 shadow-xl' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-300">Watched</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white">
                      {movies.filter(m => m.watched).length}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-sm font-bold">✓</span>
                  </div>
                </div>
              </button>
              
              <button 
                onClick={() => setFilter('unwatched')}
                className={`bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 rounded-xl p-4 sm:p-6 transition-all duration-300 text-left w-full border border-gray-700/50 hover:border-orange-500/50 hover:shadow-xl hover:scale-105 ${
                  filter === 'unwatched' ? 'ring-2 ring-orange-500 shadow-orange-500/25 shadow-xl' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-300">To Watch</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white">
                      {movies.filter(m => !m.watched).length}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-sm font-bold">•</span>
                  </div>
                </div>
              </button>
              
              {/* Emby Available */}
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 sm:p-6 border border-gray-700/50 hover:border-purple-500/50 hover:shadow-xl hover:scale-105 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-300">On Emby</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white">
                      {movies.filter(m => m.emby_available).length}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                    <Server className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 sm:p-6 border border-gray-700/50 hover:border-blue-500/50 hover:shadow-xl hover:scale-105 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-300">Watched %</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white">
                      {movies.length > 0 ? Math.round((movies.filter(m => m.watched).length / movies.length) * 100) : 0}%
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-sm font-bold">%</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 sm:p-6 border border-gray-700/50 hover:border-yellow-500/50 hover:shadow-xl hover:scale-105 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-300">Avg Rating</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white">
                      {(() => {
                        const moviesWithRating = movies.filter(m => m.rating && m.rating > 0)
                        if (moviesWithRating.length === 0) return 'N/A'
                        const avg = moviesWithRating.reduce((sum, m) => sum + (m.rating || 0), 0) / moviesWithRating.length
                        return avg.toFixed(1)
                      })()}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-sm font-bold">★</span>
                  </div>
                </div>
              </div>
            </div>
            
            {movies.length > 0 && (
              <FilterBar
                filter={filter}
                sortBy={sortBy}
                onFilterChange={setFilter}
                onSortChange={setSortBy}
                totalMovies={filteredMovies.length}
                selectedStreamingServices={selectedStreamingServices}
                onStreamingServicesChange={setSelectedStreamingServices}
                availableStreamingMovies={availableStreamingMovies}
              />
            )}
            
            <WatchlistGrid
              movies={filteredMovies}
              viewMode={viewMode}
              loading={loading}
              onRemove={removeFromWatchlist}
              onToggleWatched={toggleWatchedStatus}
              onUpdatePreference={updateUserPreference}
              onUpdatePersonalRating={updatePersonalRating}
              movieStreamingData={movieStreamingData}
            />
          </>
        ) : (
          <div className="relative min-h-[80vh] flex items-center justify-center overflow-hidden px-4">
            {/* Video Background */}
            <div className="absolute inset-0 overflow-hidden">
              <video
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover opacity-30"
                poster="https://images.unsplash.com/photo-1489599511986-c2b8e5b1b5b5?w=1920&h=1080&fit=crop"
              >
                {/* High-quality cinematic video sources */}
                <source 
                  src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" 
                  type="video/mp4" 
                />
                <source 
                  src="https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4" 
                  type="video/mp4" 
                />
                {/* Fallback for browsers that don't support video */}
                Your browser does not support the video tag.
              </video>
              
              {/* Video Overlay for Better Text Readability */}
              <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-purple-900/40 to-black/60"></div>
              
              {/* Cinematic Vignette Effect */}
              <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/80"></div>
              
              {/* Subtle Floating Particles for Extra Cinematic Feel */}
              <div className="absolute inset-0">
                <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full opacity-40 animate-ping"></div>
                <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-purple-400 rounded-full opacity-30 animate-pulse"></div>
                <div className="absolute top-1/2 left-3/4 w-1 h-1 bg-pink-400 rounded-full opacity-20 animate-bounce"></div>
                <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-white rounded-full opacity-30 animate-ping"></div>
              </div>
            </div>
            
            {/* Main Content */}
            <div className="relative z-10 text-center py-12 sm:py-16 lg:py-20">
              <div className="relative mb-8">
                <Film className="h-20 w-20 sm:h-24 sm:w-24 lg:h-28 lg:w-28 text-transparent bg-gradient-to-r from-red-500 via-purple-500 to-pink-500 bg-clip-text mx-auto drop-shadow-2xl" />
                <div className="absolute inset-0 h-20 w-20 sm:h-24 sm:w-24 lg:h-28 lg:w-28 bg-gradient-to-r from-red-500 via-purple-500 to-pink-500 opacity-40 blur-3xl rounded-full mx-auto animate-pulse"></div>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black bg-gradient-to-r from-white via-red-300 via-purple-300 via-pink-300 to-white bg-clip-text text-transparent mb-8 sm:mb-10 drop-shadow-2xl text-shadow-ultra animate-glow-pulse tracking-wider leading-tight">
                Welcome to FilmFolio
              </h2>
              <p className="text-white mb-10 sm:mb-12 max-w-4xl mx-auto text-lg sm:text-xl md:text-2xl lg:text-3xl leading-relaxed drop-shadow-2xl text-shadow-ultra font-light bg-gradient-to-r from-gray-100 via-white to-gray-100 bg-clip-text text-transparent animate-fade-in-up tracking-wide">
                Your personal movie collection manager with AI recommendations and media server integration!
              </p>
              <button
                onClick={() => {
                  setAuthModalMode('signin')
                  setShowAuthModal(true)
                }}
                className="px-8 sm:px-10 lg:px-14 py-4 sm:py-5 lg:py-6 bg-gradient-to-r from-red-600 via-purple-600 to-pink-600 hover:from-red-500 hover:via-purple-500 hover:to-pink-500 text-white rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-purple-500/50 hover:scale-110 font-bold text-lg sm:text-xl lg:text-2xl transform hover:-translate-y-2 backdrop-blur-sm border border-white/10"
              >
                Get Started
              </button>
            </div>
          </div>
        )}
      </main>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        initialMode={authModalMode}
      />
      
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
        watchlistMovies={movies}
        onRemoveMovie={removeFromWatchlist}
      />
      
      <EmbyInfoModal
        isOpen={showEmbyInfoModal}
        onClose={() => setShowEmbyInfoModal(false)}
      />
      
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        movies={movies}
      />
      
      <VipInfoModal
        isOpen={showVipInfoModal}
        onClose={() => setShowVipInfoModal(false)}
      />
    </div>
  )
}

export default App