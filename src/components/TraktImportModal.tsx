// components/ImportModal.tsx
import { useState } from 'react'
import { Upload, X, FileText, Loader2, CheckCircle, AlertCircle, List, ChevronRight } from 'lucide-react'
import { tmdbAPI } from '../lib/tmdb'
import { TraktImportModal } from './TraktImportModal'

interface Movie {
  id: string
  user_id: string
  tmdb_id: number
  title: string
  poster_path: string | null
  overview: string | null
  release_date: string | null
  rating: number | null
  genres: string[]
  watched: boolean
  personal_rating: number | null
  added_at: string
  user_preference: string | null
}

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (movies: any[]) => Promise<void>
  watchlistMovies?: Movie[]
  onRemoveMovie?: (id: string) => Promise<void>
}

type ImportMethod = 'csv' | 'trakt' | null

export function ImportModal({ 
  isOpen, 
  onClose, 
  onImport, 
  watchlistMovies = [], 
  onRemoveMovie = async () => {} 
}: ImportModalProps) {
  const [importMethod, setImportMethod] = useState<ImportMetho