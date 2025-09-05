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
    <div className="flex flex-col gap-4 mb-6 p-4 bg-gray-800 rounded-xl">
      <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-400">Filter:</span>
        <div className="flex gap-1">
          {[
            { key: 'all', label: 'All' },
            { key: 'unwatched', label: 'To Watch' },
            { key: 'watched', label: 'Watched' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onFilterChange(key as any)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                filter === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <SortAsc className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-400">Sort by:</span>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as any)}
          className="px-3 py-1 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="added">Date Added</option>
          <option value="title">Title</option>
          <option value="preference">My Preference</option>
          <option value="release">Release Date</option>
        </select>
      </div>

        <div className="flex items-center gap-2">
          <StreamingFilter
            selectedServices={selectedStreamingServices}
            onServicesChange={onStreamingServicesChange}
            availableMoviesCount={availableStreamingMovies}
            totalMoviesCount={totalMovies}
          />
        </div>

      <div className="flex-1 flex items-center justify-end">
        <span className="text-sm text-gray-400">
          {totalMovies} movie{totalMovies !== 1 ? 's' : ''}
        </span>
      </div>
      </div>
    </div>
  )
}