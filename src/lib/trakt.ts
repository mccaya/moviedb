// lib/trakt.ts
export interface TraktMovie {
  title: string
  year: number
  ids: {
    trakt: number
    slug: string
    imdb?: string
    tmdb?: number
  }
}

export interface TraktListItem {
  movie: TraktMovie
  listed_at: string
}

export interface TraktList {
  name: string
  slug: string
  description: string
  item_count: number
  updated_at: string
}

class TraktAPI {
  private baseUrl = 'https://api.trakt.tv'
  
  // Predefined lists for the user garycrawfordgc
  private predefinedLists = [
    {
      name: 'Amazon Prime Movies',
      slug: 'amazon-prime-movies',
      username: 'garycrawfordgc',
      description: 'Movies available on Amazon Prime Video'
    },
    {
      name: 'Disney+ Movies', 
      slug: 'disney-movies',
      username: 'garycrawfordgc',
      description: 'Movies available on Disney Plus'
    },
    {
      name: 'Hulu Movies',
      slug: 'hulu-movies', 
      username: 'garycrawfordgc',
      description: 'Movies available on Hulu'
    },
    {
      name: 'Netflix Movies',
      slug: 'netflix-movies',
      username: 'garycrawfordgc', 
      description: 'Movies available on Netflix'
    },
    {
      name: 'Top Movies of the Week',
      slug: 'top-movies-of-the-week',
      username: 'garycrawfordgc',
      description: 'Weekly top movie recommendations'
    }
  ]

  constructor() {
    // Note: Trakt API typically requires authentication for most endpoints
    // For public lists, we might be able to use them without auth
    // You may need to register for a Trakt API key at https://trakt.tv/oauth/applications
  }

  private async makeRequest<T>(endpoint: string): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'trakt-api-version': '2',
          // Add API key if you have one: 'trakt-api-key': 'your-api-key'
        }
      })

      if (!response.ok) {
        throw new Error(`Trakt API error: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Trakt API request failed:', error)
      throw error
    }
  }

  /**
   * Get predefined list configurations
   */
  getPredefinedLists() {
    return this.predefinedLists
  }

  /**
   * Get movies from a specific user's list
   */
  async getListMovies(username: string, listSlug: string): Promise<TraktListItem[]> {
    try {
      const endpoint = `/users/${username}/lists/${listSlug}/items/movies`
      return await this.makeRequest<TraktListItem[]>(endpoint)
    } catch (error) {
      console.error(`Failed to fetch list ${listSlug} for user ${username}:`, error)
      // Return demo data if API fails
      return this.getDemoListData(listSlug)
    }
  }

  /**
   * Get list information
   */
  async getListInfo(username: string, listSlug: string): Promise<TraktList> {
    try {
      const endpoint = `/users/${username}/lists/${listSlug}`
      return await this.makeRequest<TraktList>(endpoint)
    } catch (error) {
      console.error(`Failed to fetch list info for ${listSlug}:`, error)
      // Return demo data if API fails
      const predefined = this.predefinedLists.find(list => list.slug === listSlug)
      return {
        name: predefined?.name || 'Unknown List',
        slug: listSlug,
        description: predefined?.description || '',
        item_count: 0,
        updated_at: new Date().toISOString()
      }
    }
  }

  /**
   * Convert Trakt movie to format compatible with TMDB search
   */
  formatMovieForTMDB(traktMovie: TraktMovie) {
    return {
      title: traktMovie.title,
      year: traktMovie.year,
      tmdbId: traktMovie.ids.tmdb,
      imdbId: traktMovie.ids.imdb
    }
  }

  /**
   * Demo data for when API is unavailable
   */
  private getDemoListData(listSlug: string): TraktListItem[] {
    const demoData: Record<string, TraktListItem[]> = {
      'amazon-prime-movies': [
        {
          movie: {
            title: 'The Terminal List',
            year: 2022,
            ids: { trakt: 123456, slug: 'the-terminal-list-2022', tmdb: 840326 }
          },
          listed_at: '2024-01-15T10:00:00.000Z'
        },
        {
          movie: {
            title: 'Air',
            year: 2023,
            ids: { trakt: 789012, slug: 'air-2023', tmdb: 964980 }
          },
          listed_at: '2024-01-14T15:30:00.000Z'
        },
        {
          movie: {
            title: 'The Boys in the Boat',
            year: 2023,
            ids: { trakt: 890123, slug: 'the-boys-in-the-boat-2023', tmdb: 1029575 }
          },
          listed_at: '2024-01-13T12:00:00.000Z'
        }
      ],
      'disney-movies': [
        {
          movie: {
            title: 'Encanto',
            year: 2021,
            ids: { trakt: 345678, slug: 'encanto-2021', tmdb: 568124 }
          },
          listed_at: '2024-01-15T12:00:00.000Z'
        },
        {
          movie: {
            title: 'Luca',
            year: 2021,
            ids: { trakt: 456789, slug: 'luca-2021', tmdb: 508943 }
          },
          listed_at: '2024-01-14T18:00:00.000Z'
        },
        {
          movie: {
            title: 'Turning Red',
            year: 2022,
            ids: { trakt: 567123, slug: 'turning-red-2022', tmdb: 508947 }
          },
          listed_at: '2024-01-13T16:00:00.000Z'
        }
      ],
      'hulu-movies': [
        {
          movie: {
            title: 'Palm Springs',
            year: 2020,
            ids: { trakt: 567890, slug: 'palm-springs-2020', tmdb: 630566 }
          },
          listed_at: '2024-01-15T14:00:00.000Z'
        },
        {
          movie: {
            title: 'The Bear',
            year: 2022,
            ids: { trakt: 678123, slug: 'the-bear-2022', tmdb: 840430 }
          },
          listed_at: '2024-01-14T10:00:00.000Z'
        },
        {
          movie: {
            title: 'Prey',
            year: 2022,
            ids: { trakt: 789234, slug: 'prey-2022', tmdb: 766507 }
          },
          listed_at: '2024-01-13T20:00:00.000Z'
        }
      ],
      'netflix-movies': [
        {
          movie: {
            title: 'Glass Onion: A Knives Out Mystery',
            year: 2022,
            ids: { trakt: 678901, slug: 'glass-onion-a-knives-out-mystery-2022', tmdb: 831405 }
          },
          listed_at: '2024-01-15T16:00:00.000Z'
        },
        {
          movie: {
            title: 'Red Notice',
            year: 2021,
            ids: { trakt: 890234, slug: 'red-notice-2021', tmdb: 512195 }
          },
          listed_at: '2024-01-14T14:00:00.000Z'
        },
        {
          movie: {
            title: 'The Adam Project',
            year: 2022,
            ids: { trakt: 901345, slug: 'the-adam-project-2022', tmdb: 696806 }
          },
          listed_at: '2024-01-13T11:00:00.000Z'
        }
      ],
      'top-movies-of-the-week': [
        {
          movie: {
            title: 'Dune: Part Two',
            year: 2024,
            ids: { trakt: 789123, slug: 'dune-part-two-2024', tmdb: 693134 }
          },
          listed_at: '2024-01-15T20:00:00.000Z'
        },
        {
          movie: {
            title: 'Oppenheimer',
            year: 2023,
            ids: { trakt: 012456, slug: 'oppenheimer-2023', tmdb: 872585 }
          },
          listed_at: '2024-01-14T22:00:00.000Z'
        },
        {
          movie: {
            title: 'Barbie',
            year: 2023,
            ids: { trakt: 123567, slug: 'barbie-2023', tmdb: 346698 }
          },
          listed_at: '2024-01-13T19:00:00.000Z'
        }
      ]
    }

    return demoData[listSlug] || []
  }
}

export const traktAPI = new TraktAPI()