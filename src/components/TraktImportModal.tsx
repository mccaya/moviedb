// components/TraktImportModal.tsx
import { useState, useEffect } from 'react'
import { X, List, Loader2, RefreshCw, Settings, Check, ChevronDown } from 'lucide-react'
import { traktAPI, TraktListItem } from '../lib/trakt'
import { tmdbAPI, TMDBMovie } from '../lib/tmdb'
import { MovieResult } from './MovieResult'
import { CollectionModal } from './CollectionModal'

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

interface TraktImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (movies: TMDBMovie[]) => Promise<void>
  watchlistMovies: Movie[]
  onRemoveMovie: (id: string) => Promise<void>
}

interface ListSettings {
  [key: string]: {
    autoImport: boolean
    lastUpdated?: string
    lastAutoSync?: string
  }
}

export function TraktImportModal({ 
  isOpen, 
  onClose, 
  onImport, 
  watchlistMovies, 
  onRemoveMovie 
}: TraktImportModalProps) {
  const [selectedList, setSelectedList] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [movies, setMovies] = useState<TMDBMovie[]>([])
  const [traktMovies, setTraktMovies] = useState<TraktListItem[]>([])
  const [selectedMovies, setSelectedMovies] = useState<Set<number>>(new Set())
  const [showSettings, setShowSettings] = useState(false)
  const [listSettings, setListSettings] = useState<ListSettings>({})
  const [importingMovies, setImportingMovies] = useState<Set<number>>(new Set())
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const [collectionMovie, setCollectionMovie] = useState<{ title: string; id: number } | null>(null)
  const [showMovieGrid, setShowMovieGrid] = useState(false)

  const predefinedLists = traktAPI.getPredefinedLists()

  // Load list settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('traktListSettings')
    if (savedSettings) {
      try {
        setListSettings(JSON.parse(savedSettings))
      } catch (error) {
        console.error('Failed to parse list settings:', error)
      }
    }
  }, [])

  // Set up auto-sync interval when component mounts
  useEffect(() => {
    if (!isOpen) return

    const checkAutoSync = async () => {
      const now = new Date()
      
      for (const [listSlug, settings] of Object.entries(listSettings)) {
        if (!settings.autoImport) continue
        
        const lastSync = settings.lastAutoSync ? new Date(settings.lastAutoSync) : null
        const hoursSinceSync = lastSync ? (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60) : 25
        
        // Auto-sync every 24 hours
        if (hoursSinceSync >= 24) {
          console.log(`Auto-syncing ${listSlug} (${hoursSinceSync.toFixed(1)} hours since last sync)`)
          await performAutoSync(listSlug)
        }
      }
    }

    // Check immediately and then every hour
    checkAutoSync()
    const interval = setInterval(checkAutoSync, 60 * 60 * 1000) // Check every hour

    return () => clearInterval(interval)
  }, [isOpen, listSettings])

  const performAutoSync = async (listSlug: string) => {
    try {
      const listConfig = predefinedLists.find(list => list.slug === listSlug)
      if (!listConfig) return

      // Fetch latest movies from the list
      const traktMovieItems = await traktAPI.getListMovies(listConfig.username, listSlug)
      
      // Convert to TMDB format
      const tmdbMovies: TMDBMovie[] = []
      
      for (const item of traktMovieItems) {
        try {
          const traktMovie = traktAPI.formatMovieForTMDB(item.movie)
          
          let movie: TMDBMovie | null = null
          
          if (traktMovie.tmdbId) {
            try {
              movie = await tmdbAPI.getMovieDetails(traktMovie.tmdbId)
            } catch (error) {
              console.warn(`Failed to fetch movie by TMDB ID ${traktMovie.tmdbId}`)
            }
          }
          
          if (!movie) {
            const searchQuery = traktMovie.year 
              ? `${traktMovie.title} ${traktMovie.year}`
              : traktMovie.title
            
            const searchResults = await tmdbAPI.searchMovies(searchQuery)
            movie = searchResults.find(result => {
              const resultYear = result.release_date ? new Date(result.release_date).getFullYear() : null
              return resultYear === traktMovie.year || 
                     Math.abs((resultYear || 0) - traktMovie.year) <= 1
            }) || searchResults[0]
          }
          
          if (movie) {
            // Check if movie is already in watchlist
            const isAlreadyAdded = watchlistMovies.some(w => w.tmdb_id === movie!.id)
            if (!isAlreadyAdded) {
              tmdbMovies.push(movie)
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 100))
          
        } catch (error) {
          console.error(`Error processing movie ${item.movie.title}:`, error)
        }
      }

      // Auto-import new movies
      if (tmdbMovies.length > 0) {
        console.log(`Auto-importing ${tmdbMovies.length} new movies from ${listSlug}`)
        await onImport(tmdbMovies)
      }

      // Update last sync time
      const updatedSettings = {
        ...listSettings,
        [listSlug]: {
          ...listSettings[listSlug],
          lastAutoSync: new Date().toISOString()
        }
      }
      
      setListSettings(updatedSettings)
      localStorage.setItem('traktListSettings', JSON.stringify(updatedSettings))
      
    } catch (error) {
      console.error(`Auto-sync failed for ${listSlug}:`, error)
    }
  }
  const handleListSelect = async (listSlug: string) => {
    setSelectedList(listSlug)
    setLoading(true)
    setShowMovieGrid(true) // Show movie grid on mobile
    setMovies([])
    setTraktMovies([])
    setSelectedMovies(new Set())

    try {
      const listConfig = predefinedLists.find(list => list.slug === listSlug)
      if (!listConfig) {
        throw new Error('List configuration not found')
      }

      // Fetch movies from Trakt list
      const traktMovieItems = await traktAPI.getListMovies(listConfig.username, listSlug)
      setTraktMovies(traktMovieItems)

      // Convert Trakt movies to TMDB format
      const tmdbMovies: TMDBMovie[] = []
      
      for (const item of traktMovieItems) {
        try {
          const traktMovie = traktAPI.formatMovieForTMDB(item.movie)
          
          // First try to find by TMDB ID if available
          let movie: TMDBMovie | null = null
          
          if (traktMovie.tmdbId) {
            try {
              movie = await tmdbAPI.getMovieDetails(traktMovie.tmdbId)
            } catch (error) {
              console.warn(`Failed to fetch movie by TMDB ID ${traktMovie.tmdbId}`)
            }
          }
          
          // If not found by ID, search by title and year
          if (!movie) {
            const searchQuery = traktMovie.year 
              ? `${traktMovie.title} ${traktMovie.year}`
              : traktMovie.title
            
            const searchResults = await tmdbAPI.searchMovies(searchQuery)
            
            // Find best match by title and year
            movie = searchResults.find(result => {
              const resultYear = result.release_date ? new Date(result.release_date).getFullYear() : null
              return resultYear === traktMovie.year || 
                     Math.abs((resultYear || 0) - traktMovie.year) <= 1
            }) || searchResults[0]
          }
          
          if (movie) {
            tmdbMovies.push(movie)
          } else {
            console.warn(`No TMDB match found for: ${traktMovie.title} (${traktMovie.year})`)
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100))
          
        } catch (error) {
          console.error(`Error processing movie ${item.movie.title}:`, error)
        }
      }

      setMovies(tmdbMovies)

      // Update last updated timestamp
      setListSettings(prev => ({
        ...prev,
        [listSlug]: {
          ...prev[listSlug],
          lastUpdated: new Date().toISOString()
        }
      }))

    } catch (error) {
      console.error('Error loading Trakt list:', error)
      // Show error message to user
    } finally {
      setLoading(false)
    }
  }

  const handleMovieSelect = (movieId: number, selected: boolean) => {
    setSelectedMovies(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(movieId)
      } else {
        newSet.delete(movieId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedMovies.size === movies.length) {
      setSelectedMovies(new Set())
    } else {
      setSelectedMovies(new Set(movies.map(movie => movie.id)))
    }
  }

  const handleImportSelected = async () => {
    const moviesToImport = movies.filter(movie => selectedMovies.has(movie.id))
    
    if (moviesToImport.length === 0) {
      return
    }

    setImportingMovies(new Set(moviesToImport.map(m => m.id)))

    try {
      await onImport(moviesToImport)
      setSelectedMovies(new Set())
      // Don't close modal so user can continue browsing
    } catch (error) {
      console.error('Error importing movies:', error)
    } finally {
      setImportingMovies(new Set())
    }
  }

  const handleAutoImportToggle = (listSlug: string, enabled: boolean) => {
    setListSettings(prev => ({
      ...prev,
      [listSlug]: {
        ...prev[listSlug],
        autoImport: enabled
      }
    }))
    setHasUnsavedChanges(true)
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      // Save to localStorage
      localStorage.setItem('traktListSettings', JSON.stringify(listSettings))
      setHasUnsavedChanges(false)
      
      // Show success feedback
      setTimeout(() => setSaving(false), 500)
    } catch (error) {
      console.error('Failed to save settings:', error)
      setSaving(false)
    }
  }

  const handleBackToLists = () => {
    setShowMovieGrid(false)
    setSelectedList('')
  }

  const handleRefreshList = () => {
    if (selectedList) {
      handleListSelect(selectedList)
    }
  }

  const handleClose = () => {
    setSelectedList('')
    setMovies([])
    setTraktMovies([])
    setSelectedMovies(new Set())
    setShowSettings(false)
    setLoading(false)
    setHasUnsavedChanges(false)
    setShowMovieGrid(false)
    setSaving(false)
    onClose()
  }

  const formatLastUpdated = (timestamp?: string) => {
    if (!timestamp) return 'Never'
    const date = new Date(timestamp)
    const now = new Date()
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    return `${Math.floor(diffHours / 24)}d ago`
  }

  const formatLastAutoSync = (timestamp?: string) => {
    if (!timestamp) return 'Never synced'
    const date = new Date(timestamp)
    const now = new Date()
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'Synced recently'
    if (diffHours < 24) return `Synced ${diffHours}h ago`
    return `Synced ${Math.floor(diffHours / 24)}d ago`
  }

  const handleAddMovieFromCollection = async (movie: TMDBMovie) => {
    await onImport([movie])
  }

  const handleIndividualMovieAdd = async (movie: TMDBMovie) => {
    setImportingMovies(prev => new Set([...prev, movie.id]))
    
    try {
      await onImport([movie])
      
      // Check if movie is part of a collection
      try {
        const collection = await tmdbAPI.getMovieCollection(movie.id)
        if (collection) {
          setCollectionMovie({ title: movie.title, id: movie.id })
          setShowCollectionModal(true)
        }
      } catch (error) {
        // Collection check failed, but movie was added successfully
        console.log('No collection found for movie:', movie.title)
      }
    } catch (error) {
      console.error('Failed to add movie:', error)
    } finally {
      setImportingMovies(prev => {
        const newSet = new Set(prev)
        newSet.delete(movie.id)
        return newSet
      })
    }
  }

  const handleShowCollection = (movie: { title: string; id: number }) => {
    setCollectionMovie(movie)
    setShowCollectionModal(true)
  }

  const handleCloseCollectionModal = () => {
    setShowCollectionModal(false)
    setCollectionMovie(null)
  }
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 backdrop-blur-xl border border-purple-500/20 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl mx-4">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-purple-500/20 bg-gradient-to-r from-purple-900/20 to-blue-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full shadow-lg">
                <List className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold bg-gradient-to-r from-white via-purple-200 to-indigo-200 bg-clip-text text-transparent">Import from Trakt Lists</h3>
                <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">Browse and import movies from curated Trakt.tv lists</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden lg:flex items-center gap-2">
                <span className="text-sm font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse">Click here to set auto sync</span>
                <span className="text-sm font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse">→</span>
              </div>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-400 hover:text-white transition-all duration-300 hover:bg-purple-500/20 rounded-lg"
                title="List Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
              {hasUnsavedChanges && (
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 font-semibold text-sm"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save'}</span>
                  <span className="sm:hidden">{saving ? '...' : '✓'}</span>
                </button>
              )}
              <button
                onClick={handleClose}
                className="p-2 text-gray-400 hover:text-white transition-all duration-300 hover:bg-red-500/20 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - List Selection */}
          <div className={`${showMovieGrid ? 'hidden sm:block' : 'block'} w-full sm:w-80 bg-gradient-to-b from-gray-800/50 to-gray-900/50 backdrop-blur-sm border-r border-purple-500/20 flex flex-col`}>
            <div className="p-3 sm:p-4">
              <h4 className="text-xs sm:text-sm font-semibold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent mb-4">Available Lists</h4>
            </div>
              
            <div className="overflow-y-auto px-3 sm:px-4 pb-6" style={{ height: 'calc(100vh - 200px)' }}>
              <div className="space-y-2">
                {predefinedLists.map((list) => {
                  const settings = listSettings[list.slug] || {}
                  const isSelected = selectedList === list.slug
                  
                  return (
                    <div key={list.slug} className="relative">
                      <button
                        onClick={() => handleListSelect(list.slug)}
                        disabled={loading && selectedList === list.slug}
                        className={`w-full text-left p-2 sm:p-3 rounded-lg transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 shadow-lg'
                            : 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 hover:from-gray-700/50 hover:to-gray-800/50 border border-gray-700/30 hover:border-purple-500/30'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="text-white font-semibold text-xs sm:text-sm pr-2">{list.name}</h5>
                          {settings.autoImport && (
                            <div className="flex items-center gap-1 text-xs text-emerald-400 flex-shrink-0">
                              <div className="w-2 h-2 bg-emerald-400 rounded-full shadow-emerald-400/50 shadow-lg" />
                              <span className="hidden sm:inline">Auto</span>
                            </div>
                          )}
                        </div>
                        
                        <p className="text-gray-400 text-xs mb-2 line-clamp-2 hidden sm:block">
                          {list.description}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="hidden sm:inline">@{list.username}</span>
                          <span className="text-xs">Updated: {formatLastUpdated(settings.lastUpdated)}</span>
                        </div>
                        
                        {settings.autoImport && (
                          <div className="text-xs text-emerald-400 mt-1 hidden sm:block">
                            {formatLastAutoSync(settings.lastAutoSync)}
                          </div>
                        )}
                        
                        {loading && selectedList === list.slug && (
                          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-lg flex items-center justify-center">
                            <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                          </div>
                        )}
                      </button>
                      
                      {/* Settings Panel */}
                      {showSettings && (
                        <div className="mt-2 p-2 sm:p-3 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-lg border border-purple-500/20">
                          <label className="flex items-center gap-2 text-xs sm:text-sm">
                            <input
                              type="checkbox"
                              checked={settings.autoImport || false}
                              onChange={(e) => handleAutoImportToggle(list.slug, e.target.checked)}
                              className="rounded border-gray-500 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-purple-200">Auto-import new movies</span>
                          </label>
                          <p className="text-xs text-gray-500 mt-1 hidden sm:block">
                            Automatically check for and import new movies every 24 hours
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Main Content - Movie Grid */}
          <div className={`${showMovieGrid ? 'flex' : 'hidden sm:flex'} flex-1 flex-col overflow-hidden`}>
            {!selectedList ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <List className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">Select a List</h3>
                  <p className="text-gray-500">Choose a Trakt list from the sidebar to view movies</p>
                </div>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent mb-2">Loading Movies</h3>
                  <p className="text-gray-400">Fetching latest movies from Trakt...</p>
                </div>
              </div>
            ) : movies.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <List className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-300 mb-2">No Movies Found</h3>
                  <p className="text-gray-500">This list appears to be empty or unavailable</p>
                  <button
                    onClick={handleRefreshList}
                    className="mt-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2 mx-auto font-semibold"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {/* Controls */}
                {/* Mobile Back Button */}
                <div className="flex sm:hidden items-center mb-4">
                  <button
                    onClick={handleBackToLists}
                    className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-gray-700/50 to-gray-800/50 hover:from-gray-600/50 hover:to-gray-700/50 backdrop-blur-sm border border-gray-600/30 hover:border-purple-500/30 text-white rounded-lg transition-all duration-300 text-sm"
                  >
                    ← Back to Lists
                  </button>
                </div>
                
                <div className="flex items-center justify-between mb-6 px-4 sm:px-6">
                  <div className="flex items-center gap-4">
                    <h4 className="text-base sm:text-lg font-semibold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                      {movies.length} Movies Found
                    </h4>
                    <button
                      onClick={handleRefreshList}
                      disabled={loading}
                      className="flex items-center gap-2 px-2 sm:px-3 py-1 bg-gradient-to-r from-gray-700/50 to-gray-800/50 hover:from-gray-600/50 hover:to-gray-700/50 backdrop-blur-sm border border-gray-600/30 hover:border-purple-500/30 text-white rounded-lg transition-all duration-300 text-xs sm:text-sm"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">Refresh</span>
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      onClick={handleSelectAll}
                      className="text-xs sm:text-sm text-purple-400 hover:text-purple-300 transition-colors font-medium"
                    >
                      <span className="hidden sm:inline">{selectedMovies.size === movies.length ? 'Deselect All' : 'Select All'}</span>
                      <span className="sm:hidden">{selectedMovies.size === movies.length ? 'None' : 'All'}</span>
                    </button>
                    
                    {selectedMovies.size > 0 && (
                      <button
                        onClick={handleImportSelected}
                        disabled={importingMovies.size > 0}
                        className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 font-semibold text-xs sm:text-sm"
                      >
                        {importingMovies.size > 0 ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline">Import Selected ({selectedMovies.size})</span>
                        <span className="sm:hidden">Import ({selectedMovies.size})</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Movie Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 p-4 sm:p-6">
                  {movies.map((movie) => {
                    const isSelected = selectedMovies.has(movie.id)
                    const isAdded = watchlistMovies.some(w => w.tmdb_id === movie.id)
                    const isImporting = importingMovies.has(movie.id)
                    
                    return (
                      <div key={movie.id} className="relative">
                        {/* Selection Checkbox */}
                        <div className="absolute top-2 left-2 z-10">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleMovieSelect(movie.id, e.target.checked)}
                            className="w-4 h-4 rounded border-gray-400 text-purple-600 focus:ring-purple-500 bg-black/60 backdrop-blur-sm"
                          />
                        </div>
                        
                        {/* Movie Card */}
                        <div className={`${isSelected ? 'ring-2 ring-purple-500 shadow-purple-500/25 shadow-xl' : ''} ${isImporting ? 'opacity-50' : ''} rounded-lg overflow-hidden`}>
                          <MovieResult
                            movie={movie}
                            onAdd={handleIndividualMovieAdd}
                            isAdded={isAdded}
                            watchlistMovies={watchlistMovies}
                            onRemoveMovie={onRemoveMovie}
                            onShowCollection={handleShowCollection}
                          />
                        </div>
                        
                        {isImporting && (
                          <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-white" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Collection Modal */}
      {collectionMovie && (
        <CollectionModal
          isOpen={showCollectionModal}
          onClose={handleCloseCollectionModal}
          movieTitle={collectionMovie.title}
          movieId={collectionMovie.id}
          onAddMovie={handleAddMovieFromCollection}
          watchlistMovies={watchlistMovies}
          onRemoveMovie={onRemoveMovie}
        />
      )}
    </div>
  )
}