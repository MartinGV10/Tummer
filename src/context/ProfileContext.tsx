'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { persistConditionRef, resolveConditionRef } from '@/src/shared/conditionRefs'
import { normalizeGenderValue } from '@/src/shared/profileGender'

export type Profile = {
  id: string
  first_name: string
  last_name: string
  username: string
  condition_id: string | null
  condition_ref_id?: string | null
  gender: string | null
  reason: string | null
  avatar_url: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: string | null
  subscription_price_id: string | null
  current_period_end: string | null
  is_premium: boolean
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
        .select('id, first_name, last_name, username, condition_id, gender, reason, avatar_url, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_price_id, current_period_end, is_premium')
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

      const rawProfile = data as Profile
      const resolvedCondition = await resolveConditionRef(supabase, rawProfile.condition_id)

      setProfile({
        ...rawProfile,
        condition_id: resolvedCondition.actualConditionId,
        condition_ref_id: resolvedCondition.storedConditionId,
        gender: normalizeGenderValue(rawProfile.gender),
      })
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
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        setProfile(null)
        setIsAuthenticated(false)
        setError(null)
        setLoading(false)
        return
      }

      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        void loadProfile()
      }
    })

    // cleanup subscription on unmount
    return () => {
      try {
        const subscriptionContainer = data as
          | { subscription?: { unsubscribe?: () => void }; unsubscribe?: () => void }
          | undefined

        if (subscriptionContainer?.subscription?.unsubscribe) subscriptionContainer.subscription.unsubscribe()
        else if (subscriptionContainer?.unsubscribe) subscriptionContainer.unsubscribe()
      } catch {
        // ignore cleanup errors
      }
    }
  }, [loadProfile])

  const updateProfile = async (data: Partial<Profile>) => {
    if (!profile) {
      return
    }

    const nextConditionId = data.condition_id === undefined ? undefined : data.condition_id
    const storedConditionId =
      nextConditionId === undefined
        ? undefined
        : await persistConditionRef(supabase, profile.id, nextConditionId)

    const nextValues = {
      ...data,
      condition_id: storedConditionId,
      gender: data.gender === undefined ? undefined : normalizeGenderValue(data.gender),
    }

    const payload = Object.fromEntries(
      Object.entries(nextValues).filter(([, value]) => value !== undefined)
    ) as Partial<Profile>

    const { error } = await supabase.from('profiles').update(payload).eq('id', profile.id)

    if (error) {
      console.error(error)
      throw error
    }

    setProfile((prev) => (
      prev
        ? {
            ...prev,
            ...payload,
            condition_id: nextConditionId === undefined ? prev.condition_id : nextConditionId,
            condition_ref_id: storedConditionId === undefined ? prev.condition_ref_id : storedConditionId,
          }
        : prev
    ))
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
