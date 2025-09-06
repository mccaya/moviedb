import React from 'react'
import { Filter, SortAsc } from 'lucide-react'
import { StreamingFilter } from './StreamingFilter'

interface FilterBarProps {
  filter: 'all' | 'watched' | 'unwatched'
  sortBy: 'added' | 'title' | 'preference' | 'release'
  onFilterChange: (filter: 'all' | 'watched' | 'unwatched') => void
  onSortChange: (sort: 'added' | 'title' | 'preference' | 'release') => void
  totalMovies: number
  selectedStreamingServices: number[]
  onStreamingServicesChange: (services: number[]) => void
  availableStreamingMovies: number
}

export function FilterBar({ 
  filter, 
  sortBy, 
  onFilterChange, 
  onSortChange, 
  totalMovies,
  selectedStreamingServices,
  onStreamingServicesChange,
  availableStreamingMovies
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6 p-3 sm:p-4 bg-black/40 backdrop-blur-sm border border-gray-600/30 rounded-xl shadow-xl">
      <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-gray-400" />
        <span className="text-xs sm:text-sm text-gray-300">Filter:</span>
        <div className="flex gap-1 flex-wrap">
          {[
            { key: 'all', label: 'All' },
            { key: 'unwatched', label: 'To Watch' },
            { key: 'watched', label: 'Watched' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onFilterChange(key as any)}
              className={`px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm transition-all duration-300 ${
                filter === key
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg'
                  : 'bg-black/30 text-gray-300 hover:bg-black/50 border border-gray-600/30'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <SortAsc className="h-4 w-4 text-gray-400" />
        <span className="text-xs sm:text-sm text-gray-300">Sort by:</span>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as any)}
          className="px-2 sm:px-3 py-1 bg-black/40 backdrop-blur-sm border border-gray-600/50 rounded-lg text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
        >
          <option value="added">Date Added</option>
          <option value="title">Title</option>
          <option value="preference">My Preference</option>
          <option value="release">Release Date</option>
        </select>
      </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <StreamingFilter
            selectedServices={selectedStreamingServices}
            onServicesChange={onStreamingServicesChange}
            availableMoviesCount={availableStreamingMovies}
            totalMoviesCount={totalMovies}
          />
        </div>

      <div className="flex-1 flex items-center justify-center sm:justify-end">
        <span className="text-xs sm:text-sm text-gray-300">
          {totalMovies} movie{totalMovies !== 1 ? 's' : ''}
        </span>
      </div>
      </div>
    </div>
  )
}