'use client'
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export type Meal = {
  id: string
  user_id: string
  meal_name: string
  meal_type: string // 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other'
  eaten_at: string // Supabase returns timestamptz as string
  notes: string | null
  created_at: string
  updated_at: string
}

type MealsContextType = {
  meals: Meal[]
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  refreshMeals: () => Promise<void>
  addMeal: (data: {
    meal_name: string
    meal_type?: string
    eaten_at?: string | Date
    notes?: string | null
  }) => Promise<Meal | null>
  updateMeal: (
    mealId: string,
    data: Partial<Pick<Meal, 'meal_name' | 'meal_type' | 'eaten_at' | 'notes'>>
  ) => Promise<void>
  deleteMeal: (mealId: string) => Promise<void>
}

const MealsContext = createContext<MealsContextType | null>(null)

export function MealProvider({ children }: { children: React.ReactNode }) {
	const [meals, setMeals] = useState<Meal[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [isAuthenticated, setIsAuthenticated] = useState(false) 
	const [userId, setUserId] = useState<string | null>(null)

	const loadInitialData = useCallback(async () => {
		setLoading(true)
		setError(null)

		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser()

		if (userError || !user) {
			setIsAuthenticated(false)
			setUserId(null)
			setMeals([])
			setLoading(false)
			if (userError) setError(userError.message)
			return
		}

		setIsAuthenticated(true)
		setUserId(user.id)

		const { data, error } = await supabase
			.from('meals')
			.select('*')
			.eq('user_id', user.id)
			.order('eaten_at', { ascending: false })

		if (error) {
			setError(error.message)
			setMeals([])
		}
		else {
			setMeals(data || [])
		}

		setLoading(false)
	}, [])

	useEffect(() => {
		loadInitialData()
	}, [loadInitialData])

	const refreshMeals = useCallback(async () => {
		if (!userId) return
		setError(null)

		const { data, error } = await supabase
			.from('meals')
			.select('*')
			.eq('user_id', userId)
			.order('eaten_at', { ascending: false })

		if (error) {
			setError(error.message)
			return
		}

		setMeals(data || [])
	}, [userId])

	const addMeal: MealsContextType['addMeal'] = useCallback(
		async ({ meal_name, meal_type = 'other', eaten_at, notes = null }) => {
			if (!userId) {
				setError('User not authenticated')
				return null
			}

			setError(null)

			const payload: any = {
				user_id: userId,
				meal_name,
				meal_type,
				notes,
			}

			if (eaten_at instanceof Date) {
				payload.eaten_at = eaten_at.toISOString()
			}
			else if (typeof eaten_at === 'string') {
				payload.eaten_at = eaten_at
			}

			const { data, error } = await supabase
				.from('meals')
				.insert(payload)
				.select('*')
				.single()

			if (error) {
				setError(error.message)
				return null
			}

			setMeals((prev) => [data as Meal, ...prev])
			return data as Meal
		}, [userId]
	)

  const updateMeal: MealsContextType['updateMeal'] = useCallback(
    async (mealId, data) => {
      if (!userId) {
        setError('User not authenticated')
        return
      }

      setError(null)

      const payload: any = { ...data }

      if (payload.eaten_at instanceof Date) {
        payload.eaten_at = payload.eaten_at.toISOString()
      }

      const { error } = await supabase
        .from('meals')
        .update(payload)
        .eq('id', mealId)
        .eq('user_id', userId)

      if (error) {
        setError(error.message)
        return
      }

      setMeals((prev) =>
        prev.map((meal) =>
          meal.id === mealId ? { ...meal, ...payload } : meal
        )
      )
    },
    [userId]
  )

  const deleteMeal: MealsContextType['deleteMeal'] = useCallback(
    async (mealId) => {
      if (!userId) {
        setError('User not authenticated')
        return
      }

      setError(null)

      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', mealId)
        .eq('user_id', userId)

      if (error) {
        setError(error.message)
        return
      }

      setMeals((prev) => prev.filter((meal) => meal.id !== mealId))
    },
    [userId]
  )

  const value: MealsContextType = {
    meals,
    loading,
    error,
    isAuthenticated,
    refreshMeals,
    addMeal,
    updateMeal,
    deleteMeal,
  }

  return (
    <MealsContext.Provider value={value}>
      {children}
    </MealsContext.Provider>
  )
}

const useMeals = () => {
  const ctx = useContext(MealsContext)
  if (!ctx) throw new Error('useLoggged must be used within FoodProvider')
  return ctx
}

export default useMeals