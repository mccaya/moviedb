// components/ImportModal.tsx
import { useState } from 'react'
import { Upload, X, FileText, Loader2, CheckCircle, AlertCircle, List, ChevronRight } from 'lucide-react'
import { tmdbAPI, TMDBMovie } from '../lib/tmdb'
import { TraktImportModal } from './TraktImportModal'

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

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (movies: TMDBMovie[]) => Promise<void>
  watchlistMovies?: Movie[]
  onRemoveMovie?: (id: string) => Promise<void>
}

type ImportMethod = 'csv' | 'trakt' | null

export function ImportModal({ 
  isOpen, 
  onClose, 
  onImport, 
  watchlistMovies = [], 
  onRemoveMovie = async () => {} 
}: ImportModalProps) {
  const [importMethod, setImportMethod] = useState<ImportMethod>(null)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvMovies, setCsvMovies] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [results, setResults] = useState<{ success: TMDBMovie[], failed: string[] }>({ success: [], failed: [] })
  const [showTraktModal, setShowTraktModal] = useState(false)
  const [showWebContainerWarning, setShowWebContainerWarning] = useState(false)

  const handleClose = () => {
    setImportMethod(null)
    setCsvFile(null)
    setCsvMovies([])
    setLoading(false)
    setProgress({ current: 0, total: 0 })
    setResults({ success: [], failed: [] })
    setShowWebContainerWarning(false)
    onClose()
  }

  const handleCsvFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'text/csv') {
      setCsvFile(file)
      parseCsvFile(file)
    }
  }

  const parseCsvFile = async (file: File) => {
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      // Try to detect movie titles from CSV
      const movieTitles: string[] = []
      
      for (const line of lines) {
        const columns = line.split(',').map(col => col.trim().replace(/"/g, ''))
        
        // Look for movie titles in various column positions
        for (const column of columns) {
          if (column && column.length > 2 && !column.match(/^\d+$/)) {
            // Basic heuristic to identify movie titles
            if (column.match(/^[A-Za-z0-9\s:'-]+$/)) {
              movieTitles.push(column)
              break // Only take first potential title per row
            }
          }
        }
      }
      
      setCsvMovies(movieTitles.slice(0, 50)) // Limit to 50 movies
    } catch (error) {
      console.error('Error parsing CSV:', error)
    }
  }

  const handleCsvImport = async () => {
    if (csvMovies.length === 0) return

    setLoading(true)
    setProgress({ current: 0, total: csvMovies.length })
    
    const success: TMDBMovie[] = []
    const failed: string[] = []

    for (let i = 0; i < csvMovies.length; i++) {
      const title = csvMovies[i]
      setProgress({ current: i + 1, total: csvMovies.length })
      
      try {
        const searchResults = await tmdbAPI.searchMovies(title)
        if (searchResults.length > 0) {
          success.push(searchResults[0])
        } else {
          failed.push(title)
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error) {
        failed.push(title)
      }
    }

    setResults({ success, failed })
    setLoading(false)

    // Import successful movies
    if (success.length > 0) {
      try {
        await onImport(success)
      } catch (error) {
        console.error('Error importing movies:', error)
      }
    }
  }

  const handleTraktImport = () => {
    setShowWebContainerWarning(true)
  }

  const handleWebContainerWarningOk = () => {
    setShowWebContainerWarning(false)
    setShowTraktModal(true)
  }

  const handleTraktClose = () => {
    setShowTraktModal(false)
    handleClose()
  }

  if (!isOpen) return null

  // Show Trakt modal if selected
  if (showTraktModal) {
    return (
      <TraktImportModal
        isOpen={true}
        onClose={handleTraktClose}
        onImport={onImport}
        watchlistMovies={watchlistMovies}
        onRemoveMovie={onRemoveMovie}
      />
    )
  }

  // Show WebContainer warning popup
  if (showWebContainerWarning) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-xl max-w-md w-full p-6">
          <div className="text-center mb-6">
            <div className="p-3 bg-blue-100 rounded-full mx-auto mb-4 w-fit">
              <List className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-4">Streaming Service Lists</h3>
            <p className="text-gray-300 leading-relaxed">
              This option is fully functional but Bolt.new does not allow accessing external web addresses. 
              Function can be enabled by hosting on a site such as vercel.com
            </p>
          </div>
          
          <button
            onClick={handleWebContainerWarningOk}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            OK
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Upload className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Import Movies</h3>
                <p className="text-sm text-gray-400">Add movies to your watchlist from various sources</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {!importMethod ? (
            /* Method Selection */
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white mb-4">Choose Import Method</h4>
              
              {/* Trakt Lists Option */}
              <button
                onClick={handleTraktImport}
                className="w-full p-6 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 rounded-full">
                      <List className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h5 className="text-lg font-semibold text-white mb-1">Streaming Service Lists</h5>
                      <p className="text-gray-400 text-sm">
                        Import from curated lists: Netflix, Disney+, Amazon Prime, Hulu, and Top Movies
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="px-2 py-1 bg-red-600 text-white text-xs rounded">Netflix</span>
                        <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">Disney+</span>
                        <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded">Prime</span>
                        <span className="px-2 py-1 bg-green-500 text-white text-xs rounded">Hulu</span>
                        <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded">Top Movies</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
                </div>
              </button>

              {/* CSV Upload Option */}
              <button
                onClick={() => setImportMethod('csv')}
                className="w-full p-6 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-full">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h5 className="text-lg font-semibold text-white mb-1">CSV File Upload</h5>
                      <p className="text-gray-400 text-sm">
                        Upload a CSV file with movie titles from IMDB lists or other sources
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
                </div>
              </button>
            </div>
          ) : importMethod === 'csv' ? (
            /* CSV Import */
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setImportMethod(null)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  ←
                </button>
                <h4 className="text-lg font-semibold text-white">CSV File Import</h4>
              </div>

              {!csvFile ? (
                <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center">
                  <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <h5 className="text-lg font-semibold text-white mb-2">Upload CSV File</h5>
                  <p className="text-gray-400 mb-4">
                    Select a CSV file containing movie titles
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvFileChange}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    Choose File
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{csvFile.name}</p>
                      <p className="text-gray-400 text-sm">{csvMovies.length} movies detected</p>
                    </div>
                    <button
                      onClick={() => {
                        setCsvFile(null)
                        setCsvMovies([])
                      }}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {csvMovies.length > 0 && (
                    <div className="space-y-4">
                      <div className="max-h-40 overflow-y-auto bg-gray-700 rounded-lg p-4">
                        <h6 className="text-white font-medium mb-2">Detected Movies:</h6>
                        <div className="space-y-1">
                          {csvMovies.slice(0, 10).map((title, index) => (
                            <div key={index} className="text-gray-300 text-sm">
                              • {title}
                            </div>
                          ))}
                          {csvMovies.length > 10 && (
                            <div className="text-gray-400 text-sm">
                              ... and {csvMovies.length - 10} more
                            </div>
                          )}
                        </div>
                      </div>

                      {loading ? (
                        <div className="text-center py-4">
                          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
                          <p className="text-white">
                            Processing {progress.current} of {progress.total} movies...
                          </p>
                        </div>
                      ) : results.success.length > 0 || results.failed.length > 0 ? (
                        <div className="space-y-4">
                          {results.success.length > 0 && (
                            <div className="p-4 bg-green-900/20 border border-green-500/20 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="h-5 w-5 text-green-400" />
                                <span className="text-green-300 font-medium">
                                  Successfully imported {results.success.length} movies
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {results.failed.length > 0 && (
                            <div className="p-4 bg-red-900/20 border border-red-500/20 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertCircle className="h-5 w-5 text-red-400" />
                                <span className="text-red-300 font-medium">
                                  Failed to find {results.failed.length} movies
                                </span>
                              </div>
                              <div className="text-red-200 text-sm max-h-20 overflow-y-auto">
                                {results.failed.slice(0, 5).map((title, index) => (
                                  <div key={index}>• {title}</div>
                                ))}
                                {results.failed.length > 5 && (
                                  <div>... and {results.failed.length - 5} more</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={handleCsvImport}
                          className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          Import {csvMovies.length} Movies
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}