'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import UserNav from '../components/UserNav'

type Profile = {
  first_name: string
  last_name: string
  username: string
  reason: string | null
  avatar_url: string | null
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadUserAndProfile = async () => {
      setLoading(true)
      setError(null)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, username, reason, avatar_url')
        .eq('id', session.user.id)
        .maybeSingle()

      if (error) {
        console.error('Error loading profile: ', error)
        setError('There was a problem loading your profile')
        setLoading(false)
        return
      }

      if (!data) {
        setError('No profile found for this account')
        setLoading(false)
        return
      }

      setProfile(data as Profile)
      setLoading(false)
    }

    loadUserAndProfile()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-sm text-gray-500">Loading your dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white rounded-xl shadow p-6 max-w-md w-full text-center">
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="text-sm text-green-600 font-medium hover:text-green-800"
          >
            Go to login
          </button>
        </div>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <UserNav profile={profile} />
      <main>{children}</main>
    </div>
  )
}
