import { useState } from 'react'
import { Search, Sparkles, Loader2 } from 'lucide-react'
import { tmdbAPI, TMDBMovie } from '../lib/tmdb'
import { openaiAPI } from '../lib/openai'
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

interface SearchBarProps {
  onAddMovie: (movie: TMDBMovie) => Promise<void>
  watchlistMovies: Movie[]
  onRemoveMovie: (id: string) => Promise<void>
}

export function SearchBar({ onAddMovie, watchlistMovies, onRemoveMovie }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TMDBMovie[]>([])
  const [aiResults, setAiResults] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiMode, setAiMode] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const [collectionMovie, setCollectionMovie] = useState<{ title: string; id: number } | null>(null)

  const handleShowCollection = (movieTitle: string, movieId: number) => {
    setCollectionMovie({ title: movieTitle, id: movieId })
    setShowCollectionModal(true)
  }

  const handleCloseCollectionModal = () => {
    setShowCollectionModal(false)
    setCollectionMovie(null)
  }

  const handleCloseCollectionModalAndClear = () => {
    setShowCollectionModal(false)
    setCollectionMovie(null)
    // Clear search results and go back to main screen
    clearResults()
  }

  const handleSearch = async () => {
    if (!query.trim()) return

    setLoading(true)
    setShowResults(true)
    setError(null)
    setResults([])
    setAiResults([])

    try {
      if (aiMode) {
        console.log('AI search mode with query:', query)
        // Get AI recommendations first
        const recommendations = await openaiAPI.getRecommendations(query)
        setAiResults(recommendations)
        
        // Then search for each recommended movie
        const allResults: TMDBMovie[] = []
        for (const title of recommendations) {
          if (!title.startsWith('Demo:') && !title.startsWith('Error:')) {
            const movieResults = await tmdbAPI.searchMovies(title)
            if (movieResults.length > 0) {
              allResults.push(movieResults[0])
            }
          }
        }
        setResults(allResults)
      } else {
        console.log('Regular search mode with query:', query)
        // Regular TMDB search
        const movieResults = await tmdbAPI.searchMovies(query)
        setResults(movieResults)
      }
    } catch (error) {
      setError('Search failed')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const toggleAiMode = () => {
    setAiMode(!aiMode)
    setResults([])
    setAiResults([])
    setShowResults(false)
  }

  const clearResults = () => {
    setResults([])
    setAiResults([])
    setShowResults(false)
    setQuery('')
  }

  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={aiMode ? "Ask AI: 'Movies like Inception but funnier'" : "Search for movies..."}
            className="w-full pl-12 pr-4 py-3 sm:py-3 bg-black/40 backdrop-blur-sm border border-gray-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500/50 text-white placeholder-gray-400 transition-all duration-300 shadow-lg hover:shadow-xl text-sm sm:text-base"
          />
        </div>
        
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="flex-1 sm:flex-none px-4 sm:px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Search className="h-5 w-5" />
            )}
            <span className="hidden sm:inline">Search</span>
          </button>
          
          <button
            onClick={toggleAiMode}
            className={`px-3 sm:px-4 py-3 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 ${
              aiMode 
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500' 
                : 'bg-black/40 backdrop-blur-sm border border-gray-600/50 hover:bg-black/60'
            }`}
          >
            <Sparkles className={`h-5 w-5 ${aiMode ? 'text-yellow-400' : 'text-gray-400'}`} />
            <span className="hidden sm:inline text-white">AI</span>
          </button>
        </div>
        
        {(aiMode && (!import.meta.env.VITE_OPENAI_API_KEY || 
          import.meta.env.VITE_OPENAI_API_KEY === 'demo-key' || 
          import.meta.env.VITE_OPENAI_API_KEY === 'your-openai-api-key')) && (
          <div className="absolute right-16 top-1/2 transform -translate-y-1/2 z-10">
            <span className="text-xs text-orange-400 bg-orange-900/20 px-2 py-1 rounded">
              Demo Mode
            </span>
          </div>
        )}
      </div>

      {aiMode && aiResults.length > 0 && (
        <div className="mb-4 p-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30 backdrop-blur-sm rounded-xl border border-purple-500/30 shadow-xl">
          <h3 className="text-sm font-semibold text-purple-300 mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Recommendations
          </h3>
          <div className="flex flex-wrap gap-2">
            {aiResults.map((title, index) => (
              <span key={index} className="px-3 py-1 bg-purple-600/20 text-purple-200 rounded-full text-sm">
                {title}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {showResults && (
        <div className="relative">
          {error && (
            <div className="mb-4 p-4 bg-red-900/30 backdrop-blur-sm border border-red-500/30 rounded-xl shadow-xl">
              <p className="text-red-300 text-sm">{error}</p>
              {error.includes('TMDB API key') && (
                <p className="text-red-200 text-xs mt-2">
                  Get your free API key from{' '}
                  <a 
                    href="https://www.themoviedb.org/settings/api" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-white"
                  >
                    TMDB Settings
                  </a>
                  {' '}and add it to your .env file as VITE_TMDB_API_KEY
                </p>
              )}
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-3 text-gray-400">
                {aiMode ? 'Getting AI recommendations...' : 'Searching...'}
              </span>
            </div>
          ) : results.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Search Results ({results.length})
                </h3>
                <button
                  onClick={clearResults}
                  className="text-gray-400 hover:text-white transition-colors text-sm sm:text-base"
                >
                  Clear
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {results.map((movie) => (
                  <MovieResult 
                    key={movie.id} 
                    movie={movie} 
                    onAdd={onAddMovie}
                    isAdded={watchlistMovies.some(m => m.tmdb_id === movie.id)}
                    watchlistMovies={watchlistMovies}
                    onRemoveMovie={onRemoveMovie}
                    onShowCollection={handleShowCollection}
                  />
                ))}
              </div>
            </>
          ) : query && (
            <div className="text-center py-12 text-gray-400">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm sm:text-base">No movies found for "{query}"</p>
              <p className="text-sm mt-2">Try a different search term</p>
            </div>
          )}
        </div>
      )}
      
      {collectionMovie && (
        <CollectionModal
          isOpen={showCollectionModal}
          onClose={handleCloseCollectionModal}
          movieTitle={collectionMovie.title}
          movieId={collectionMovie.id}
          onAddMovie={onAddMovie}
          watchlistMovies={watchlistMovies}
          onRemoveMovie={onRemoveMovie}
        />
      )}
    </div>
  )
}