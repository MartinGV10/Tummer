'use client'
import React, { useState, useEffect, useTransition } from 'react'
import { IconArrowNarrowLeft, IconLeaf } from '@tabler/icons-react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        router.push('/dashboard')
      }
    }
    checkSession()
  }, [router])

  const handleLogin = () => {
    if (!email || !password) {
      setError('Please enter your email and password')
      return
    }

    setError(null)
    setMessage(null)

    startTransition(async () =>  {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        setError(error.message || 'Unable to sign in')
        return
      }

      setMessage('Welcome Back! Redirecting...')
      setEmail('')
      setPassword('')

      setTimeout(() => {
        router.push('/dashboard')
      }, 800);
    })
  }

  const clearError = () => {
    if (error) setError(null)
  }

  return (
    <div className='min-h-screen flex flex-col items-center justify-center space-y-7 bg-gray-100'>
      <div className='w-full max-w-lg space-y-4 p-10 box-content bg-green-50 shadow-lg rounded-2xl'>
        <h1 className='text-3xl font-medium text-center text-green-600 flex justify-center items-center gap-2'>Tummer <IconLeaf size={30}></IconLeaf></h1>
        <h1 className='text-2xl font-semibold text-center'>Log in</h1>

        {error && (
          <div className='w-full rounded-lg bg-red-100 border border-red-300 text-red-700 px-4 py-2 text-sm text-center'>{error}</div>
        )}
        
        <div className='flex space-x-5 justify-around'>
          <div className='flex flex-col space-y-3 w-full'>
            <input type="email" placeholder='Email' value={email} onKeyDown={e => e.key === 'Enter' && handleLogin()} onChange={e => setEmail(e.target.value)} className='shadow-lg w-full bg-gray-50 border-2 rounded-lg p-2 font-medium border-green-600'/>
            <input type="password" placeholder='Password' value={password} onKeyDown={e => e.key === 'Enter' && handleLogin()} onChange={e => setPassword(e.target.value)} className='shadow-lg w-full bg-gray-50 border-2 rounded-lg p-2 font-medium border-green-600'/>
          </div>
        </div>

        <button onClick={handleLogin} disabled={isPending} className='font-medium text-lg shadow-lg transition-all cursor-pointer w-full bg-green-600 hover:bg-green-700 text-white rounded-lg p-2 disabled:opacity-50'>
          {isPending ? 'Logging in...' : 'Log in'}
        </button>

        {message && (
          <p className='text-sm text-center text-gray-600'>{message}</p>
        )}

        <p className='transition-all w-full p-2 flex items-center justify-center gap-2'>
          Don't have an account?
          <a href="/signup" className='cursor-pointer text-green-600 font-semibold hover:text-green-800 transition-all'>Sign up!</a>
        </p>
      </div>

      <a href="/" className='flex hover:text-green-600 transition-all'><IconArrowNarrowLeft></IconArrowNarrowLeft>Go back home</a>

    </div>
  )
}

export default Login