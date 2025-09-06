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
      console.log('🔄 Starting signup process for:', email)
      
      // Check if Supabase is properly configured before attempting signup
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || supabaseUrl === 'https://your-project.supabase.co' || !supabaseUrl.includes('supabase.co')) {
        console.error('❌ Supabase URL not configured')
        return { 
          data: null, 
          error: { 
            message: 'Supabase URL not configured. Please set VITE_SUPABASE_URL in your .env file with your actual Supabase project URL.' 
          } 
        }
      }
      
      if (!supabaseAnonKey || supabaseAnonKey === 'your-anon-key' || supabaseAnonKey.length < 100) {
        console.error('❌ Supabase anonymous key not configured')
        return { 
          data: null, 
          error: { 
            message: 'Supabase anonymous key not configured. Please set VITE_SUPABASE_ANON_KEY in your .env file with your actual Supabase anonymous key.' 
          } 
        }
      }

      console.log('✅ Supabase configuration validated')
      console.log('📡 Calling Supabase signup...')

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined // Explicitly disable email confirmation
        }
      })
      
      console.log('📋 Supabase signup response:', {
        hasUser: !!data.user,
        hasError: !!error,
        errorMessage: error?.message,
        userId: data.user?.id,
        userEmail: data.user?.email
      })
      
      // If signup was successful, trigger webhook
      if (data.user && !error) {
        console.log('✅ Signup successful, preparing webhook...')
        
        try {
          console.log('🔍 Checking webhook configuration...')
          
          const webhookUrl = import.meta.env.VITE_SIGNUP_WEBHOOK_URL
          console.log('🌐 Webhook URL from env:', webhookUrl ? `${webhookUrl.substring(0, 30)}...` : 'NOT SET')
          
          if (!webhookUrl) {
            console.warn('⚠️ VITE_SIGNUP_WEBHOOK_URL not configured - skipping webhook')
            console.warn('💡 To enable webhooks, add VITE_SIGNUP_WEBHOOK_URL=https://your-webhook-url.com to your .env file')
          } else {
            console.log('✅ Webhook URL configured, preparing payload...')
            
            const webhookPayload = {
              event: 'user.signup',
              email: data.user.email,
              user_id: data.user.id,
              created_at: data.user.created_at,
              timestamp: new Date().toISOString(),
              source: 'filmfolio'
            }
            
            console.log('📦 Webhook payload prepared:', {
              event: webhookPayload.event,
              email: webhookPayload.email,
              user_id: webhookPayload.user_id?.substring(0, 8) + '...',
              source: webhookPayload.source
            })
            
            console.log('🚀 Sending POST request to webhook...')
            console.log('🎯 Target URL:', webhookUrl)
            
            const webhookResponse = await fetch(webhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'FilmFolio-Signup-Webhook/1.0',
              },
              body: JSON.stringify(webhookPayload),
              mode: 'cors' // Explicitly set CORS mode
            })
            
            console.log('📡 Webhook response received:', {
              status: webhookResponse.status,
              statusText: webhookResponse.statusText,
              ok: webhookResponse.ok,
              headers: Object.fromEntries(webhookResponse.headers.entries())
            })
            
            if (webhookResponse.ok) {
              const responseText = await webhookResponse.text()
              console.log('✅ Webhook sent successfully!')
              console.log('📄 Response body:', responseText)
            } else {
              const errorText = await webhookResponse.text()
              console.error('❌ Webhook failed with error:', {
                status: webhookResponse.status,
                statusText: webhookResponse.statusText,
                response: errorText
              })
            }
          }
        } catch (webhookError) {
          // Don't fail the signup if webhook fails
          console.error('❌ Exception occurred while sending webhook:', {
            name: webhookError.name,
            message: webhookError.message,
            stack: webhookError.stack
          })
          
          // Check for specific error types
          if (webhookError.name === 'TypeError' && webhookError.message.includes('Failed to fetch')) {
            console.error('🌐 Network error: Could not reach webhook URL')
            console.error('💡 Check if the webhook URL is accessible and supports CORS')
          }
        }
      } else {
        console.log('❌ Signup failed or no user created, skipping webhook')
        if (error) {
          console.error('🚫 Signup error details:', error)
        }
      }
      
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