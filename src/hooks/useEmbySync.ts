import { useState, useEffect, useCallback } from 'react'
import { embyAPI } from '../lib/emby'
import { movieService, Movie } from '../lib/supabase'

interface EmbySync {
  isChecking: boolean
  lastSync: Date | null
  checkMovie: (movie: Movie) => Promise<void>
  checkAllMovies: (movies: Movie[]) => Promise<void>
  syncProgress: {
    current: number
    total: number
    isRunning: boolean
  }
}

export function useEmbySync(): EmbySync {
  const [isChecking, setIsChecking] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [syncProgress, setSyncProgress] = useState({
    current: 0,
    total: 0,
    isRunning: false
  })

  const checkMovie = useCallback(async (movie: Movie) => {
    try {
      // Extract year from release date
      const year = movie.release_date ? new Date(movie.release_date).getFullYear() : undefined
      
      // Search for movie on Emby
      const embyItem = await embyAPI.searchMovie(movie.title, year)
      
      // Update movie with Emby status
      await movieService.updateEmbyStatus(
        movie.id,
        embyItem?.Id || null,
        !!embyItem
      )
      
      return embyItem
    } catch (error) {
      console.error(`Error checking movie "${movie.title}" on Emby:`, error)
      
      // Still update the check timestamp even if failed
      await movieService.updateEmbyStatus(movie.id, null, false)
      return null
    }
  }, [])

  const checkAllMovies = useCallback(async (movies: Movie[]) => {
    if (movies.length === 0) return

    setIsChecking(true)
    setSyncProgress({
      current: 0,
      total: movies.length,
      isRunning: true
    })

    try {
      // Check Emby connection first
      const isConnected = await embyAPI.checkConnection()
      if (!isConnected) {
        console.warn('Emby server not accessible, skipping sync')
        return
      }

      for (let i = 0; i < movies.length; i++) {
        const movie = movies[i]
        await checkMovie(movie)
        
        setSyncProgress(prev => ({
          ...prev,
          current: i + 1
        }))

        // Small delay to prevent overwhelming the Emby server
        if (i < movies.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }

      setLastSync(new Date())
    } catch (error) {
      console.error('Error during Emby sync:', error)
    } finally {
      setIsChecking(false)
      setSyncProgress(prev => ({
        ...prev,
        isRunning: false
      }))
    }
  }, [checkMovie])

  return {
    isChecking,
    lastSync,
    checkMovie,
    checkAllMovies,
    syncProgress
  }
}