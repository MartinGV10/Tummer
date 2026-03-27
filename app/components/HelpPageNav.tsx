'use client'

import { useEffect, useState } from 'react'
import Nav from '@/app/Nav'
import UserNav from '@/app/components/UserNav'
import { supabase } from '@/lib/supabaseClient'

export default function HelpPageNav() {
  const [hasSession, setHasSession] = useState<boolean | null>(null)

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      setHasSession(Boolean(session))
    }

    void loadSession()

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session))
    })

    return () => {
      data.subscription.unsubscribe()
    }
  }, [])

  if (hasSession === null) {
    return <Nav />
  }

  return hasSession ? <UserNav /> : <Nav />
}
