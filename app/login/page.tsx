'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { IconArrowNarrowLeft, IconClockHour4, IconLeaf, IconLogin2, IconShieldLock } from '@tabler/icons-react'
import { supabase } from '@/lib/supabaseClient'

const INPUT_CLASS =
  'w-full rounded-2xl border border-green-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition-all placeholder:text-gray-400 focus:border-green-500 focus:ring-4 focus:ring-green-100'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        router.push('/dashboard')
      }
    }

    void checkSession()
  }, [router])

  const handleLogin = () => {
    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }

    setError(null)
    setMessage(null)

    startTransition(async () => {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message || 'Unable to sign in.')
        return
      }

      setMessage('Welcome back. Redirecting to your dashboard...')
      setEmail('')
      setPassword('')

      setTimeout(() => {
        router.push('/dashboard')
      }, 900)
    })
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(187,247,208,0.65),_transparent_34%),linear-gradient(to_bottom,_#f7fdf8,_#f3f4f6)] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[0.88fr_1.12fr]">
        <section className="overflow-hidden rounded-[2rem] border border-green-200 bg-linear-to-br from-green-600 via-green-700 to-emerald-900 text-white shadow-[0_30px_90px_-45px_rgba(22,101,52,0.65)]">
          <div className="relative h-full p-8 md:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(167,243,208,0.18),_transparent_30%)]" />
            <div className="relative flex h-full flex-col justify-between gap-10">
              <div>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white/90 transition-all hover:bg-white/15"
                >
                  <IconArrowNarrowLeft size={18} />
                  Back home
                </Link>

                <div className="mt-10 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white/90">
                  <IconLeaf size={18} />
                  Welcome back to Tummer
                </div>

                <h1 className="mt-6 text-4xl font-semibold tracking-tight md:text-5xl">
                  Pick up where your tracking left off.
                </h1>
                <p className="mt-5 max-w-lg text-base leading-8 text-green-50/90">
                  Sign in to review your dashboard, keep logging consistently, and stay close to the patterns you&apos;re building over time.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                  <IconClockHour4 size={22} />
                  <p className="mt-4 text-sm font-medium">Quick return</p>
                  <p className="mt-2 text-sm leading-6 text-white/80">Get back to meals, symptoms, and routines without friction.</p>
                </div>
                <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                  <IconShieldLock size={22} />
                  <p className="mt-4 text-sm font-medium">Secure sign-in</p>
                  <p className="mt-2 text-sm leading-6 text-white/80">Your account uses Supabase authentication behind the scenes.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-green-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-700">Log In</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">Sign in to your account</h2>
              <p className="mt-3 text-sm leading-7 text-gray-600">
                Enter your email and password to jump back into your dashboard.
              </p>
            </div>
            <div className="rounded-2xl bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
              New here?{' '}
              <Link href="/signup" className="font-semibold text-green-700 hover:text-green-900">
                Create an account
              </Link>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {message ? (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {message}
              </div>
            ) : null}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              handleLogin()
            }}
            className="mt-8 space-y-5"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-800">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className={INPUT_CLASS}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-800">Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className={INPUT_CLASS}
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-gray-950 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              <IconLogin2 size={18} className="mr-2" />
              {isPending ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          <p className="mt-6 text-sm leading-7 text-gray-500">
            Need an account first?{' '}
            <Link href="/signup" className="font-semibold text-gray-700 hover:text-green-700">
              Sign up here
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
