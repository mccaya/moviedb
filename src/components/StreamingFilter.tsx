import React, { useState } from 'react'
import { Tv, ChevronDown, Check, Search, X } from 'lucide-react'

interface StreamingService {
  id: number
  name: string
  logo: string
  category: 'major' | 'premium' | 'free' | 'sports' | 'international' | 'niche'
  color: string
}

const COMPREHENSIVE_STREAMING_SERVICES: StreamingService[] = [
  // Major Services
  { id: 8, name: 'Netflix', logo: 'N', category: 'major', color: 'bg-red-600' },
  { id: 337, name: 'Disney Plus', logo: 'D+', category: 'major', color: 'bg-blue-600' },
  { id: 15, name: 'Hulu', logo: 'H', category: 'major', color: 'bg-green-500' },
  { id: 9, name: 'Amazon Prime Video', logo: 'P', category: 'major', color: 'bg-blue-500' },
  { id: 350, name: 'Apple TV Plus', logo: 'A', category: 'major', color: 'bg-gray-800' },
  { id: 2, name: 'Apple iTunes', logo: 'i', category: 'major', color: 'bg-gray-700' },
  
  // Premium Cable/Streaming
  { id: 384, name: 'HBO Max', logo: 'HBO', category: 'premium', color: 'bg-purple-600' },
  { id: 531, name: 'Paramount Plus', logo: 'P+', category: 'premium', color: 'bg-blue-700' },
  { id: 386, name: 'Peacock Premium', logo: 'PC', category: 'premium', color: 'bg-purple-500' },
  { id: 34, name: 'MGM+', logo: 'MGM', category: 'premium', color: 'bg-yellow-600' },
  { id: 387, name: 'Starz', logo: 'ST', category: 'premium', color: 'bg-black' },
  { id: 43, name: 'Showtime', logo: 'SH', category: 'premium', color: 'bg-red-700' },
  { id: 1899, name: 'Max', logo: 'MAX', category: 'premium', color: 'bg-purple-700' },
  { id: 257, name: 'fuboTV', logo: 'fubo', category: 'premium', color: 'bg-green-600' },
  { id: 1773, name: 'AMC+', logo: 'AMC', category: 'premium', color: 'bg-red-600' },
  { id: 1774, name: 'Discovery+', logo: 'D+', category: 'premium', color: 'bg-blue-500' },
  { id: 1775, name: 'Epix', logo: 'EPX', category: 'premium', color: 'bg-gray-700' },
  
  // Free Services
  { id: 613, name: 'Tubi', logo: 'TB', category: 'free', color: 'bg-orange-500' },
  { id: 300, name: 'Pluto TV', logo: 'PL', category: 'free', color: 'bg-blue-400' },
  { id: 207, name: 'Vudu', logo: 'V', category: 'free', color: 'bg-blue-600' },
  { id: 358, name: 'The Roku Channel', logo: 'RK', category: 'free', color: 'bg-purple-400' },
  { id: 1796, name: 'Freevee', logo: 'FV', category: 'free', color: 'bg-gray-600' },
  { id: 1818, name: 'Crackle', logo: 'CR', category: 'free', color: 'bg-orange-600' },
  { id: 279, name: 'Plex', logo: 'PX', category: 'free', color: 'bg-yellow-600' },
  { id: 1777, name: 'IMDb TV', logo: 'IMDb', category: 'free', color: 'bg-yellow-500' },
  { id: 1778, name: 'Redbox', logo: 'RB', category: 'free', color: 'bg-red-500' },
  { id: 1779, name: 'Kanopy', logo: 'KN', category: 'free', color: 'bg-blue-400' },
  { id: 1780, name: 'Hoopla', logo: 'HL', category: 'free', color: 'bg-green-500' },
  
  // Sports
  { id: 1759, name: 'ESPN Plus', logo: 'E+', category: 'sports', color: 'bg-red-500' },
  { id: 1770, name: 'NFL Plus', logo: 'NFL', category: 'sports', color: 'bg-blue-800' },
  { id: 1767, name: 'MLB.TV', logo: 'MLB', category: 'sports', color: 'bg-blue-700' },
  { id: 1768, name: 'NBA League Pass', logo: 'NBA', category: 'sports', color: 'bg-orange-700' },
  { id: 1781, name: 'NHL.TV', logo: 'NHL', category: 'sports', color: 'bg-blue-800' },
  { id: 1782, name: 'MLS Season Pass', logo: 'MLS', category: 'sports', color: 'bg-green-600' },
  { id: 1783, name: 'DAZN', logo: 'DZN', category: 'sports', color: 'bg-yellow-500' },
  
  // International
  { id: 1875, name: 'BritBox', logo: 'BB', category: 'international', color: 'bg-blue-800' },
  { id: 1853, name: 'Acorn TV', logo: 'AC', category: 'international', color: 'bg-green-700' },
  { id: 1871, name: 'MHz Choice', logo: 'MH', category: 'international', color: 'bg-red-600' },
  { id: 1852, name: 'Walter Presents', logo: 'WP', category: 'international', color: 'bg-gray-700' },
  { id: 1784, name: 'Viki', logo: 'VK', category: 'international', color: 'bg-orange-500' },
  { id: 1785, name: 'AsianCrush', logo: 'AC', category: 'international', color: 'bg-red-500' },
  { id: 1786, name: 'Kocowa', logo: 'KW', category: 'international', color: 'bg-blue-600' },
  { id: 1787, name: 'Hi-YAH!', logo: 'HY', category: 'international', color: 'bg-yellow-600' },
  
  // Niche/Specialty
  { id: 283, name: 'Crunchyroll', logo: 'CR', category: 'niche', color: 'bg-orange-500' },
  { id: 1860, name: 'Funimation', logo: 'FU', category: 'niche', color: 'bg-purple-600' },
  { id: 1869, name: 'Shudder', logo: 'SH', category: 'niche', color: 'bg-red-800' },
  { id: 1854, name: 'Curiosity Stream', logo: 'CS', category: 'niche', color: 'bg-blue-500' },
  { id: 1872, name: 'MasterClass', logo: 'MC', category: 'niche', color: 'bg-gray-800' },
  { id: 1876, name: 'Hallmark Movies Now', logo: 'HM', category: 'niche', color: 'bg-pink-600' },
  { id: 1877, name: 'Pure Flix', logo: 'PF', category: 'niche', color: 'bg-blue-600' },
  { id: 1878, name: 'UP Faith & Family', logo: 'UP', category: 'niche', color: 'bg-green-600' },
  { id: 1788, name: 'Gaia', logo: 'GA', category: 'niche', color: 'bg-green-500' },
  { id: 1789, name: 'Dove Channel', logo: 'DV', category: 'niche', color: 'bg-blue-400' },
  { id: 1790, name: 'BET+', logo: 'BET', category: 'niche', color: 'bg-purple-600' },
  { id: 1791, name: 'Allblk', logo: 'AB', category: 'niche', color: 'bg-black' },
  { id: 1792, name: 'Brown Sugar', logo: 'BS', category: 'niche', color: 'bg-yellow-700' },
  { id: 1793, name: 'Screambox', logo: 'SB', category: 'niche', color: 'bg-red-700' },
  { id: 1794, name: 'Full Moon Features', logo: 'FM', category: 'niche', color: 'bg-purple-700' },
  { id: 1795, name: 'Midnight Pulp', logo: 'MP', category: 'niche', color: 'bg-gray-800' },
  
  // Additional Major Services
  { id: 1796, name: 'YouTube Premium', logo: 'YT', category: 'major', color: 'bg-red-600' },
  { id: 192, name: 'YouTube', logo: 'Y', category: 'free', color: 'bg-red-500' },
  { id: 3, name: 'Google Play Movies', logo: 'GP', category: 'major', color: 'bg-green-600' },
  { id: 68, name: 'Microsoft Store', logo: 'MS', category: 'major', color: 'bg-blue-600' },
  { id: 1797, name: 'Sling TV', logo: 'SL', category: 'major', color: 'bg-orange-600' },
  { id: 1798, name: 'Philo', logo: 'PH', category: 'major', color: 'bg-purple-500' },
]

const CATEGORY_LABELS = {
  major: 'Major Platforms',
  premium: 'Premium Networks',
  free: 'Free Services',
  sports: 'Sports',
  international: 'International',
  niche: 'Specialty & Niche'
}

const CATEGORY_ORDER = ['major', 'premium', 'free', 'sports', 'international', 'niche'] as const

interface StreamingFilterProps {
  selectedServices: number[]
  onServicesChange: (services: number[]) => void
  availableMoviesCount: number
  totalMoviesCount: number
}

export function StreamingFilter({ 
  selectedServices, 
  onServicesChange, 
  availableMoviesCount, 
  totalMoviesCount 
}: StreamingFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const toggleService = (serviceId: number) => {
    if (selectedServices.includes(serviceId)) {
      onServicesChange(selectedServices.filter(id => id !== serviceId))
    } else {
      onServicesChange([...selectedServices, serviceId])
    }
  }

  const clearAll = () => {
    onServicesChange([])
  }

  const selectCategory = (category: string) => {
    const categoryServices = COMPREHENSIVE_STREAMING_SERVICES
      .filter(s => s.category === category)
      .map(s => s.id)
    
    const newSelected = [...new Set([...selectedServices, ...categoryServices])]
    onServicesChange(newSelected)
  }

  const clearSearch = () => {
    setSearchQuery('')
  }

  // Filter services based on search query
  const filteredServices = COMPREHENSIVE_STREAMING_SERVICES.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group filtered services by category
  const groupedServices = CATEGORY_ORDER.reduce((acc, category) => {
    const services = filteredServices.filter(s => s.category === category)
    if (services.length > 0) {
      acc[category] = services
    }
    return acc
  }, {} as Record<string, StreamingService[]>)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors min-w-[200px]"
      >
        <Tv className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 text-left truncate">
          {selectedServices.length === 0 
            ? 'My Streaming Services' 
            : `${selectedServices.length} Service${selectedServices.length !== 1 ? 's' : ''} Selected`
          }
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {selectedServices.length > 0 && (
        <div className="absolute top-full left-0 mt-1 text-xs text-green-400 whitespace-nowrap">
          {availableMoviesCount} of {totalMoviesCount} movies available
        </div>
      )}

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-96 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">My Streaming Services</h3>
                <div className="flex gap-2">
                  <button
                    onClick={clearAll}
                    className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-gray-700"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search streaming services..."
                  className="w-full pl-10 pr-10 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Services List */}
            <div className="overflow-y-auto max-h-96">
              {Object.keys(groupedServices).length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  <Tv className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No streaming services found</p>
                </div>
              ) : (
                Object.entries(groupedServices).map(([category, services]) => (
                  <div key={category} className="p-4 border-b border-gray-700 last:border-b-0">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-300">
                        {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                      </h4>
                      <button
                        onClick={() => selectCategory(category)}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors px-2 py-1 rounded hover:bg-gray-700"
                      >
                        Select All
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {services.map((service) => {
                        const isSelected = selectedServices.includes(service.id)
                        
                        return (
                          <button
                            key={service.id}
                            onClick={() => toggleService(service.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                              isSelected 
                                ? 'bg-blue-600/20 border border-blue-500/30 shadow-sm' 
                                : 'bg-gray-700 hover:bg-gray-600'
                            }`}
                          >
                            <div className={`w-10 h-10 ${service.color} rounded-lg flex-shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                              {service.logo}
                            </div>
                            
                            <div className="flex-1 text-left min-w-0">
                              <p className="text-white text-sm font-medium truncate">{service.name}</p>
                              <p className="text-xs text-gray-400 capitalize">{service.category}</p>
                            </div>
                            
                            {isSelected && (
                              <div className="flex-shrink-0">
                                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                  <Check className="h-3 w-3 text-white" />
                                </div>
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-700 bg-gray-750">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">
                  {selectedServices.length} selected
                </span>
                {selectedServices.length > 0 && (
                  <span className="text-green-400 font-medium">
                    {availableMoviesCount} movies available
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Select the streaming services you have subscriptions to filter your watchlist.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}