import React, { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '../lib/utils'

interface PersonalRatingStarsProps {
  rating: number | null
  onRatingChange: (rating: number | null) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export function PersonalRatingStars({ 
  rating, 
  onRatingChange, 
  disabled = false, 
  size = 'md',
  showLabel = true
}: PersonalRatingStarsProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null)

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5', 
    lg: 'h-6 w-6'
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  const handleStarClick = (starRating: number) => {
    if (disabled) return
    
    // If clicking the same rating, clear it
    if (rating === starRating) {
      onRatingChange(null)
    } else {
      onRatingChange(starRating)
    }
  }

  const handleStarHover = (starRating: number) => {
    if (!disabled) {
      setHoverRating(starRating)
    }
  }

  const handleMouseLeave = () => {
    setHoverRating(null)
  }

  const displayRating = hoverRating || rating || 0

  return (
    <div className="flex items-center gap-2">
      {showLabel && (
        <span className={cn("text-gray-400 font-medium whitespace-nowrap", textSizeClasses[size])}>
          Your Personal Rating:
        </span>
      )}
      
      <div className="flex items-center gap-1" onMouseLeave={handleMouseLeave}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => {
          const isFilled = star <= displayRating
          const isHovered = hoverRating !== null && star <= hoverRating
          
          return (
            <button
              key={star}
              onClick={() => handleStarClick(star)}
              onMouseEnter={() => handleStarHover(star)}
              disabled={disabled}
              className={cn(
                "transition-all duration-200 transform hover:scale-110",
                disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                "focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-50 rounded"
              )}
              title={`Rate ${star}/10`}
            >
              <Star
                className={cn(
                  sizeClasses[size],
                  "transition-colors duration-200",
                  isFilled
                    ? isHovered
                      ? "text-yellow-300 fill-yellow-300"
                      : "text-yellow-400 fill-yellow-400"
                    : isHovered
                    ? "text-yellow-300"
                    : "text-gray-500 hover:text-yellow-300"
                )}
              />
            </button>
          )
        })}
        
        {rating && (
          <div className="flex items-center gap-1 ml-2">
            <span className={cn("text-yellow-400 font-semibold", textSizeClasses[size])}>
              {rating}/10
            </span>
            <button
              onClick={() => onRatingChange(null)}
              disabled={disabled}
              className={cn(
                "text-gray-500 hover:text-red-400 transition-colors",
                textSizeClasses[size],
                disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              )}
              title="Clear rating"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  )
}