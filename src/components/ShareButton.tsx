import { useState } from 'react'
import { Share2, Copy, Check, Mail, MessageCircle, Facebook, Twitter } from 'lucide-react'
import { Movie } from '../lib/supabase'

interface ShareButtonProps {
  movies: Movie[]
  userName?: string
}

export function ShareButton({ movies, userName = 'Someone' }: ShareButtonProps) {
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [copied, setCopied] = useState(false)

  const generateShareText = () => {
    const watchedCount = movies.filter(m => m.watched).length
    const totalCount = movies.length
    const topMovies = movies
      .filter(m => m.watched)
      .slice(0, 3)
      .map(m => m.title)
      .join(', ')

    let shareText = `🎬 Check out ${userName}'s movie watchlist!\n\n`
    shareText += `📊 ${watchedCount} watched out of ${totalCount} movies\n`
    
    if (topMovies) {
      shareText += `🌟 Recently watched: ${topMovies}\n`
    }
    
    shareText += `\n🔗 View the full watchlist: ${window.location.origin}`
    
    return shareText
  }

  const generateShareUrl = () => {
    const params = new URLSearchParams({
      movies: movies.slice(0, 10).map(m => m.title).join(','),
      watched: movies.filter(m => m.watched).length.toString(),
      total: movies.length.toString()
    })
    return `${window.location.origin}?shared=true&${params.toString()}`
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${userName}'s Movie Watchlist`,
          text: generateShareText(),
          url: generateShareUrl()
        })
        setShowShareMenu(false)
      } catch (error) {
        console.log('Share cancelled or failed')
      }
    } else {
      // If native share is not available, show the share menu
      setShowShareMenu(true)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateShareText())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard')
    }
  }

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`${userName}'s Movie Watchlist`)
    const body = encodeURIComponent(generateShareText())
    window.open(`mailto:?subject=${subject}&body=${body}`)
    setShowShareMenu(false)
  }

  const shareViaTwitter = () => {
    const text = encodeURIComponent(generateShareText())
    window.open(`https://twitter.com/intent/tweet?text=${text}`)
    setShowShareMenu(false)
  }

  const shareViaFacebook = () => {
    const url = encodeURIComponent(generateShareUrl())
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`)
    setShowShareMenu(false)
  }

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(generateShareText())
    window.open(`https://wa.me/?text=${text}`)
    setShowShareMenu(false)
  }

  if (movies.length === 0) {
    return null
  }

  return (
    <div className="relative">
      <button
        onClick={handleNativeShare}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        title="Share your watchlist"
      >
        <Share2 className="h-4 w-4" />
        <span className="hidden sm:inline">Share Watchlist</span>
      </button>

      {showShareMenu && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowShareMenu(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-64 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 p-4">
            <h3 className="text-white font-semibold mb-3">Share Your Watchlist</h3>
            
            <div className="space-y-2">
              <button
                onClick={copyToClipboard}
                className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
              </button>

              <button
                onClick={shareViaEmail}
                className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Mail className="h-4 w-4" />
                <span>Share via Email</span>
              </button>

              <button
                onClick={shareViaWhatsApp}
                className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Share via WhatsApp</span>
              </button>

              <button
                onClick={shareViaTwitter}
                className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Twitter className="h-4 w-4" />
                <span>Share on Twitter</span>
              </button>

              <button
                onClick={shareViaFacebook}
                className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Facebook className="h-4 w-4" />
                <span>Share on Facebook</span>
              </button>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-700">
              <p className="text-xs text-gray-400">
                Share your movie taste with friends and get recommendations!
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}