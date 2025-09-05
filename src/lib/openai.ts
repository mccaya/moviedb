import OpenAI from 'openai'

export const openaiAPI = {
  async getRecommendations(prompt: string): Promise<string[]> {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
    
    console.log('AI Search - OpenRouter API Key check:', apiKey ? 'Present' : 'Missing')
    
    if (!apiKey || apiKey === 'demo-key' || apiKey === 'your-openrouter-api-key') {
      console.log('OpenRouter API key not configured or using demo key')
      return [
        'Demo: The Shawshank Redemption',
        'Demo: Inception', 
        'Demo: The Dark Knight',
        'Demo: Pulp Fiction',
        'Demo: Interstellar'
      ]
    }
    
    try {
      console.log('Initializing OpenRouter client...')
      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://openrouter.ai/api/v1',
        dangerouslyAllowBrowser: true,
        defaultHeaders: {
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Movie Watchlist App'
        }
      })

      console.log('Making OpenRouter API request with prompt:', prompt)
      const response = await openai.chat.completions.create({
        model: "meta-llama/llama-3-8b-instruct", // Free model on OpenRouter
        messages: [{
          role: "system",
          content: "You are a movie recommendation expert. Based on the user's request, provide exactly 5 movie titles, one per line. Only return the movie titles, nothing else. Be creative and consider the user's specific request."
        }, {
          role: "user",
          content: prompt
        }],
        max_tokens: 200,
        temperature: 0.8
      })

      const content = response.choices[0]?.message?.content?.trim() || ''
      console.log('OpenRouter raw response:', content)
      
      const titles = content.split('\n').filter(title => title.trim().length > 0).slice(0, 5)
      console.log('Parsed titles:', titles)
      
      return titles.length > 0 ? titles : ['No recommendations generated']
    } catch (error) {
      console.error('Error getting AI recommendations:', error)
      
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          console.error('OpenRouter API Error: Invalid API key (401)')
          return ['Error: Invalid OpenRouter API key']
        } else if (error.message.includes('quota')) {
          console.error('OpenRouter API quota exceeded')
          return ['Error: API quota exceeded']
        } else if (error.message.includes('rate_limit')) {
          console.error('OpenRouter API rate limit exceeded')
          return ['Error: Rate limit exceeded']
        }
      }
      
      return ['Error: Failed to get recommendations']
    }
  },

  async analyzeWatchlist(movies: any[]): Promise<string> {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
    
    if (!apiKey || apiKey === 'demo-key' || apiKey === 'your-openrouter-api-key') {
      return "Your watchlist shows a great taste for critically acclaimed films with a mix of genres. You seem to enjoy both classic and modern cinema."
    }

    try {
      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://openrouter.ai/api/v1',
        dangerouslyAllowBrowser: true,
        defaultHeaders: {
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Movie Watchlist App'
        }
      })
      
      const movieTitles = movies.map(m => m.title).join(', ')
      
      const response = await openai.chat.completions.create({
        model: "meta-llama/llama-3-8b-instruct",
        messages: [{
          role: "system",
          content: "You are a movie analyst. Analyze the user's movie watchlist and provide insights about their taste in movies. Keep it concise and engaging."
        }, {
          role: "user",
          content: `Analyze this movie watchlist: ${movieTitles}`
        }],
        max_tokens: 150,
        temperature: 0.7
      })

      return response.choices[0]?.message?.content || 'Your watchlist shows diverse taste in cinema!'
    } catch (error) {
      console.error('Error analyzing watchlist:', error)
      return 'Your watchlist shows great taste in movies!'
    }
  },

  async analyzeMovieCollection(movieTitle: string, collectionName: string): Promise<string> {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
    
    if (!apiKey || apiKey === 'demo-key' || apiKey === 'your-openrouter-api-key') {
      return `Since you're adding "${movieTitle}" from the ${collectionName}, you might want to watch the entire series for the complete story experience!`
    }

    try {
      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://openrouter.ai/api/v1',
        dangerouslyAllowBrowser: true,
        defaultHeaders: {
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Movie Watchlist App'
        }
      })
      
      const response = await openai.chat.completions.create({
        model: "meta-llama/llama-3-8b-instruct",
        messages: [{
          role: "system",
          content: "You are a movie expert. Provide a brief, engaging recommendation about why someone should consider watching an entire movie collection/series. Keep it under 100 words."
        }, {
          role: "user",
          content: `The user is adding "${movieTitle}" from the "${collectionName}" collection. Why should they consider watching the entire collection?`
        }],
        max_tokens: 120,
        temperature: 0.7
      })
      return response.choices[0]?.message?.content || `Since you're adding "${movieTitle}", consider watching the entire ${collectionName} for the complete experience!`
    } catch (error) {
      console.error('Error analyzing movie collection:', error)
      return `Since you're adding "${movieTitle}", consider watching the entire ${collectionName} for the complete experience!`
    }
  }
}