import React, { useState, useEffect } from 'react'
import { Film, User, LogOut, Upload, Grid, List, Server } from 'lucide-react'
import { useAuth } from './hooks/useAuth'
import { movieService, Movie } from './lib/supabase'
import { tmdbAPI, TMDBMovie } from './lib/tmdb'
import { SearchBar } from './components/SearchBar'
import { WatchlistGrid } from './components/WatchlistGrid'
import { FilterBar } from './components/FilterBar'
import { AuthModal } from './components/AuthModal'
import { ImportModal } from './components/ImportModal'

function App() {
  const { user, loading: authLoading, signOut } = useAuth()
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'watched' | 'unwatched'>('all')
  const [sortBy, setSortBy] = useState<'added' | 'title' | 'preference' | 'release'>('added')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  useEffect(() => {
    if (user) {
      loadWatchlist()
    } else {
      setLoading(false)
    }
  }, [user])

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

  const handleImport = async (importedMovies: TMDBMovie[]) => {
    for (const movie of importedMovies) {
      try {
        await addToWatchlist(movie)
      } catch (error) {
        // Continue with other movies even if one fails
        console.error('Failed to import movie:', movie.title, error)
      }
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      setMovies([])
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Filter and sort movies
  const filteredMovies = movies
    .filter(movie => {
      if (filter === 'watched') return movie.watched
      if (filter === 'unwatched') return !movie.watched
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title)
        case 'preference':
          // Sort by preference: thumbs_up first, then no preference, then thumbs_down
          const aValue = a.user_preference === 'thumbs_up' ? 2 : a.user_preference === 'thumbs_down' ? 0 : 1
          const bValue = b.user_preference === 'thumbs_up' ? 2 : b.user_preference === 'thumbs_down' ? 0 : 1
          return bValue - aValue
        case 'release':
          return new Date(b.release_date || 0).getTime() - new Date(a.release_date || 0).getTime()
        default:
          return new Date(b.added_at).getTime() - new Date(a.added_at).getTime()
      }
    })

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
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Film className="h-8 w-8 text-blue-500" />
              <h1 className="text-xl font-bold">Movie Watchlist</h1>
            </div>
            
            <div className="flex items-center gap-4">
              {user && (
                <>
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="hidden sm:inline">Import</span>
                  </button>
                  
                  <div className="flex items-center gap-1 bg-gray-700 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-600' : 'hover:bg-gray-600'} transition-colors`}
                    >
                      <Grid className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-600' : 'hover:bg-gray-600'} transition-colors`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
              
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">{user.email}</span>
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
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <User className="h-4 w-4" />
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SearchBar 
          onAddMovie={addToWatchlist} 
          watchlistMovies={movies}
          onRemoveMovie={removeFromWatchlist}
        />
        
        {/* Stats Overview - 5 tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
          <button 
            onClick={() => setFilter('all')}
            className={`bg-gray-800 hover:bg-gray-700 rounded-xl p-6 transition-colors text-left w-full ${
              filter === 'all' ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total Movies</p>
                <p className="text-2xl font-bold text-white">{movies.length}</p>
              </div>
              <Film className="h-8 w-8 text-blue-500" />
            </div>
          </button>
          
          <button 
            onClick={() => setFilter('watched')}
            className={`bg-gray-800 hover:bg-gray-700 rounded-xl p-6 transition-colors text-left w-full ${
              filter === 'watched' ? 'ring-2 ring-green-500' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Watched</p>
                <p className="text-2xl font-bold text-white">
                  {movies.filter(m => m.watched).length}
                </p>
              </div>
              <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">✓</span>
              </div>
            </div>
          </button>
          
          <button 
            onClick={() => setFilter('unwatched')}
            className={`bg-gray-800 hover:bg-gray-700 rounded-xl p-6 transition-colors text-left w-full ${
              filter === 'unwatched' ? 'ring-2 ring-orange-500' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">To Watch</p>
                <p className="text-2xl font-bold text-white">
                  {movies.filter(m => !m.watched).length}
                </p>
              </div>
              <div className="h-8 w-8 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">•</span>
              </div>
            </div>
          </button>
          
          <div className="bg-gray-750 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Watched %</p>
                <p className="text-2xl font-bold text-white">
                  {movies.length > 0 ? Math.round((movies.filter(m => m.watched).length / movies.length) * 100) : 0}%
                </p>
              </div>
              <div className="h-8 w-8 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">%</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-750 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Avg Rating</p>
                <p className="text-2xl font-bold text-white">
                  {(() => {
                    const moviesWithRating = movies.filter(m => m.rating && m.rating > 0)
                    if (moviesWithRating.length === 0) return 'N/A'
                    const avg = moviesWithRating.reduce((sum, m) => sum + (m.rating || 0), 0) / moviesWithRating.length
                    return avg.toFixed(1)
                  })()}
                </p>
              </div>
              <div className="h-8 w-8 bg-yellow-500 rounded-full flex items-center justify-center">
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
          />
        )}
        
        <WatchlistGrid
          movies={filteredMovies}
          viewMode={viewMode}
          loading={loading}
          onRemove={removeFromWatchlist}
          onToggleWatched={toggleWatchedStatus}
          onUpdatePreference={updateUserPreference}
        />
        
        {!user && movies.length === 0 && (
          <div className="text-center py-16">
            <Film className="h-16 w-16 text-gray-600 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">Start Building Your Watchlist</h3>
            <p className="text-gray-500 mb-6">
              Search for movies above to get started. Sign in to save your watchlist permanently!
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Sign In to Save Movies
            </button>
          </div>
        )}
      </main>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
      
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
      />
    </div>
  )
}

export default App