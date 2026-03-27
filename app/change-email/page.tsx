'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Callout } from '@radix-ui/themes'
import { IconInfoCircle } from '@tabler/icons-react'
import { supabase } from '@/lib/supabaseClient'

const INPUT_CLASS =
  'w-full rounded-xl border border-green-200 bg-white px-3 py-2.5 text-sm text-gray-800 shadow-sm transition-all outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100'

const getMessageColor = (message: string) => {
  const lowerMessage = message.toLowerCase()
  return lowerMessage.includes('could not') || lowerMessage.includes('invalid') || lowerMessage.includes('already')
    ? 'red'
    : 'green'
}

const ChangeEmailPage = () => {
  const [currentEmail, setCurrentEmail] = useState('')
  const [nextEmail, setNextEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const loadEmail = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      setCurrentEmail(user?.email ?? '')
    }

    void loadEmail()
  }, [])

  useEffect(() => {
    if (!message) return

    const timer = setTimeout(() => {
      setMessage(null)
    }, 4000)

    return () => clearTimeout(timer)
  }, [message])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nextEmail) {
      setMessage('Enter the new email address you want to use.')
      return
    }

    if (nextEmail === currentEmail) {
      setMessage('Enter a different email address from your current one.')
      return
    }

    try {
      setLoading(true)
      setMessage(null)

      const { error } = await supabase.auth.updateUser({ email: nextEmail })

      if (error) {
        throw error
      }

      setMessage('Email change requested. Check your inbox for the confirmation steps from Supabase.')
      setNextEmail('')
    } catch (err) {
      console.error(err)
      setMessage('We could not start the email change right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10 md:px-6">
      <div className="mx-auto max-w-2xl rounded-3xl border border-green-200 bg-white p-6 shadow-sm md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-700">Account Email</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-gray-900">Change your email</h1>
        <p className="mt-2 text-sm text-gray-600">
          Request a new email for your account and finish the confirmation steps Supabase sends you.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-800">Current Email</label>
            <input type="email" className={`${INPUT_CLASS} bg-gray-50 text-gray-500`} value={currentEmail} readOnly />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-800">New Email</label>
            <input
              type="email"
              className={INPUT_CLASS}
              value={nextEmail}
              onChange={(e) => setNextEmail(e.target.value)}
              autoComplete="email"
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

          <div className="rounded-2xl border border-green-100 bg-green-50/70 px-4 py-3 text-sm text-gray-700">
            Supabase may require confirmation before the new email fully replaces the old one, depending on your project auth settings.
          </div>

          <div className="flex flex-col gap-3 border-t border-green-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/settings" className="text-sm font-medium text-green-700 hover:text-green-800">
              Back to settings
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl bg-green-600 px-5 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Sending confirmation...' : 'Request Email Change'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ChangeEmailPage
