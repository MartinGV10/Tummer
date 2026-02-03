'use client'
import React, { useEffect, useState, useTransition } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { IconArrowNarrowLeft, IconLeaf } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'

type Condition = {
  id: string
  name: string
}

const Signup = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confPass, setConfPass] = useState('')
  const [firstname, setFirstname] = useState('')
  const [lastname, setLastname] = useState('')
  const [username, setUsername] = useState('')
  const [conditionId, setConditionId] = useState<string | ''>('')
  const [reason, setReason] = useState('')

  const [conditions, setConditions] = useState<Condition[]>([])
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const router = useRouter()

  useEffect(() => {
    const loadConditions = async () => {
      const { data, error } = await supabase
        .from('conditions')
        .select('id, name')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error loading conditions:', error)
        return
      }

      if (data) {
        setConditions(data)
      }
    }

    loadConditions()
  }, [])

  const handleSignup = () => {
    if (!email || !password || !username || !firstname || !lastname) {
      setError('Please fill in the required fields')
      return
    }

    if (password !== confPass) {
      setError('Passwords do not match')
      return
    }

    setError(null)
    setMessage(null)

    startTransition(async () => {
      // Create auth user
      const {
        data: signUpData,
        error: signUpError
      } = await supabase.auth.signUp({
        email, password
      })

      if (signUpError) {
        setError(signUpError.message)
      }

      const user = signUpData.user

      if (!user) {
        setMessage('Account created!')
        return
      }

      // Create profile row in db
      const { error: profileError } = await supabase.from('profiles').insert({
        id: user.id,
        first_name: firstname,
        last_name: lastname,
        username,
        condition_id: conditionId || null,
        reason: reason || null
      })

      if (profileError) {
        console.error('Profile creation error: ', profileError)
        setError('Signed up, but there was an issue creating your profile: ' + profileError.message)
        return
      }

      setMessage('Account created successfully')
      setEmail('')
      setFirstname('')
      setLastname('')
      setPassword('')
      setReason('')
      setUsername('')
      setReason('')
      setConditionId('')
      
      setTimeout(() => {
        router.push('/dashboard')
      }, 800);
    })

  }

  return (
    <div className='min-h-screen flex flex-col items-center justify-center space-y-7 bg-gray-100'>
      <div className='w-full max-w-lg space-y-4 p-10 box-content bg-green-50 shadow-lg rounded-2xl'>
        <h1 className='text-3xl font-medium text-center text-green-600 flex justify-center items-center gap-2'>Tummer <IconLeaf size={30}></IconLeaf></h1>
        <h1 className='text-2xl font-semibold text-center'>Create an Account</h1>

        {error && (
          <div className='w-full rounded-lg bg-red-100 border border-red-300 text-red-700 px-4 py-2 text-sm text-center'>{error}</div>
        )}
        
        <div className='flex space-x-5 justify-around'>
          <div className='flex flex-col space-y-3 w-full'>
            <input type="text" placeholder='Username' value={username} onKeyDown={e => e.key === 'Enter' && handleSignup()} onChange={e => setUsername(e.target.value)} className='shadow-lg w-full bg-gray-50 border-2 rounded-lg p-2 font-medium border-green-600'/>
            <input type="text" placeholder='First Name' value={firstname} onKeyDown={e => e.key === 'Enter' && handleSignup()} onChange={e => setFirstname(e.target.value)} className='shadow-lg w-full bg-gray-50 border-2 rounded-lg p-2 font-medium border-green-600'/>
            <input type="text" placeholder='Last Name' value={lastname} onKeyDown={e => e.key === 'Enter' && handleSignup()} onChange={e => setLastname(e.target.value)} className='shadow-lg w-full bg-gray-50 border-2 rounded-lg p-2 font-medium border-green-600'/>
            <select value={conditionId} onChange={e => setConditionId(e.target.value)} className='shadow-lg w-full bg-gray-50 border-2 rounded-lg p-2 font-medium border-green-600'>
              <option value="">Select a Condition</option>
                {conditions.map(cond => (
                  <option key={cond.id} value={cond.id}>{cond.name}</option>
                ))}
            </select>
          </div>

          <div className='flex flex-col space-y-3 w-full'>
            <input type="text" placeholder='Reason for using' value={reason} onKeyDown={e => e.key === 'Enter' && handleSignup()} onChange={e => setReason(e.target.value)} className='shadow-lg w-full bg-gray-50 border-2 rounded-lg p-2 font-medium border-green-600'/>
            <input type="email" placeholder='Email' value={email} onKeyDown={e => e.key === 'Enter' && handleSignup()} onChange={e => setEmail(e.target.value)} className='shadow-lg w-full bg-gray-50 border-2 rounded-lg p-2 font-medium border-green-600'/>
            <input type="password" placeholder='Password' value={password} onKeyDown={e => e.key === 'Enter' && handleSignup()} onChange={e => setPassword(e.target.value)} className='shadow-lg w-full bg-gray-50 border-2 rounded-lg p-2 font-medium border-green-600'/>
            <input type="password" placeholder='Confirm Password' value={confPass} onKeyDown={e => e.key === 'Enter' && handleSignup()} onChange={e => setConfPass(e.target.value)} className='shadow-lg w-full bg-gray-50 border-2 rounded-lg p-2 font-medium border-green-600'/>
          </div>
        </div>

        <button onClick={handleSignup} disabled={isPending} className='font-medium text-lg shadow-lg transition-all cursor-pointer w-full bg-green-600 hover:bg-green-700 text-white rounded-lg p-2 disabled:opacity-50'>
          {isPending ? 'Creating account…' : 'Sign up'}
        </button>

        {message && (
          <p className='text-sm text-center text-gray-600'>{message}</p>
        )}

        <p className='transition-all w-full p-2 flex items-center justify-center gap-2'>
          Already have an account?
          <a href="/login" className='cursor-pointer text-green-600 font-semibold hover:text-green-800 transition-all'>Sign in!</a>
        </p>
      </div>

      <p className='text-sm text-center text-green-600'>By continuing, you agree to our Terms of Service and Privacy Policy</p>
      <a href="/" className='flex hover:text-green-600 transition-all'><IconArrowNarrowLeft></IconArrowNarrowLeft>Go back home</a>

    </div>
  )
}

export default Signup