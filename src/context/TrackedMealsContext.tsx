'use client'
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { type MealItem, type MealItemInput, normalizeMealItemInput } from '@/src/shared/meals'

export type Meal = {
  id: string
  user_id: string
  meal_name: string
  meal_type: string // 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other'
  eaten_at: string // Supabase returns timestamptz as string
  notes: string | null
  created_at: string
  updated_at: string
  meal_items: MealItem[]
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
    meal_items?: MealItemInput[]
  }) => Promise<Meal | null>
  updateMeal: (
    mealId: string,
    data: Partial<Pick<Meal, 'meal_name' | 'meal_type' | 'notes'>> & {
      eaten_at?: string | Date
      meal_items?: MealItemInput[]
    }
  ) => Promise<void>
  deleteMeal: (mealId: string) => Promise<void>
}

const MealsContext = createContext<MealsContextType | null>(null)
const MEAL_SELECT = '*, meal_items(*)'

type RawMealItem = Partial<MealItem> & {
  position?: number | string | null
  quantity?: number | string | null
  fdc_id?: number | string | null
  calories?: number | string | null
  protein_g?: number | string | null
  carbs_g?: number | string | null
  fat_g?: number | string | null
  fiber_g?: number | string | null
  sugar_g?: number | string | null
  sodium_mg?: number | string | null
}

type RawMeal = Omit<Meal, 'meal_items'> & {
  meal_items?: RawMealItem[] | null
}

type MealInsertPayload = {
  user_id: string
  meal_name: string
  meal_type: string
  notes: string | null
  eaten_at?: string
}

type MealUpdatePayload = Partial<Pick<Meal, 'meal_name' | 'meal_type' | 'notes'>> & {
  eaten_at?: string
}

function normalizeMealItem(item: RawMealItem): MealItem {
  return {
    id: String(item.id ?? ''),
    meal_id: String(item.meal_id ?? ''),
    user_id: String(item.user_id ?? ''),
    position: Number(item.position ?? 0),
    food_name: String(item.food_name ?? ''),
    brand_name: item.brand_name ?? null,
    serving_description: item.serving_description ?? null,
    quantity: Number(item.quantity ?? 1),
    unit: item.unit ?? null,
    fdc_id: item.fdc_id == null ? null : Number(item.fdc_id),
    data_type: item.data_type ?? null,
    calories: Number(item.calories ?? 0),
    protein_g: Number(item.protein_g ?? 0),
    carbs_g: Number(item.carbs_g ?? 0),
    fat_g: Number(item.fat_g ?? 0),
    fiber_g: Number(item.fiber_g ?? 0),
    sugar_g: Number(item.sugar_g ?? 0),
    sodium_mg: Number(item.sodium_mg ?? 0),
    created_at: String(item.created_at ?? ''),
    updated_at: String(item.updated_at ?? ''),
  }
}

function normalizeMeal(raw: RawMeal): Meal {
  const items = Array.isArray(raw?.meal_items) ? raw.meal_items : []

  return {
    ...raw,
    meal_items: items
      .map(normalizeMealItem)
      .sort((a, b) => a.position - b.position),
  }
}

export function MealProvider({ children }: { children: React.ReactNode }) {
	const [meals, setMeals] = useState<Meal[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [isAuthenticated, setIsAuthenticated] = useState(false) 
	const [userId, setUserId] = useState<string | null>(null)
	const currentUserIdRef = useRef<string | null>(null)

	const loadInitialData = useCallback(async () => {
		setLoading(true)
		setError(null)

		try {
			const {
				data: { session },
			} = await supabase.auth.getSession()

			if (!session) {
				setIsAuthenticated(false)
				setUserId(null)
				currentUserIdRef.current = null
				setMeals([])
				return
			}

			setIsAuthenticated(true)
			setUserId(session.user.id)
			currentUserIdRef.current = session.user.id

			const { data, error } = await supabase
				.from('meals')
				.select(MEAL_SELECT)
				.eq('user_id', session.user.id)
				.order('eaten_at', { ascending: false })
        .order('position', { foreignTable: 'meal_items', ascending: true })

			if (error) {
				setError(error.message)
				setMeals([])
				return
			}

			setMeals((data || []).map(normalizeMeal))
		} catch (err) {
			console.error('Unexpected error loading meals:', err)
			setError('An unexpected error occurred while loading your meals')
			setMeals([])
			setIsAuthenticated(false)
			setUserId(null)
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		loadInitialData()

		const { data } = supabase.auth.onAuthStateChange((event, session) => {
			if (!session) {
				if (currentUserIdRef.current === null) return
				setIsAuthenticated(false)
				setUserId(null)
				currentUserIdRef.current = null
				setMeals([])
				setError(null)
				setLoading(false)
				return
			}

			if (session.user.id !== currentUserIdRef.current) {
				void loadInitialData()
			}
		})

		return () => {
			data?.subscription?.unsubscribe()
		}
	}, [loadInitialData])

	const refreshMeals = useCallback(async () => {
		if (!userId) return
		setError(null)

		const { data, error } = await supabase
			.from('meals')
			.select(MEAL_SELECT)
			.eq('user_id', userId)
			.order('eaten_at', { ascending: false })
      .order('position', { foreignTable: 'meal_items', ascending: true })

		if (error) {
			setError(error.message)
			return
		}

		setMeals((data || []).map(normalizeMeal))
	}, [userId])

  const fetchMealById = useCallback(async (mealId: string, currentUserId: string) => {
    const { data, error } = await supabase
      .from('meals')
      .select(MEAL_SELECT)
      .eq('id', mealId)
      .eq('user_id', currentUserId)
      .order('position', { foreignTable: 'meal_items', ascending: true })
      .single()

    if (error) throw error
    return normalizeMeal(data)
  }, [])

  const persistMealItems = useCallback(async (mealId: string, currentUserId: string, items: MealItemInput[] | undefined) => {
    const normalizedItems = (items ?? [])
      .map((item, index) => normalizeMealItemInput(item, index))
      .filter((item) => item.food_name !== '')

    const { error: deleteError } = await supabase
      .from('meal_items')
      .delete()
      .eq('meal_id', mealId)
      .eq('user_id', currentUserId)

    if (deleteError) throw deleteError
    if (normalizedItems.length === 0) return

    const rows = normalizedItems.map((item, index) => ({
      meal_id: mealId,
      user_id: currentUserId,
      ...item,
      position: index,
    }))

    const { error: insertError } = await supabase.from('meal_items').insert(rows)
    if (insertError) throw insertError
  }, [])

	const addMeal: MealsContextType['addMeal'] = useCallback(
		async ({ meal_name, meal_type = 'other', eaten_at, notes = null, meal_items = [] }) => {
			if (!userId) {
				setError('User not authenticated')
				return null
			}

			setError(null)

			const payload: MealInsertPayload = {
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

      try {
        await persistMealItems(data.id, userId, meal_items)
        const hydratedMeal = await fetchMealById(data.id, userId)
        setMeals((prev) => [hydratedMeal, ...prev.filter((meal) => meal.id !== hydratedMeal.id)])
        return hydratedMeal
      } catch (itemError) {
        const message = itemError instanceof Error ? itemError.message : 'Failed to save meal items'
        setError(message)
        return normalizeMeal({ ...data, meal_items: [] })
      }
		}, [fetchMealById, persistMealItems, userId]
	)

  const updateMeal: MealsContextType['updateMeal'] = useCallback(
    async (mealId, data) => {
      if (!userId) {
        setError('User not authenticated')
        return
      }

      setError(null)

      const { meal_items, ...rest } = data
      const mealItems = Array.isArray(meal_items) ? meal_items : undefined
      const payload: MealUpdatePayload = {
        ...rest,
        eaten_at: rest.eaten_at instanceof Date ? rest.eaten_at.toISOString() : rest.eaten_at,
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

      try {
        await persistMealItems(mealId, userId, mealItems)
        const hydratedMeal = await fetchMealById(mealId, userId)
        setMeals((prev) => prev.map((meal) => (meal.id === mealId ? hydratedMeal : meal)))
      } catch (itemError) {
        const message = itemError instanceof Error ? itemError.message : 'Failed to update meal items'
        setError(message)
      }
    },
    [fetchMealById, persistMealItems, userId]
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
  if (!ctx) throw new Error('useMeals must be used within MealProvider')
  return ctx
}

export default useMeals
