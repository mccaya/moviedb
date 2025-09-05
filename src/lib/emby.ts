const EMBY_SERVER_URL = import.meta.env.VITE_EMBY_SERVER_URL
const EMBY_API_KEY = import.meta.env.VITE_EMBY_API_KEY

export interface EmbyItem {
  Id: string
  Name: string
  ProductionYear?: number
  Type: string
  Path: string
  MediaType: string
  ServerId: string
}

export interface EmbySearchResult {
  Items: EmbyItem[]
  TotalRecordCount: number
}

export const embyAPI = {
  async searchMovie(title: string, year?: number): Promise<EmbyItem | null> {
    if (!EMBY_SERVER_URL || !EMBY_API_KEY) {
      console.warn('Emby server URL or API key not configured')
      return null
    }

    try {
      const searchParams = new URLSearchParams({
        api_key: EMBY_API_KEY,
        searchTerm: title,
        IncludeItemTypes: 'Movie',
        Limit: '10',
        Recursive: 'true'
      })

      const response = await fetch(
        `${EMBY_SERVER_URL}/emby/Items?${searchParams}`
      )

      if (!response.ok) {
        console.error('Emby API error:', response.status)
        return null
      }

      const data: EmbySearchResult = await response.json()
      
      if (!data.Items || data.Items.length === 0) {
        return null
      }

      // Find best match - exact title and year if provided
      let bestMatch = data.Items[0]
      
      if (year) {
        const yearMatch = data.Items.find(item => 
          item.Name.toLowerCase() === title.toLowerCase() && 
          item.ProductionYear === year
        )
        if (yearMatch) bestMatch = yearMatch
      } else {
        const exactMatch = data.Items.find(item => 
          item.Name.toLowerCase() === title.toLowerCase()
        )
        if (exactMatch) bestMatch = exactMatch
      }

      return bestMatch
    } catch (error) {
      console.error('Error searching Emby:', error)
      return null
    }
  },

  async getPlayUrl(itemId: string): Promise<string | null> {
    if (!EMBY_SERVER_URL || !EMBY_API_KEY) {
      return null
    }

    try {
      // Get supported stream info
      const playbackParams = new URLSearchParams({
        api_key: EMBY_API_KEY,
        UserId: 'public', // You might need to create a public user or handle auth
        DeviceId: 'movieapp-web',
        MediaSourceId: itemId,
        Static: 'true'
      })

      return `${EMBY_SERVER_URL}/emby/Videos/${itemId}/stream?${playbackParams}`
    } catch (error) {
      console.error('Error getting play URL:', error)
      return null
    }
  },

  getWebPlayerUrl(itemId: string): string {
    if (!EMBY_SERVER_URL) return ''
    return `${EMBY_SERVER_URL}/web/index.html#!/item?id=${itemId}&serverId=default`
  },

  async checkConnection(): Promise<boolean> {
    if (!EMBY_SERVER_URL || !EMBY_API_KEY) {
      return false
    }

    try {
      const response = await fetch(
        `${EMBY_SERVER_URL}/emby/System/Info/Public?api_key=${EMBY_API_KEY}`
      )
      return response.ok
    } catch (error) {
      console.error('Cannot connect to Emby server:', error)
      return false
    }
  }
}