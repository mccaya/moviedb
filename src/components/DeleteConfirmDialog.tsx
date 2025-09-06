import React from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface DeleteConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  movieTitle: string
}

export function DeleteConfirmDialog({ isOpen, onClose, onConfirm, movieTitle }: DeleteConfirmDialogProps) {
  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 backdrop-blur-xl border border-red-500/20 rounded-xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-full shadow-lg">
            <AlertTriangle className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-white via-red-200 to-pink-200 bg-clip-text text-transparent">Remove Movie</h3>
            <p className="text-sm text-gray-400">This action cannot be undone</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto p-2 text-gray-400 hover:text-white transition-all duration-300 hover:bg-red-500/20 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-300">
            Are you sure you want to remove <span className="font-semibold text-white">"{movieTitle}"</span> from your watchlist?
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-black/40 backdrop-blur-sm border border-gray-600/30 text-white rounded-xl hover:bg-black/60 transition-all duration-300"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 font-semibold"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}