'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { IconArrowNarrowLeft, IconChecklist, IconLeaf, IconShieldCheck, IconSparkles } from '@tabler/icons-react'
import { supabase } from '@/lib/supabaseClient'
import { GENDER_OPTIONS, normalizeGenderValue } from '@/src/shared/profileGender'

type Condition = {
  id: string
  name: string
}

const INPUT_CLASS =
  'w-full rounded-2xl border border-green-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition-all placeholder:text-gray-400 focus:border-green-500 focus:ring-4 focus:ring-green-100'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [gender, setGender] = useState('')
  const [conditionId, setConditionId] = useState<string | ''>('')
  const [conditions, setConditions] = useState<Condition[]>([])
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const router = useRouter()

  useEffect(() => {
    const loadConditions = async () => {
      const { data, error: conditionsError } = await supabase
        .from('conditions')
        .select('id, name')
        .order('name', { ascending: true })

      if (conditionsError) {
        console.error('Error loading conditions:', conditionsError)
        return
      }

      setConditions((data ?? []) as Condition[])
    }

    void loadConditions()
  }, [])

  const handleSignup = () => {
    if (!email || !password || !confirmPassword || !username || !firstName || !lastName || !gender) {
      setError('Please fill in all required fields.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setError(null)
    setMessage(null)

    startTransition(async () => {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      const user = signUpData.user

      if (!user) {
        setMessage('Account created. Check your email for the next step.')
        return
      }

      const { error: profileError } = await supabase.from('profiles').insert({
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        username,
        gender: normalizeGenderValue(gender),
        condition_id: conditionId || null,
      })

      if (profileError) {
        console.error('Profile creation error:', profileError)
        setError(`Signed up, but we could not finish your profile: ${profileError.message}`)
        return
      }

      setMessage('Account created successfully. Redirecting to your dashboard...')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setFirstName('')
      setLastName('')
      setUsername('')
      setGender('')
      setConditionId('')

      setTimeout(() => {
        router.push('/dashboard')
      }, 900)
    })
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(187,247,208,0.65),_transparent_34%),linear-gradient(to_bottom,_#f7fdf8,_#f3f4f6)] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="overflow-hidden rounded-[2rem] border border-green-200 bg-gray-950 text-white shadow-[0_30px_90px_-45px_rgba(22,101,52,0.65)]">
          <div className="relative h-full p-8 md:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(74,222,128,0.24),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.08),_transparent_30%)]" />
            <div className="relative flex h-full flex-col justify-between gap-10">
              <div>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/85 transition-all hover:bg-white/10"
                >
                  <IconArrowNarrowLeft size={18} />
                  Back home
                </Link>

                <div className="mt-10 inline-flex items-center gap-3 rounded-full border border-green-400/25 bg-green-400/10 px-4 py-2 text-sm text-green-100">
                  <IconLeaf size={18} />
                  Start building your daily record
                </div>

                <h1 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight md:text-5xl">
                  Create your Tummer account in a calmer, cleaner flow.
                </h1>
                <p className="mt-5 max-w-lg text-base leading-8 text-gray-300">
                  Set up your profile, pick your condition, and get into tracking without extra noise or questions you do not need to answer.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <IconChecklist size={22} className="text-green-300" />
                  <p className="mt-4 text-sm font-medium">Simple onboarding</p>
                  <p className="mt-2 text-sm leading-6 text-gray-300">Only the core details needed to get started.</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <IconSparkles size={22} className="text-green-300" />
                  <p className="mt-4 text-sm font-medium">Track with clarity</p>
                  <p className="mt-2 text-sm leading-6 text-gray-300">Meals, health signals, and patterns in one place.</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <IconShieldCheck size={22} className="text-green-300" />
                  <p className="mt-4 text-sm font-medium">Account first</p>
                  <p className="mt-2 text-sm leading-6 text-gray-300">Your profile is created before you jump into the app.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-green-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-700">Sign Up</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">Create your account</h2>
              <p className="mt-3 text-sm leading-7 text-gray-600">
                Fill out the basics below and we&apos;ll take you straight to your dashboard.
              </p>
            </div>
            <div className="rounded-2xl bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-green-700 hover:text-green-900">
                Log in
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
              handleSignup()
            }}
            className="mt-8 space-y-6"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-800">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Choose a username"
                  className={INPUT_CLASS}
                />
              </div>

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
                <label className="text-sm font-medium text-gray-800">First name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="First name"
                  className={INPUT_CLASS}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-800">Last name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Last name"
                  className={INPUT_CLASS}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-800">Gender</label>
                <select
                  value={gender}
                  onChange={(event) => setGender(event.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="">Select gender</option>
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-800">Condition</label>
                <select
                  value={conditionId}
                  onChange={(event) => setConditionId(event.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="">Select a condition</option>
                  {conditions.map((condition) => (
                    <option key={condition.id} value={condition.id}>
                      {condition.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-800">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Create a password"
                  className={INPUT_CLASS}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-800">Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm your password"
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-sm leading-7 text-gray-500">
            By continuing, you agree to our{' '}
            <Link href="/terms" className="font-semibold text-gray-700 hover:text-green-700">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="font-semibold text-gray-700 hover:text-green-700">
              Privacy Policy
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
