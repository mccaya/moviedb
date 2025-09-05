import { useState } from 'react'
import { Search, Sparkles, Loader2 } from 'lucide-react'
import { tmdbAPI, TMDBMovie } from '../lib/tmdb'
import { openaiAPI } from '../lib/openai'
import { MovieResult } from './MovieResult'

interface SearchBarProps {
  onAddMovie: (movie: TMDBMovie) => Promise<void>
}

export function SearchBar({ onAddMovie }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TMDBMovie[]>([])
  const [aiResults, setAiResults] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiMode, setAiMode] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return

    setLoading(true)
    setShowResults(true)
    setError(null)
    setResults([])
    try {
      console.log('Regular search mode with query:', query)
      // Regular TMDB search
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

  const handleAiSearch = async () => {
    // AI search implementation
  }

  return (
    <div className="mb-8">
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={aiMode ? "Ask AI: 'Movies like Inception but funnier'" : "Search for movies..."}
            className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400 transition-all"
          />
        </div>
        
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl transition-all flex items-center gap-2"
        >
          {loading && !aiMode ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Search className="h-5 w-5" />
          )}
          <span className="hidden sm:inline">Search</span>
        </button>
        
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl transition-all flex items-center gap-2"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Search className="h-5 w-5" />
          )}
          <span className="hidden sm:inline">Search</span>
        </button>
        
        <button
          onClick={handleAiSearch}
          disabled={loading || !query.trim()}
          className={`px-4 py-3 rounded-xl transition-all flex items-center gap-2 ${
            loading && aiMode
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 opacity-75'
              : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white'
          }`}
          title="Get AI movie recommendations"
        >
          {loading && aiMode ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Sparkles className="h-5 w-5" />
          )}
          <span className="hidden sm:inline">Ask AI</span>
        </button>
      </div>
      
      {aiResults.length > 0 && (
        <div className="mb-4 p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl">
          <h3 className="text-purple-200 font-medium mb-2">AI Recommendations:
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
            <div className="mb-4 p-4 bg-red-900/50 border border-red-500/50 rounded-xl">
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
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {results.map((movie) => (
                  <MovieResult 
                    key={movie.id} 
                    movie={movie} 
                    onAdd={onAddMovie} 
                  />
                ))}
              </div>
            </>
          ) : query && (
            <div className="text-center py-12 text-gray-400">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No movies found for "{query}"</p>
              <p className="text-sm mt-2">Try a different search term</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}