import { useEffect, useState } from 'react'
import { Film, Eye, Calendar, X } from 'lucide-react'

interface SharePreviewProps {
  onClose: () => void
}

export function SharePreview({ onClose }: SharePreviewProps) {
  const [sharedData, setSharedData] = useState<{
    movies: string[]
    watched: number
    total: number
  } | null>(null)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('shared') === 'true') {
      const movies = urlParams.get('movies')?.split(',') || []
      const watched = parseInt(urlParams.get('watched') || '0')
      const total = parseInt(urlParams.get('total') || '0')
      
      setSharedData({ movies, watched, total })
    }
  }, [])

  if (!sharedData) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Shared Watchlist</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="text-center mb-6">
          <Film className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            Someone shared their movie taste with you!
          </h3>
          <p className="text-gray-400">
            Check out what they've been watching
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
            <div className="flex items-center gap-2">
              <Film className="h-4 w-4 text-blue-400" />
              <span className="text-white">Total Movies</span>
            </div>
            <span className="text-blue-400 font-semibold">{sharedData.total}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-green-400" />
              <span className="text-white">Movies Watched</span>
            </div>
            <span className="text-green-400 font-semibold">{sharedData.watched}</span>
          </div>

          {sharedData.movies.length > 0 && (
            <div className="p-3 bg-gray-700 rounded-lg">
              <h4 className="text-white font-medium mb-2">Sample Movies:</h4>
              <div className="space-y-1">
                {sharedData.movies.slice(0, 5).map((movie, index) => (
                  <div key={index} className="text-sm text-gray-300">
                    • {movie}
                  </div>
                ))}
                {sharedData.movies.length > 5 && (
                  <div className="text-sm text-gray-400">
                    ... and {sharedData.movies.length - 5} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-400 mb-4">
            Want to create your own watchlist?
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  )
}