const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const BASE_URL = 'https://api.themoviedb.org/3'
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500'

export interface TMDBMovie {
  id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  genre_ids: number[]
  genres?: { id: number; name: string }[]
}

const genreMap: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western'
}

export const tmdbAPI = {
  async searchMovies(query: string): Promise<TMDBMovie[]> {
    if (!query.trim()) return []
    
    if (!TMDB_API_KEY) {
      console.error('TMDB API key is missing. Please set VITE_TMDB_API_KEY in your .env file.')
      throw new Error('TMDB API key is required. Please check your .env configuration.')
    }
    
    try {
      const response = await fetch(
        `${BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=1`
      )
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('TMDB API error: Invalid API key (401)')
          throw new Error('Invalid TMDB API key. Please check your VITE_TMDB_API_KEY in the .env file.')
        }
        console.error('TMDB API error:', response.status)
        throw new Error(`TMDB API error: ${response.status}`)
      }
      
      const data = await response.json()
      return data.results || []
    } catch (error) {
      console.error('Error searching movies:', error)
      return []
    }
  },

  async getMovieDetails(tmdbId: number): Promise<TMDBMovie | null> {
    if (!TMDB_API_KEY) {
      console.error('TMDB API key is missing')
      return null
    }
    
    try {
      const response = await fetch(
        `${BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=videos,credits`
      )
      
      if (!response.ok) return null
      
      return await response.json()
    } catch (error) {
      console.error('Error fetching movie details:', error)
      return null
    }
  },

  async getTrendingMovies(): Promise<TMDBMovie[]> {
    if (!TMDB_API_KEY) {
      console.error('TMDB API key is missing')
      return []
    }
    
    try {
      const response = await fetch(
        `${BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}`
      )
      
      if (!response.ok) return []
      
      const data = await response.json()
      return data.results || []
    } catch (error) {
      console.error('Error fetching trending movies:', error)
      return []
    }
  },

  getImageUrl(path: string | null): string {
    if (!path) return '/placeholder-movie.jpg'
    return `${IMAGE_BASE_URL}${path}`
  },

  getGenreNames(genreIds: number[]): string[] {
    return genreIds.map(id => genreMap[id]).filter(Boolean)
  },

  async getMovieCollection(movieId: number): Promise<any | null> {
    if (!TMDB_API_KEY) {
      console.error('TMDB API key is missing')
      return null
    }
    
    try {
      // First get the movie details to check if it belongs to a collection
      const movieResponse = await fetch(
        `${BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}`
      )
      
      if (!movieResponse.ok) return null
      
      const movieData = await movieResponse.json()
      
      if (!movieData.belongs_to_collection) return null
      
      // Get the full collection details
      const collectionResponse = await fetch(
        `${BASE_URL}/collection/${movieData.belongs_to_collection.id}?api_key=${TMDB_API_KEY}`
      )
      
      if (!collectionResponse.ok) return null
      
      const collectionData = await collectionResponse.json()
      
      return {
        id: collectionData.id,
        name: collectionData.name,
        overview: collectionData.overview,
        poster_path: collectionData.poster_path,
        backdrop_path: collectionData.backdrop_path,
        parts: collectionData.parts.map((movie: any) => ({
          id: movie.id,
          title: movie.title,
          overview: movie.overview,
          poster_path: movie.poster_path,
          release_date: movie.release_date,
          vote_average: movie.vote_average,
          genre_ids: []
        }))
      }
    } catch (error) {
      console.error('Error fetching movie collection:', error)
      return null
    }
  }
}