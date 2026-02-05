'use client'

import { createContext, useContext, useEffect, useState } from 'react'
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
}

const ProfileContext = createContext<ProfileContextType | null>(null)

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const loadProfile = async () => {
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
  }

  useEffect(() => {
    loadProfile()
  }, [])

  return (
    <ProfileContext.Provider value={{ profile, loading, error, isAuthenticated, refreshProfile: loadProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export const useProfile = () => {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider')
  return ctx
}
