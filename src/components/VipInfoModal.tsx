import React from 'react'
import { X, Crown, Download, Cog } from 'lucide-react'

interface VipInfoModalProps {
  isOpen: boolean
  onClose: () => void
}

export function VipInfoModal({ isOpen, onClose }: VipInfoModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 backdrop-blur-xl border border-yellow-500/20 rounded-xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full shadow-lg">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-white via-yellow-200 to-orange-200 bg-clip-text text-transparent">VIP Features</h3>
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
            This feature is in development. It will use a back end Radarr configuration so when movies that are not currently available as part of your premium Emby Package, you can make a direct request within this app to download the movie automatically.
          </p>
          
          <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-500/20 rounded-lg">
            <Download className="h-5 w-5 text-yellow-300 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-200 text-sm font-medium mb-1">Auto Download</p>
              <p className="text-yellow-100 text-sm">
                Request movies not available on Emby to be automatically downloaded via Radarr integration.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-blue-900/20 border border-blue-500/20 rounded-lg">
            <Cog className="h-5 w-5 text-blue-300 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-blue-200 text-sm font-medium mb-1">Note to Reviewers</p>
              <p className="text-blue-100 text-sm">
                This function and Emby functionality should be executed via a N8N workflow to handle both Emby requests and Radarr download requests using and LLM to handle API. Due to time constraints and small team, this was not feasible.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 font-semibold"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}