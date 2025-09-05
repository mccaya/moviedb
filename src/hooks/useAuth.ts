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
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  }

  const signUp = async (email: string, password: string) => {
    try {
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
      
      // Check if it's a configuration error
      if (err instanceof Error && err.message.includes('Missing Supabase configuration')) {
        return { 
          data: null, 
          error: { 
            message: 'Supabase is not configured. Please set up your environment variables in the .env file.' 
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