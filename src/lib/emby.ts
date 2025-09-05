const EMBY_SERVER_URL = import.meta.env.VITE_EMBY_URL
const EMBY_API_KEY = import.meta.env.VITE_EMBY_API_KEY

// Debug logging for Emby configuration
console.log('Emby Configuration:', {
  serverUrl: EMBY_SERVER_URL ? 'Set' : 'Not set',
  apiKey: EMBY_API_KEY ? 'Set' : 'Not set',
  fullServerUrl: EMBY_SERVER_URL,
  apiKeyLength: EMBY_API_KEY ? EMBY_API_KEY.length : 0
})

// Additional debugging for environment variables
console.log('All Emby environment variables:', {
  VITE_EMBY_URL: import.meta.env.VITE_EMBY_URL,
  VITE_EMBY_API_KEY: import.meta.env.VITE_EMBY_API_KEY ? '[HIDDEN]' : 'Not set'
})

if (!EMBY_SERVER_URL) {
  console.error('❌ EMBY SERVER URL NOT CONFIGURED!')
  console.log('💡 To fix this:')
  console.log('1. Check your .env file in the project root')
  console.log('2. Make sure you have: VITE_EMBY_URL=http://your-emby-server:8096')
  console.log('3. Restart the development server after making changes')
  console.log('4. The URL should NOT have quotes around it')
}

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
      console.warn('⚠️ Emby server URL or API key not configured for search')
      return null
    }

    try {
      console.log(`Searching Emby for movie: "${title}"${year ? ` (${year})` : ''}`)
      
      const searchParams = new URLSearchParams({
        api_key: EMBY_API_KEY,
        searchTerm: title,
        IncludeItemTypes: 'Movie',
        Limit: '10',
        Recursive: 'true'
      })

      const searchUrl = `${EMBY_SERVER_URL}/emby/Items?${searchParams}`
      console.log('Emby search URL:', searchUrl.replace(EMBY_API_KEY, '[API_KEY]'))
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        credentials: 'omit'
      })

      if (!response.ok) {
        console.error('Emby search API error:', {
          status: response.status,
          statusText: response.statusText,
          url: searchUrl.replace(EMBY_API_KEY, '[API_KEY]')
        })
        return null
      }

      const data: EmbySearchResult = await response.json()
      console.log('Emby search results:', {
        totalResults: data.TotalRecordCount,
        itemsFound: data.Items?.length || 0,
        items: data.Items?.map(item => ({ name: item.Name, year: item.ProductionYear }))
      })
      
      if (!data.Items || data.Items.length === 0) {
        console.log(`No results found for "${title}"`)
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

      console.log('Best match found:', {
        name: bestMatch.Name,
        year: bestMatch.ProductionYear,
        id: bestMatch.Id
      })
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
      console.warn('⚠️ Emby configuration missing - skipping connection test:', {
        serverUrl: !!EMBY_SERVER_URL,
        apiKey: !!EMBY_API_KEY
      })
      return false
    }

    try {
      const testUrl = `${EMBY_SERVER_URL}/emby/System/Info/Public?api_key=${EMBY_API_KEY}`
      console.log('Testing Emby connection to:', testUrl.replace(EMBY_API_KEY, '[API_KEY]'))
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'omit',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      console.log('Emby connection response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Emby server connected successfully:', {
          serverName: data.ServerName,
          version: data.Version,
          id: data.Id
        })
      } else {
        console.error('❌ Emby connection failed:', {
          status: response.status,
          statusText: response.statusText
        })
      }
      
      return response.ok
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('❌ Emby connection timeout - server may be unreachable')
        return false
      }
      
      console.warn('⚠️ Cannot connect to Emby server - this may be due to WebContainer network restrictions')
      console.log('📋 Emby connection details:', {
        serverUrl: EMBY_SERVER_URL,
        error: error.message,
        type: error.name
      })
      
      if (error.message.includes('fetch') || error.name === 'TypeError') {
        console.log('💡 This appears to be a network restriction or CORS issue.')
        console.log('🌐 WebContainer environments may not be able to access external IPs directly.')
        console.log('🔧 To enable Emby integration:')
        console.log('   1. Deploy this app to a regular web server (not WebContainer)')
        console.log('   2. Or use a local development environment')
        console.log('   3. Configure CORS in Emby: Dashboard → Network → Advanced')
        console.log('   4. Add your domain to "CORS hosts"')
        console.log('   5. The app works perfectly without Emby - this is optional')
      }
      
      return false
    }
  }
}