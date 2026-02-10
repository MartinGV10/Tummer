'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import UserNav from '../components/UserNav'
import { useProfile } from '@/src/context/ProfileContext'

export default function TrackMealsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { profile, loading, error, isAuthenticated } = useProfile()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [loading, isAuthenticated, router])

  if (loading && !profile && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-sm text-gray-500">Loading your Meals...</p>
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
      <UserNav />
      <main>{children}</main>
    </div>
  )
}
