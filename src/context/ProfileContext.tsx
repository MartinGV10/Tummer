'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export type Profile = {
  id: string
  first_name: string
  last_name: string
  username: string
  reason: string | null
  avatar_url: string | null
}

type ProfileContextType = {
  profile: Profile | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  refreshProfile: () => Promise<void>
  updateProfile: (data: Partial<Profile>) => Promise<void>
}

const ProfileContext = createContext<ProfileContextType | null>(null)

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const loadProfile = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setProfile(null)
        setIsAuthenticated(false)
        setLoading(false)
        return
      }

      setIsAuthenticated(true)

      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username, reason, avatar_url')
        .eq('id', session.user.id)
        .maybeSingle()

      if (error) {
        console.error('Error loading profile: ', error)
        setError('There was a problem loading your profile')
        setProfile(null)
        setLoading(false)
        return
      }

      if (!data) {
        setError('No profile found for this account')
        setProfile(null)
        setLoading(false)
        return
      }

      setProfile(data as Profile)
      setError(null)
    } catch (err) {
      console.error('Unexpected error loading profile:', err)
      setError('An unexpected error occurred')
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // initial load
    loadProfile()

    // refresh profile when auth state changes (login/logout)
    const { data } = supabase.auth.onAuthStateChange((_event, _session) => {
      loadProfile()
    })

    // cleanup subscription on unmount
    return () => {
      try {
        // v2 returns a subscription object under `data.subscription` or `data`
        // support both shapes defensively
        // @ts-ignore
        if (data?.subscription?.unsubscribe) data.subscription.unsubscribe()
        // @ts-ignore
        else if (data?.unsubscribe) data.unsubscribe()
      } catch (e) {
        // ignore cleanup errors
      }
    }
  }, [loadProfile])

  const updateProfile = async (data: Partial<Profile>) => {
    if (!profile) {
      return
    }

    const { error } = await supabase.from('profiles').update(data).eq('id', profile.id)

    if (error) {
      console.error(error)
      throw error
    }

    setProfile(prev => (prev ? { ...prev, ...data } : prev))
  }

  return (
    <ProfileContext.Provider value={{ profile, loading, error, isAuthenticated, updateProfile, refreshProfile: loadProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export const useProfile = () => {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider')
  return ctx
}
