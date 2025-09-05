import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      // Check if Supabase is properly configured before attempting signin
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || supabaseUrl === 'https://your-project.supabase.co' || !supabaseUrl.includes('supabase.co')) {
        return { 
          data: null, 
          error: { 
            message: 'Supabase URL not configured. Please set VITE_SUPABASE_URL in your .env file with your actual Supabase project URL.' 
          } 
        }
      }
      
      if (!supabaseAnonKey || supabaseAnonKey === 'your-anon-key' || supabaseAnonKey.length < 100) {
        return { 
          data: null, 
          error: { 
            message: 'Supabase anonymous key not configured. Please set VITE_SUPABASE_ANON_KEY in your .env file with your actual Supabase anonymous key.' 
          } 
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      return { data, error }
    } catch (err) {
      console.error('Signin error:', err)
      
      // Handle network/connection errors specifically
      if (err instanceof Error && err.message.includes('Failed to fetch')) {
        return { 
          data: null, 
          error: { 
            message: 'Cannot connect to Supabase. Please check your internet connection and verify that your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are correctly set in your .env file.' 
          } 
        }
      }
      
      return { 
        data: null, 
        error: { 
          message: err instanceof Error ? err.message : 'Sign in failed. Please check your Supabase configuration.' 
        } 
      }
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      // Check if Supabase is properly configured before attempting signup
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || supabaseUrl === 'https://your-project.supabase.co' || !supabaseUrl.includes('supabase.co')) {
        return { 
          data: null, 
          error: { 
            message: 'Supabase URL not configured. Please set VITE_SUPABASE_URL in your .env file with your actual Supabase project URL.' 
          } 
        }
      }
      
      if (!supabaseAnonKey || supabaseAnonKey === 'your-anon-key' || supabaseAnonKey.length < 100) {
        return { 
          data: null, 
          error: { 
            message: 'Supabase anonymous key not configured. Please set VITE_SUPABASE_ANON_KEY in your .env file with your actual Supabase anonymous key.' 
          } 
        }
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined // Explicitly disable email confirmation
        }
      })
      return { data, error }
    } catch (err) {
      console.error('Signup error:', err)
      
      // Handle network/connection errors specifically
      if (err instanceof Error && err.message.includes('Failed to fetch')) {
        return { 
          data: null, 
          error: { 
            message: 'Cannot connect to Supabase. Please check your internet connection and verify that your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are correctly set in your .env file.' 
          } 
        }
      }
      
      return { 
        data: null, 
        error: { 
          message: err instanceof Error ? err.message : 'Signup failed. Please check your Supabase configuration.' 
        } 
      }
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut
  }
}