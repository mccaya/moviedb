import React, { useState } from 'react'
import { Tv, ChevronDown, Check } from 'lucide-react'

interface StreamingService {
  id: number
  name: string
  logo: string
}

const POPULAR_STREAMING_SERVICES: StreamingService[] = [
  { id: 8, name: 'Netflix', logo: '/logos/netflix.png' },
  { id: 337, name: 'Disney Plus', logo: '/logos/disney-plus.png' },
  { id: 15, name: 'Hulu', logo: '/logos/hulu.png' },
  { id: 9, name: 'Amazon Prime Video', logo: '/logos/amazon-prime.png' },
  { id: 384, name: 'HBO Max', logo: '/logos/hbo-max.png' },
  { id: 531, name: 'Paramount Plus', logo: '/logos/paramount-plus.png' },
  { id: 350, name: 'Apple TV Plus', logo: '/logos/apple-tv.png' },
  { id: 283, name: 'Crunchyroll', logo: '/logos/crunchyroll.png' },
  { id: 386, name: 'Peacock', logo: '/logos/peacock.png' },
  { id: 387, name: 'Starz', logo: '/logos/starz.png' }
]

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

  const selectAll = () => {
    onServicesChange(POPULAR_STREAMING_SERVICES.map(s => s.id))
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
      >
        <Tv className="h-4 w-4" />
        <span>
          {selectedServices.length === 0 
            ? 'All Streaming Services' 
            : `${selectedServices.length} Service${selectedServices.length !== 1 ? 's' : ''}`
          }
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {selectedServices.length > 0 && (
        <div className="absolute top-full left-0 mt-1 text-xs text-green-400">
          {availableMoviesCount} of {totalMoviesCount} movies available
        </div>
      )}

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">My Streaming Services</h3>
              <div className="flex gap-2">
                <button
                  onClick={clearAll}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={selectAll}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Select All
                </button>
              </div>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {POPULAR_STREAMING_SERVICES.map((service) => {
                const isSelected = selectedServices.includes(service.id)
                
                return (
                  <button
                    key={service.id}
                    onClick={() => toggleService(service.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      isSelected 
                        ? 'bg-blue-600/20 border border-blue-500/30' 
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <div className="w-8 h-8 bg-white rounded flex-shrink-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-800">
                        {service.name.charAt(0)}
                      </span>
                    </div>
                    
                    <div className="flex-1 text-left">
                      <p className="text-white text-sm font-medium">{service.name}</p>
                    </div>
                    
                    {isSelected && (
                      <Check className="h-4 w-4 text-blue-400 flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-700">
              <p className="text-xs text-gray-400">
                Select the streaming services you have subscriptions to. 
                Only movies available on these services will be shown.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}