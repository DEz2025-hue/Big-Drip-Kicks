import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface Profile {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'staff' | 'cashier'
  is_active: boolean
}

interface SupabaseError extends Error {
  code?: string
  details?: string
  hint?: string
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('AuthProvider: Starting authentication check...')
    
    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('AuthProvider: Loading timeout reached, setting loading to false')
      setLoading(false)
    }, 10000) // 10 second timeout
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('AuthProvider: Session check result:', { session: !!session, error })
      
      if (error) {
        console.error('AuthProvider: Session check error:', error)
        clearTimeout(timeoutId)
        setLoading(false)
        return
      }
      
      setUser(session?.user ?? null)
      if (session?.user) {
        console.log('AuthProvider: User found, fetching profile...')
        fetchProfile(session.user.id).finally(() => {
          clearTimeout(timeoutId)
        })
      } else {
        console.log('AuthProvider: No user found, setting loading to false')
        clearTimeout(timeoutId)
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthProvider: Auth state change:', event, { user: !!session?.user })
        
        if (event === 'SIGNED_OUT') {
          console.log('AuthProvider: User signed out, clearing state')
          setUser(null)
          setProfile(null)
          setLoading(false)
        } else {
          setUser(session?.user ?? null)
          if (session?.user) {
            await fetchProfile(session.user.id)
          } else {
            setProfile(null)
            setLoading(false)
          }
        }
      }
    )

    return () => {
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const fetchProfile = async (userId: string) => {
    console.log('AuthProvider: Fetching profile for user:', userId)
    
    // Add a timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
    })
    
    try {
      console.log('AuthProvider: Making database query...')
      
      const queryPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as { data: Profile | null; error: Error | null }
      const { data, error } = result

      console.log('AuthProvider: Database query completed')
      console.log('AuthProvider: Query result:', { data, error })

      if (error) {
        const supabaseError = error as SupabaseError
        console.error('AuthProvider: Profile fetch error:', error)
        console.error('AuthProvider: Error details:', {
          code: supabaseError.code,
          message: error.message,
          details: supabaseError.details,
          hint: supabaseError.hint
        })
        
        // If profile doesn't exist, we should still stop loading
        if (supabaseError.code === 'PGRST116') {
          console.log('AuthProvider: Profile not found for user, creating one...')
          // Try to create a profile for the user
          await createProfile(userId)
          return
        }
        throw error
      }
      
      console.log('AuthProvider: Profile fetched successfully:', data)
      setProfile(data)
    } catch (error: unknown) {
      console.error('AuthProvider: Error fetching profile:', error)
      if (error instanceof Error && error.message === 'Profile fetch timeout') {
        console.error('AuthProvider: Profile fetch timed out after 5 seconds')
      }
      
      // Instead of setting profile to null (which causes logout),
      // create a temporary profile so the user can still access the app
      console.log('AuthProvider: Creating temporary profile due to fetch error')
      
      // Create a simple temporary profile using the userId we already have
      const tempProfile: Profile = {
        id: userId,
        email: 'user@example.com', // We'll update this later if needed
        full_name: 'User',
        role: 'cashier', // Default role
        is_active: true
      }
      console.log('AuthProvider: Using temporary profile due to fetch error:', tempProfile)
      setProfile(tempProfile)
    } finally {
      console.log('AuthProvider: Setting loading to false')
      setLoading(false)
    }
  }

  const createProfile = async (userId: string) => {
    try {
      console.log('AuthProvider: Creating profile for user:', userId)
      const { data: userData } = await supabase.auth.getUser()
      
      if (!userData.user) {
        console.error('AuthProvider: No user data available for profile creation')
        setLoading(false)
        return
      }

      // Since there might be RLS restrictions, let's try to create a profile
      // using the service role key or by calling a function
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: userData.user.email || '',
          full_name: userData.user.user_metadata?.full_name || 'Unknown User',
          role: 'cashier', // Default role
          is_active: true
        })
        .select()
        .single()

      if (error) {
        console.error('AuthProvider: Error creating profile:', error)
        // If we can't create a profile due to RLS, we'll create a temporary profile object
        // This is a workaround until we can fix the RLS policies
        const tempProfile: Profile = {
          id: userId,
          email: userData.user.email || '',
          full_name: userData.user.user_metadata?.full_name || 'Unknown User',
          role: 'cashier',
          is_active: true
        }
        console.log('AuthProvider: Using temporary profile due to RLS restrictions:', tempProfile)
        setProfile(tempProfile)
      } else {
        console.log('AuthProvider: Profile created successfully:', data)
        setProfile(data)
      }
    } catch (error) {
      console.error('AuthProvider: Error in createProfile:', error)
      // Create a temporary profile as fallback
      const { data: userData } = await supabase.auth.getUser()
      if (userData.user) {
        const tempProfile: Profile = {
          id: userId,
          email: userData.user.email || '',
          full_name: userData.user.user_metadata?.full_name || 'Unknown User',
          role: 'cashier',
          is_active: true
        }
        console.log('AuthProvider: Using temporary profile as fallback:', tempProfile)
        setProfile(tempProfile)
      } else {
        setProfile(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    console.log('AuthProvider: Attempting sign in for:', email)
    setLoading(true) // Set loading to true when signing in
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        console.error('AuthProvider: Sign in error:', error)
        setLoading(false)
        return { error: error instanceof Error ? error : new Error(String(error)) }
      }
      
      console.log('AuthProvider: Sign in successful:', data)
      
      // If sign in is successful, the onAuthStateChange listener will handle the rest
      return { error: null }
    } catch (error) {
      console.error('AuthProvider: Unexpected sign in error:', error)
      setLoading(false)
      return { error: error instanceof Error ? error : new Error(String(error)) }
    }
  }

  const signOut = async () => {
    console.log('AuthProvider: Signing out...')
    await supabase.auth.signOut()
  }

  const value = {
    user,
    profile,
    loading,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}