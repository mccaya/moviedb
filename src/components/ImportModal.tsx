import { useState } from 'react'
import { Upload, X, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { tmdbAPI } from '../lib/tmdb'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (movies: any[]) => Promise<void>
}

export function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<{
    success: number
    failed: number
    errors: string[]
  } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile)
      setResults(null)
    }
  }

  const parseCSV = async (text: string): Promise<any[]> => {
    const lines = text.split('\n').filter(line => line.trim())
    const movies = []
    const errors = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      setProgress(Math.round((i / lines.length) * 50)) // First 50% for parsing

      try {
        // Try to extract IMDB ID (tt followed by numbers)
        const imdbMatch = line.match(/tt\d+/)
        if (imdbMatch) {
          const imdbId = imdbMatch[0]
          // For demo purposes, we'll search by title instead
          // In a real app, you'd use IMDB ID to TMDB ID conversion
          const titleMatch = line.match(/"([^"]+)"/) || line.split(',')
          const title = titleMatch[1] || titleMatch[0]
          
          if (title) {
            const searchResults = await tmdbAPI.searchMovies(title.trim())
            if (searchResults.length > 0) {
              movies.push(searchResults[0])
            } else {
              errors.push(`Movie not found: ${title}`)
            }
          }
        } else {
          // Try to extract title from CSV
          const parts = line.split(',')
          const title = parts[0]?.replace(/"/g, '').trim()
          
          if (title && title.length > 2) {
            const searchResults = await tmdbAPI.searchMovies(title)
            if (searchResults.length > 0) {
              movies.push(searchResults[0])
            } else {
              errors.push(`Movie not found: ${title}`)
            }
          }
        }
      } catch (error) {
        errors.push(`Error processing line ${i + 1}: ${line}`)
      }

      // Small delay to prevent rate limiting
      if (i % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return movies
  }

  const handleImport = async () => {
    if (!file) return

    setImporting(true)
    setProgress(0)

    try {
      const text = await file.text()
      const movies = await parseCSV(text)
      
      setProgress(75)
      
      let successCount = 0
      let failedCount = 0
      const errors: string[] = []

      for (let i = 0; i < movies.length; i++) {
        try {
          await onImport([movies[i]])
          successCount++
        } catch (error) {
          failedCount++
          errors.push(`Failed to add: ${movies[i].title}`)
        }
        
        setProgress(75 + Math.round((i / movies.length) * 25))
      }

      setResults({
        success: successCount,
        failed: failedCount,
        errors
      })
    } catch (error) {
      setResults({
        success: 0,
        failed: 1,
        errors: ['Failed to process file']
      })
    } finally {
      setImporting(false)
      setProgress(100)
    }
  }

  const handleClose = () => {
    setFile(null)
    setProgress(0)
    setResults(null)
    setImporting(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Import Movies</h3>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!results ? (
          <>
            <div className="mb-4">
              <p className="text-sm text-gray-300 mb-2">
                Upload a CSV file with movie titles or IMDB IDs
              </p>
              <p className="text-xs text-gray-400">
                Supported formats: "Movie Title", tt1234567, or mixed CSV
              </p>
            </div>

            <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center mb-4">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="h-8 w-8 text-gray-400" />
                <span className="text-sm text-gray-300">
                  {file ? file.name : 'Choose CSV file'}
                </span>
              </label>
            </div>

            {importing && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="text-sm text-white">
                    Importing movies... {progress}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                disabled={importing}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!file || importing}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-4">
              {results.success > 0 ? (
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
              ) : (
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
              )}
              <h4 className="text-lg font-semibold text-white mb-2">
                Import Complete
              </h4>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Successfully imported:</span>
                <span className="text-green-400 font-medium">{results.success}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Failed:</span>
                <span className="text-red-400 font-medium">{results.failed}</span>
              </div>
            </div>

            {results.errors.length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-300 mb-2">Errors:</h5>
                <div className="max-h-32 overflow-y-auto bg-gray-900 rounded p-2">
                  {results.errors.slice(0, 5).map((error, index) => (
                    <p key={index} className="text-xs text-red-400 mb-1">
                      {error}
                    </p>
                  ))}
                  {results.errors.length > 5 && (
                    <p className="text-xs text-gray-400">
                      ... and {results.errors.length - 5} more errors
                    </p>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={handleClose}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  )
}