import React from 'react'
import { X, Download, FileText, Calendar } from 'lucide-react'
import { Movie } from '../lib/supabase'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  movies: Movie[]
}

export function ExportModal({ isOpen, onClose, movies }: ExportModalProps) {
  const handleExportCSV = () => {
    if (movies.length === 0) {
      alert('No movies to export')
      return
    }

    // Create CSV content
    const headers = [
      'Title',
      'Release Date',
      'Rating',
      'Genres',
      'Watched',
      'Personal Rating',
      'User Preference',
      'Added At',
      'Overview'
    ]

    const csvContent = [
      headers.join(','),
      ...movies.map(movie => [
        `"${movie.title.replace(/"/g, '""')}"`,
        movie.release_date || '',
        movie.rating || '',
        `"${(movie.genres || []).join(', ')}"`,
        movie.watched ? 'Yes' : 'No',
        movie.personal_rating || '',
        movie.user_preference || '',
        new Date(movie.added_at).toLocaleDateString(),
        `"${(movie.overview || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n')

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `movie-watchlist-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 backdrop-blur-xl border border-blue-500/20 rounded-xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full shadow-lg">
              <Download className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-white via-blue-200 to-cyan-200 bg-clip-text text-transparent">Export Watchlist</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-all duration-300 hover:bg-red-500/20 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <p className="text-gray-300">
            Export your movie watchlist to a CSV file that you can open in Excel, Google Sheets, or any spreadsheet application.
          </p>
          
          <div className="flex items-start gap-3 p-3 bg-blue-900/20 border border-blue-500/20 rounded-lg">
            <FileText className="h-5 w-5 text-blue-300 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-blue-200 text-sm font-medium mb-1">Export includes:</p>
              <ul className="text-blue-100 text-sm space-y-1">
                <li>• Movie titles and release dates</li>
                <li>• Ratings and genres</li>
                <li>• Watch status and personal ratings</li>
                <li>• Your preferences and notes</li>
              </ul>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Calendar className="h-4 w-4" />
            <span>{movies.length} movies will be exported</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-black/40 backdrop-blur-sm border border-gray-600/30 text-white rounded-xl hover:bg-black/60 transition-all duration-300"
          >
            Cancel
          </button>
          <button
            onClick={handleExportCSV}
            disabled={movies.length === 0}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2 font-semibold"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>
    </div>
  )
}