'use client'
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export type Food = {
  id: string
  user_id: string
  name: string
  category: string
  status: string
  notes: string | null
  severity: number | null
  common_symptoms: string | null
  last_reacted_at: string | null // dates come back as string from supabase
}

type FoodContextType = {
  food: Food[]
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  refreshFoods: () => Promise<void>
  updateFood: (foodId: string, data: Partial<Omit<Food, 'id' | 'user_id'>>) => Promise<void>
}

const FoodContext = createContext<FoodContextType | null>(null)

export function FoodProvider({ children }: { children: React.ReactNode }) {
  const [food, setFood] = useState<Food[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const loadFood = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setFood([])
        setIsAuthenticated(false)
        setLoading(false)
        return
      }

      setIsAuthenticated(true)

      const { data, error } = await supabase
        .from('user_foods')
        .select('id, user_id, name, category, status, notes, severity, common_symptoms, last_reacted_at')
        .eq('user_id', session.user.id)
        .eq('is_archived', false) // if you add this column
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading foods: ', error)
        setError('There was a problem loading your food')
        setFood([])
        setLoading(false)
        return
      }

      setFood((data ?? []) as Food[])

    } catch (err) {
      console.error('Unexpected error loading foods: ', err)
      setError('An unexpexted error occurred')
      setFood([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // initial load
    loadFood()

    const { data } = supabase.auth.onAuthStateChange((_event, _session) => {
      loadFood()
    })

    return () => {
      data?.subscription?.unsubscribe()
    }
  }, [loadFood])

  const updateFood: FoodContextType['updateFood'] = async (foodId, data) => {
    const { error } = await supabase
      .from('user_foods')
      .update(data)
      .eq('id', foodId)

    if (error) {
      console.error(error)
      throw error
    }

    setFood(prev => 
      prev.map(f => (f.id === foodId ? {...f, ...data } as Food : f))
    )
  }

  return (
    <FoodContext.Provider value={{ food, loading, error, isAuthenticated, updateFood, refreshFoods: loadFood }}>
      {children}
    </FoodContext.Provider>
  )
}

const useLogged = () => {
  const ctx = useContext(FoodContext)
  if (!ctx) throw new Error('useLoggged must be used within FoodProvider')
  return ctx
}

export default useLogged