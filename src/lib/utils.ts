import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function formatRating(rating: number) {
  return Math.round(rating * 10) / 10
}

export function getGenreColor(genre: string) {
  const colors: Record<string, string> = {
    'Action': 'bg-red-500',
    'Adventure': 'bg-orange-500',
    'Comedy': 'bg-yellow-500',
    'Drama': 'bg-blue-500',
    'Horror': 'bg-purple-500',
    'Romance': 'bg-pink-500',
    'Sci-Fi': 'bg-green-500',
    'Thriller': 'bg-gray-500',
    'Fantasy': 'bg-indigo-500',
    'Crime': 'bg-red-700',
    'Mystery': 'bg-purple-700',
    'Animation': 'bg-cyan-500'
  }
  return colors[genre] || 'bg-gray-400'
}