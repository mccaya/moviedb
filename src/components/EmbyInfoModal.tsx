import React from 'react'
import { X, Server, Globe, Shield } from 'lucide-react'

interface EmbyInfoModalProps {
  isOpen: boolean
  onClose: () => void
}

export function EmbyInfoModal({ isOpen, onClose }: EmbyInfoModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 backdrop-blur-xl border border-purple-500/20 rounded-xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full shadow-lg">
              <Server className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-white via-purple-200 to-indigo-200 bg-clip-text text-transparent">Emby Integration</h3>
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
            This feature is fully configured which allows end users to play Movies directly from a backend Emby Media Server.
          </p>
          
          <div className="flex items-start gap-3 p-3 bg-blue-900/20 border border-blue-500/20 rounded-lg">
            <Shield className="h-5 w-5 text-blue-300 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-blue-200 text-sm font-medium mb-1">HTTPS Requirement</p>
              <p className="text-blue-100 text-sm">
                To enable this feature, the backend Emby Server must have a valid HTTPS cert configured.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-orange-900/20 border border-orange-500/20 rounded-lg">
            <Globe className="h-5 w-5 text-orange-300 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-orange-200 text-sm font-medium mb-1">Deployment Required</p>
              <p className="text-orange-100 text-sm">
                Bolt.new is a webContainer that does not permit accessing external domains, therefore this app must be deployed on a public server such as Vercel.app to function.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 font-semibold"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}