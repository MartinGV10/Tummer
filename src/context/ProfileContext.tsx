'use client'

import { createContext, useContext, ReactNode } from 'react'

export type Profile = {
  first_name: string
  last_name: string
  username: string
  reason: string | null
  avatar_url: string | null
}

type ProfileContextValue = {
  profile: Profile
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined)

type ProfileProviderProps = {
  profile: Profile
  children: ReactNode
}

export function ProfileProvider({ profile, children }: ProfileProviderProps) {
  return (
    <ProfileContext.Provider value={{ profile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) {
    throw new Error('useProfile must be used inside a ProfileProvider')
  }
  return ctx.profile
}
