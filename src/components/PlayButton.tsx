import React, { useState } from 'react'
import { Play, ExternalLink, Loader2, AlertCircle } from 'lucide-react'
import { embyAPI } from '../lib/emby'

interface PlayButtonProps {
  embyItemId: string
  movieTitle: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function PlayButton({ embyItemId, movieTitle, className = '', size = 'md' }: PlayButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePlay = async () => {
    setLoading(true)
    setError(null)

    try {
      // Check if Emby server is accessible
      const isConnected = await embyAPI.checkConnection()
      if (!isConnected) {
        setError('Cannot connect to Emby server')
        setLoading(false)
        return
      }

      // Open Emby web player in new tab
      const webPlayerUrl = embyAPI.getWebPlayerUrl(embyItemId)
      window.open(webPlayerUrl, '_blank', 'noopener,noreferrer')
      
    } catch (err) {
      console.error('Error opening movie:', err)
      setError('Failed to open movie')
    } finally {
      setLoading(false)
    }
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4', 
    lg: 'h-5 w-5'
  }

  if (error) {
    return (
      <button
        onClick={() => setError(null)}
        className={`${sizeClasses[size]} bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2 ${className}`}
        title={error}
      >
        <AlertCircle className={iconSizes[size]} />
        Error
      </button>
    )
  }

  return (
    <button
      onClick={handlePlay}
      disabled={loading}
      className={`${sizeClasses[size]} bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2 ${className}`}
      title={`Play "${movieTitle}" on Emby`}
    >
      {loading ? (
        <Loader2 className={`${iconSizes[size]} animate-spin`} />
      ) : (
        <Play className={`${iconSizes[size]} fill-current`} />
      )}
      <span className="hidden sm:inline">Play</span>
    </button>
  )
}

interface EmbyStatusIndicatorProps {
  available: boolean
  lastChecked?: string | null
  className?: string
}

export function EmbyStatusIndicator({ available, lastChecked, className = '' }: EmbyStatusIndicatorProps) {
  const formatLastChecked = (dateString: string | null) => {
    if (!dateString) return 'Never checked'
    const date = new Date(dateString)
    const now = new Date()
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'Checked recently'
    if (diffHours < 24) return `Checked ${diffHours}h ago`
    return `Checked ${Math.floor(diffHours / 24)}d ago`
  }

  return (
    <div className={`flex items-center gap-1 text-xs ${className}`}>
      <div 
        className={`w-2 h-2 rounded-full ${
          available ? 'bg-green-400' : 'bg-gray-400'
        }`}
        title={available ? 'Available on Emby' : 'Not found on Emby'}
      />
      <span className="text-gray-500">
        {available ? 'On Emby' : 'Not on Emby'}
      </span>
      {lastChecked && (
        <span className="text-gray-600 ml-1" title={formatLastChecked(lastChecked)}>
          •
        </span>
      )}
    </div>
  )
}