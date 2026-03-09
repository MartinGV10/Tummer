'use client'
import { useRouter } from 'next/navigation'
import React, { useEffect } from 'react'
import UserNav from '../components/UserNav'
import { useProfile } from '@/src/context/ProfileContext'

export default function HealthLayout({
  children,
} : {
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
        <p className="text-sm text-gray-500">Loading support options...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <UserNav />
      <main>{children}</main>
    </div>
  )
}