'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Callout } from '@radix-ui/themes'
import { IconInfoCircle } from '@tabler/icons-react'
import { supabase } from '@/lib/supabaseClient'

const INPUT_CLASS =
  'w-full rounded-xl border border-green-200 bg-white px-3 py-2.5 text-sm text-gray-800 shadow-sm transition-all outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100'

const getMessageColor = (message: string) => {
  const lowerMessage = message.toLowerCase()
  return lowerMessage.includes('could not') || lowerMessage.includes('invalid') || lowerMessage.includes('match')
    ? 'red'
    : 'green'
}

const ResetPasswordPage = () => {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [recoveryReady, setRecoveryReady] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const hasRecoveryTokens = useMemo(() => {
    if (typeof window === 'undefined') {
      return false
    }

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const query = new URLSearchParams(window.location.search)
    return (
      hash.get('type') === 'recovery' ||
      query.get('type') === 'recovery' ||
      hash.has('access_token') ||
      query.has('access_token')
    )
  }, [])

  useEffect(() => {
    const initializeRecovery = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session || hasRecoveryTokens) {
        setRecoveryReady(true)
      }
    }

    void initializeRecovery()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || !!session) {
        setRecoveryReady(true)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [hasRecoveryTokens])

  useEffect(() => {
    if (!message) return

    const timer = setTimeout(() => {
      setMessage(null)
    }, 4000)

    return () => clearTimeout(timer)
  }, [message])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!recoveryReady) {
      setMessage('Open this page from the password reset email so we can verify your recovery session.')
      return
    }

    if (!password || password.length < 6) {
      setMessage('Choose a password with at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setMessage('Passwords must match before you can save the new one.')
      return
    }

    try {
      setLoading(true)
      setMessage(null)

      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        throw error
      }

      setMessage('Password updated. Redirecting you back to settings...')
      setPassword('')
      setConfirmPassword('')

      window.setTimeout(() => {
        router.push('/settings')
      }, 1200)
    } catch (err) {
      console.error(err)
      setMessage('We could not reset your password. Please request a new recovery email and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10 md:px-6">
      <div className="mx-auto max-w-2xl rounded-3xl border border-green-200 bg-white p-6 shadow-sm md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-700">Account Recovery</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-gray-900">Reset your password</h1>
        <p className="mt-2 text-sm text-gray-600">
          Use the recovery link from your email to securely choose a new password for your account.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-800">New Password</label>
            <input
              type="password"
              className={INPUT_CLASS}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-800">Confirm New Password</label>
            <input
              type="password"
              className={INPUT_CLASS}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          {message && (
            <Callout.Root color={getMessageColor(message)}>
              <Callout.Icon>
                <IconInfoCircle />
              </Callout.Icon>
              <Callout.Text>{message}</Callout.Text>
            </Callout.Root>
          )}

          {!recoveryReady && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              This page needs to be opened from the password reset email Supabase sends you.
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-green-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/settings" className="text-sm font-medium text-green-700 hover:text-green-800">
              Back to settings
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl bg-green-600 px-5 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Updating password...' : 'Save New Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ResetPasswordPage
