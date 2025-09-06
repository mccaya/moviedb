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

  const handleAddMovieFromCollection = async (movie: TMDBMovie) => {
    await onImport([movie])
  }
  }
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-full">
                <List className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Import from Trakt Lists</h3>
                <p className="text-sm text-gray-400">Browse and import movies from curated Trakt.tv lists</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-400 animate-pulse">Click here to set auto sync</span>
                <span className="text-lg font-bold text-gray-400 animate-pulse">→</span>
              </div>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="List Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
              {hasUnsavedChanges && (
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {saving ? 'Saving...' : 'Save'}
                </button>
              )}
              <button
                onClick={handleClose}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - List Selection */}
          <div className="w-80 bg-gray-750 border-r border-gray-700 overflow-y-auto">
            <div className="p-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-4">Available Lists</h4>
              
              <div className="space-y-2">
                {predefinedLists.map((list) => {
                  const settings = listSettings[list.slug] || {}
                  const isSelected = selectedList === list.slug
                  
                  return (
                    <div key={list.slug} className="relative">
                      <button
                        onClick={() => handleListSelect(list.slug)}
                        disabled={loading && selectedList === list.slug}
                        className={`w-full text-left p-3 rounded-lg transition-all ${
                          isSelected
                            ? 'bg-blue-600/20 border border-blue-500/30'
                            : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="text-white font-medium text-sm">{list.name}</h5>
                          {settings.autoImport && (
                            <div className="flex items-center gap-1 text-xs text-green-400">
                              <div className="w-2 h-2 bg-green-400 rounded-full" />
                              Auto
                            </div>
                          )}
                        </div>
                        
                        <p className="text-gray-400 text-xs mb-2 line-clamp-2">
                          {list.description}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>@{list.username}</span>
                          <span>Updated: {formatLastUpdated(settings.lastUpdated)}</span>
                        </div>
                        
                        {settings.autoImport && (
                          <div className="text-xs text-green-400 mt-1">
                            {formatLastAutoSync(settings.lastAutoSync)}
                          </div>
                        )}
                        
                        {loading && selectedList === list.slug && (
                          <div className="absolute inset-0 bg-gray-700/50 rounded-lg flex items-center justify-center">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                          </div>
                        )}
                      </button>
                      
                      {/* Settings Panel */}
                      {showSettings && (
                        <div className="mt-2 p-3 bg-gray-800 rounded-lg border border-gray-600">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={settings.autoImport || false}
                              onChange={(e) => handleAutoImportToggle(list.slug, e.target.checked)}
                              className="rounded border-gray-500 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-gray-300">Auto-import new movies</span>
                          </label>
                          <p className="text-xs text-gray-500 mt-1">
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
          <div className="flex-1 overflow-y-auto">
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
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Loading Movies</h3>
                  <p className="text-gray-400">Fetching latest movies from Trakt...</p>
                </div>
              </div>
            ) : movies.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <List className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">No Movies Found</h3>
                  <p className="text-gray-500">This list appears to be empty or unavailable</p>
                  <button
                    onClick={handleRefreshList}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 mx-auto"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6">
                {/* Controls */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <h4 className="text-lg font-semibold text-white">
                      {movies.length} Movies Found
                    </h4>
                    <button
                      onClick={handleRefreshList}
                      disabled={loading}
                      className="flex items-center gap-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSelectAll}
                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {selectedMovies.size === movies.length ? 'Deselect All' : 'Select All'}
                    </button>
                    
                    {selectedMovies.size > 0 && (
                      <button
                        onClick={handleImportSelected}
                        disabled={importingMovies.size > 0}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        {importingMovies.size > 0 ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        Import Selected ({selectedMovies.size})
                      </button>
                    )}
                  </div>
                </div>

                {/* Movie Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
                            className="w-4 h-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500 bg-black/60 backdrop-blur-sm"
                          />
                        </div>
                        
                        {/* Movie Card */}
                        <div className={`${isSelected ? 'ring-2 ring-blue-500' : ''} ${isImporting ? 'opacity-50' : ''} rounded-lg overflow-hidden`}>
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