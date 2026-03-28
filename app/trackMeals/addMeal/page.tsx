'use client'
import useMeals from '@/src/context/TrackedMealsContext'
import { type MealItemInput, buildMealName, formatMacroValue, sumMealMacros } from '@/src/shared/meals'
import { IconPlus, IconSearch, IconTrash } from '@tabler/icons-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react'
import AdSenseAd from '@/app/components/AdSenseAd'

const MEAL_TYPE_OPTIONS = [
  { value: 'breakfast', label: 'Breakfast', description: 'Morning meal to start your day.' },
  { value: 'lunch', label: 'Lunch', description: 'Midday meal for energy and balance.' },
  { value: 'dinner', label: 'Dinner', description: 'Evening meal and end-of-day intake.' },
  { value: 'snack', label: 'Snack', description: 'Smaller meal between main meals.' },
  { value: 'other', label: 'Other', description: 'Any meal that does not fit the main types.' },
]

const INPUT_CLASS =
  'w-full rounded-xl border border-green-300 bg-white px-3 py-2.5 text-sm shadow-sm transition-all placeholder:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100'

type SelectedMealFood = {
  id?: string
  localId: string
  isCustom: boolean
  food_name: string
  brand_name: string | null
  serving_description: string | null
  amount: number
  measurementMode: 'standard_serving' | 'grams_ml'
  baseAmount: number
  baseUnit: string
  metricReferenceAmount: number | null
  metricReferenceUnit: 'g' | 'ml' | null
  fdc_id: number | null
  data_type: string | null
  baseCalories: number
  baseProteinG: number
  baseCarbsG: number
  baseFatG: number
  baseFiberG: number
  baseSugarG: number
  baseSodiumMg: number
}

type UsdaFoodSearchResult = {
  fdcId: number | null
  description: string
  brandName: string | null
  servingDescription: string | null
  servingAmount: number | null
  servingUnit: string | null
  dataType: string | null
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
  sodium: number
}

function createLocalId() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function formatHistoryMealTime(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Unknown time'
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function roundNutrition(value: number): number {
  return Math.round(value * 100) / 100
}

function normalizeMeasurementUnit(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function toMetricUnit(value: string | null | undefined): 'g' | 'ml' | null {
  const normalized = normalizeMeasurementUnit(value)
  if (['g', 'gram', 'grams'].includes(normalized)) return 'g'
  if (['ml', 'milliliter', 'milliliters'].includes(normalized)) return 'ml'
  return null
}

function parseServingReference(servingDescription: string | null | undefined): { amount: number; unit: string } | null {
  if (!servingDescription) return null

  const match = servingDescription.trim().match(/^(\d+(?:\.\d+)?)\s+(.+)$/)
  if (!match) return null

  const amount = Number(match[1])
  const unit = match[2]?.trim()
  if (!Number.isFinite(amount) || amount <= 0 || !unit) return null

  return { amount, unit }
}

function getMacroMultiplier(food: SelectedMealFood): number {
  if (!Number.isFinite(food.amount) || food.amount <= 0) return 1
  if (food.measurementMode === 'grams_ml') {
    const metricReferenceAmount = food.metricReferenceAmount

    if (
      typeof metricReferenceAmount !== 'number' ||
      !Number.isFinite(metricReferenceAmount) ||
      !food.metricReferenceUnit ||
      metricReferenceAmount <= 0
    ) {
      return food.amount
    }

    return food.amount / metricReferenceAmount
  }

  if (!Number.isFinite(food.baseAmount) || food.baseAmount <= 0) return food.amount
  return food.amount / food.baseAmount
}

function getAmountRatio(amount: number, baseAmount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 1
  if (!Number.isFinite(baseAmount) || baseAmount <= 0) return amount
  return amount / baseAmount
}

function formatFoodAmount(amount: number, unit: string) {
  const formattedAmount = formatMacroValue(amount, amount % 1 === 0 ? 0 : 2)
  return unit.trim() ? `${formattedAmount} ${unit.trim()}` : formattedAmount
}

function getMeasurementOptions(food: SelectedMealFood): Array<{ value: SelectedMealFood['measurementMode']; label: string }> {
  const options: Array<{ value: SelectedMealFood['measurementMode']; label: string }> = [
    { value: 'standard_serving', label: 'Serving size' },
  ]

  if (food.metricReferenceUnit) {
    options.unshift({
      value: 'grams_ml',
      label: food.metricReferenceUnit === 'g' ? 'Grams' : 'mL',
    })
  }

  return options
}

function getSelectedUnitLabel(food: SelectedMealFood): string {
  if (food.measurementMode === 'grams_ml' && food.metricReferenceUnit) {
    return food.metricReferenceUnit
  }

  return 'standard serving'
}

function serializeSelectedFoods(foods: SelectedMealFood[]): MealItemInput[] {
  return foods.map((food, index) => {
    const multiplier = getMacroMultiplier(food)

    return {
      position: index,
      food_name: food.food_name,
      brand_name: food.brand_name,
      serving_description: food.serving_description,
      quantity: roundNutrition(food.amount),
      unit: getSelectedUnitLabel(food),
      fdc_id: food.fdc_id,
      data_type: food.data_type,
      calories: roundNutrition(food.baseCalories * multiplier),
      protein_g: roundNutrition(food.baseProteinG * multiplier),
      carbs_g: roundNutrition(food.baseCarbsG * multiplier),
      fat_g: roundNutrition(food.baseFatG * multiplier),
      fiber_g: roundNutrition(food.baseFiberG * multiplier),
      sugar_g: roundNutrition(food.baseSugarG * multiplier),
      sodium_mg: roundNutrition(food.baseSodiumMg * multiplier),
    }
  })
}

function selectedFoodFromStoredItem(item: {
  id: string
  food_name: string
  brand_name: string | null
  serving_description: string | null
  quantity: number
  unit: string | null
  fdc_id: number | null
  data_type: string | null
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  sugar_g: number
  sodium_mg: number
}): SelectedMealFood {
  const parsedServing = parseServingReference(item.serving_description)
  const amount = item.quantity > 0 ? item.quantity : parsedServing?.amount ?? 1
  const baseAmount = parsedServing?.amount ?? amount
  const baseUnit = parsedServing?.unit ?? item.unit ?? 'serving'
  const metricReferenceUnit = toMetricUnit(parsedServing?.unit ?? item.unit)
  const metricReferenceAmount = metricReferenceUnit ? (parsedServing?.amount ?? amount) : null
  const measurementMode = item.unit === 'standard serving' ? 'standard_serving' : metricReferenceUnit ? 'grams_ml' : 'standard_serving'
  const ratio = measurementMode === 'grams_ml'
    ? getAmountRatio(amount, metricReferenceAmount ?? amount)
    : getAmountRatio(amount, baseAmount)

  return {
    id: item.id,
    localId: item.id || createLocalId(),
    isCustom: item.data_type === 'Custom',
    food_name: item.food_name,
    brand_name: item.brand_name,
    serving_description: item.serving_description,
    amount,
    measurementMode,
    baseAmount,
    baseUnit,
    metricReferenceAmount,
    metricReferenceUnit,
    fdc_id: item.fdc_id,
    data_type: item.data_type,
    baseCalories: item.calories / ratio,
    baseProteinG: item.protein_g / ratio,
    baseCarbsG: item.carbs_g / ratio,
    baseFatG: item.fat_g / ratio,
    baseFiberG: item.fiber_g / ratio,
    baseSugarG: item.sugar_g / ratio,
    baseSodiumMg: item.sodium_mg / ratio,
  }
}

function selectedFoodFromSearchResult(food: UsdaFoodSearchResult): SelectedMealFood {
  const parsedServing = parseServingReference(food.servingDescription)
  const baseAmount = food.servingAmount ?? parsedServing?.amount ?? 1
  const baseUnit = food.servingUnit ?? parsedServing?.unit ?? 'serving'
  const metricReferenceUnit = toMetricUnit(food.servingUnit ?? parsedServing?.unit)
  const metricReferenceAmount = metricReferenceUnit ? baseAmount : null

  return {
    localId: createLocalId(),
    isCustom: false,
    food_name: food.description,
    brand_name: food.brandName,
    serving_description: food.servingDescription,
    amount: baseAmount,
    measurementMode: metricReferenceUnit ? 'grams_ml' : 'standard_serving',
    baseAmount,
    baseUnit,
    metricReferenceAmount,
    metricReferenceUnit,
    fdc_id: food.fdcId,
    data_type: food.dataType,
    baseCalories: food.calories,
    baseProteinG: food.protein,
    baseCarbsG: food.carbs,
    baseFatG: food.fat,
    baseFiberG: food.fiber,
    baseSugarG: food.sugar,
    baseSodiumMg: food.sodium,
  }
}

function createCustomFood(name: string): SelectedMealFood {
  const trimmedName = name.trim()

  return {
    localId: createLocalId(),
    isCustom: true,
    food_name: trimmedName || 'Custom food',
    brand_name: null,
    serving_description: null,
    amount: 1,
    measurementMode: 'standard_serving',
    baseAmount: 1,
    baseUnit: 'serving',
    metricReferenceAmount: null,
    metricReferenceUnit: null,
    fdc_id: null,
    data_type: 'Custom',
    baseCalories: 0,
    baseProteinG: 0,
    baseCarbsG: 0,
    baseFatG: 0,
    baseFiberG: 0,
    baseSugarG: 0,
    baseSodiumMg: 0,
  }
}

export default function AddMealPage() {
  const [name, setName] = useState('')
  const [type, setType] = useState('breakfast')
  const [eatenAt, setEatenAt] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedFoods, setSelectedFoods] = useState<SelectedMealFood[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [foodQuery, setFoodQuery] = useState('')
  const [foodResults, setFoodResults] = useState<UsdaFoodSearchResult[]>([])
  const [foodSearchError, setFoodSearchError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isSearchingFoods, startFoodSearchTransition] = useTransition()

  const deferredFoodQuery = useDeferredValue(foodQuery)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addMeal, error: addMealError, updateMeal, meals } = useMeals()
  const mealId = searchParams.get('mealId')
  const editingMeal = mealId ? meals.find((meal) => meal.id === mealId) : undefined

  const mealHistory = useMemo(() => {
    const seen = new Set<string>()

    return meals.filter((meal) => {
      const key = JSON.stringify({
        meal_name: meal.meal_name.trim().toLowerCase(),
        meal_type: meal.meal_type,
        notes: meal.notes?.trim().toLowerCase() ?? '',
        items: meal.meal_items.map((item) => `${item.food_name.trim().toLowerCase()}-${item.quantity}-${item.unit ?? ''}`).join('|'),
      })

      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [meals])

  useEffect(() => {
    if (!editingMeal) return

    const timer = setTimeout(() => {
      setName(editingMeal.meal_name ?? '')
      setType(editingMeal.meal_type ?? 'breakfast')

      if (editingMeal.eaten_at) {
        const d = new Date(editingMeal.eaten_at)
        if (!Number.isNaN(d.getTime())) {
          const yyyy = d.getFullYear()
          const mm = String(d.getMonth() + 1).padStart(2, '0')
          const dd = String(d.getDate()).padStart(2, '0')
          const hh = String(d.getHours()).padStart(2, '0')
          const min = String(d.getMinutes()).padStart(2, '0')
          setEatenAt(`${yyyy}-${mm}-${dd}T${hh}:${min}`)
        } else {
          setEatenAt('')
        }
      } else {
        setEatenAt('')
      }

      setNotes(editingMeal.notes ?? '')
      setSelectedFoods((editingMeal.meal_items ?? []).map(selectedFoodFromStoredItem))
      setSelectedTemplateId('')
    }, 0)

    return () => clearTimeout(timer)
  }, [editingMeal])

  useEffect(() => {
    const query = deferredFoodQuery.trim()
    if (query.length < 2) return

    const controller = new AbortController()
    const timer = setTimeout(() => {
      startFoodSearchTransition(async () => {
        try {
          setFoodSearchError(null)
          const response = await fetch(`/api/usda-foods/search?q=${encodeURIComponent(query)}`, {
            signal: controller.signal,
          })

          if (!response.ok) {
            const data = (await response.json().catch(() => ({}))) as { error?: string }
            setFoodSearchError(data.error ?? 'Could not search USDA foods right now.')
            setFoodResults([])
            return
          }

          const data = (await response.json()) as { foods?: UsdaFoodSearchResult[] }
          setFoodResults(Array.isArray(data.foods) ? data.foods : [])
        } catch (searchError) {
          if ((searchError as Error).name === 'AbortError') return
          setFoodSearchError('Could not search USDA foods right now.')
          setFoodResults([])
        }
      })
    }, 350)

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [deferredFoodQuery])

  const serializedSelectedFoods = useMemo(() => serializeSelectedFoods(selectedFoods), [selectedFoods])
  const selectedMacroTotals = useMemo(() => sumMealMacros(serializedSelectedFoods), [serializedSelectedFoods])
  const previewMealName = useMemo(() => buildMealName(name, serializedSelectedFoods), [name, serializedSelectedFoods])

  const applyMealTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
    const selectedMeal = mealHistory.find((meal) => meal.id === templateId)
    if (!selectedMeal) return

    setName(selectedMeal.meal_name ?? '')
    setType(selectedMeal.meal_type ?? 'breakfast')
    setNotes(selectedMeal.notes ?? '')
    setSelectedFoods((selectedMeal.meal_items ?? []).map(selectedFoodFromStoredItem))
  }

  const addFoodToMeal = (food: UsdaFoodSearchResult) => {
    setSelectedFoods((prev) => [...prev, selectedFoodFromSearchResult(food)])
    setFoodQuery('')
    setFoodResults([])
    setFoodSearchError(null)
  }

  const addCustomFoodToMeal = (name: string) => {
    setSelectedFoods((prev) => [...prev, createCustomFood(name)])
    setFoodQuery('')
    setFoodResults([])
    setFoodSearchError(null)
  }

  const updateSelectedFoodAmount = (localId: string, amount: number) => {
    setSelectedFoods((prev) =>
      prev.map((food) =>
        food.localId === localId
          ? { ...food, amount: Number.isFinite(amount) && amount > 0 ? amount : food.baseAmount || 1 }
          : food
      )
    )
  }

  const updateSelectedFoodMeasurementMode = (localId: string, measurementMode: SelectedMealFood['measurementMode']) => {
    setSelectedFoods((prev) =>
      prev.map((food) =>
        food.localId === localId
          ? {
              ...food,
              measurementMode,
              amount: measurementMode === 'grams_ml'
                ? food.metricReferenceAmount ?? food.amount
                : 1,
            }
          : food
      )
    )
  }

  const updateCustomFoodNutrition = (
    localId: string,
    field: 'baseCalories' | 'baseProteinG' | 'baseCarbsG' | 'baseFatG',
    value: number
  ) => {
    setSelectedFoods((prev) =>
      prev.map((food) =>
        food.localId === localId
          ? {
              ...food,
              [field]: Number.isFinite(value) && value >= 0 ? value : 0,
            }
          : food
      )
    )
  }

  const removeSelectedFood = (localId: string) => {
    setSelectedFoods((prev) => prev.filter((food) => food.localId !== localId))
  }

  const clearTemplate = () => {
    setSelectedTemplateId('')
    setName('')
    setType('breakfast')
    setNotes('')
    setSelectedFoods([])
  }

  const handleFoodQueryChange = (value: string) => {
    setFoodQuery(value)

    if (value.trim().length < 2) {
      setFoodResults([])
      setFoodSearchError(null)
    }
  }

  const handleAdding = (e: React.FormEvent) => {
    e.preventDefault()

    if (!type.trim()) {
      setError('Please choose a meal type')
      return
    }

    if (!name.trim() && selectedFoods.length === 0) {
      setError('Add at least one USDA food or enter a meal title')
      return
    }

    setError(null)
    setMessage(null)

    startTransition(async () => {
      let eatenAtIso: string | undefined
      if (eatenAt.trim() !== '') {
        const parsedDateTime = new Date(eatenAt)
        if (Number.isNaN(parsedDateTime.getTime())) {
          setError('Please enter a valid date and time for Eaten At')
          return
        }
        eatenAtIso = parsedDateTime.toISOString()
      }

      const mealPayload = {
        meal_name: buildMealName(name.trim(), serializedSelectedFoods),
        meal_type: type,
        eaten_at: eatenAtIso,
        notes: notes.trim() === '' ? null : notes.trim(),
        meal_items: serializedSelectedFoods,
      }

      if (mealId && editingMeal) {
        try {
          await updateMeal(mealId, mealPayload)
          setMessage('Meal updated successfully')
          router.push('/trackMeals')
          return
        } catch (err) {
          setError('Failed to update meal')
          console.error(err)
          return
        }
      }

      const newMeal = await addMeal(mealPayload)

      if (!newMeal) {
        setError(addMealError ?? 'Failed to add meal')
        return
      }

      setName('')
      setType('breakfast')
      setEatenAt('')
      setNotes('')
      setSelectedFoods([])
      setSelectedTemplateId('')
      setFoodQuery('')
      setFoodResults([])
      setFoodSearchError(null)

      setMessage('Meal added successfully')
      router.push('/trackMeals')
    })
  }

  return (
    <div className="p-4 md:p-6 mt-3 md:mt-5 flex flex-col items-center">
      <div className="w-full max-w-6xl mb-5 rounded-2xl border border-green-100 bg-linear-to-r from-green-50 via-white to-emerald-50 p-4 md:p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-medium tracking-tight">{editingMeal ? 'Edit Meal' : 'Add Meal'}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {editingMeal ? 'Update details for this meal entry.' : 'Create a new meal entry for your daily log.'}
            </p>
          </div>
          <Link
            href="/trackMeals"
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:border-green-400 hover:text-green-700"
          >
            Back to Meals
          </Link>
        </div>
      </div>

      <form onSubmit={handleAdding} className="w-full max-w-6xl space-y-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="space-y-5 rounded-2xl border border-green-200 bg-linear-to-br from-white to-green-50/60 p-4 shadow-sm md:p-6 lg:col-span-2">
            <div className="flex items-center justify-between border-b border-green-200 pb-3">
              <h2 className="text-lg font-semibold text-gray-900">Meal Details</h2>
              <p className="text-xs text-gray-500">Meal type is required. Foods or a title are required.</p>
            </div>

            {!editingMeal && mealHistory.length > 0 && (
              <div className="rounded-2xl border border-green-200 bg-green-50/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Use a previously logged meal</h3>
                    <p className="mt-1 text-xs text-gray-600">Select one to prefill the title, type, notes, and foods.</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-green-800 shadow-sm">
                    {mealHistory.length} saved
                  </span>
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <select className={INPUT_CLASS} value={selectedTemplateId} onChange={(e) => applyMealTemplate(e.target.value)}>
                    <option value="">Choose a previous meal</option>
                    {mealHistory.map((meal) => (
                      <option key={meal.id} value={meal.id}>
                        {meal.meal_name} | {meal.meal_type} | {formatHistoryMealTime(meal.eaten_at)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={clearTemplate}
                    className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:border-green-400 hover:text-green-700 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="meal-name" className="text-sm font-medium text-gray-800">
                Meal Title
              </label>
              <input
                id="meal-name"
                type="text"
                placeholder="Optional if you are selecting foods below"
                className={INPUT_CLASS}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="text-xs text-gray-500">If left blank, the meal title will be built from the foods you add.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-800">Meal Type *</label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {MEAL_TYPE_OPTIONS.map((option) => {
                  const selected = type === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setType(option.value)}
                      className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                        selected ? 'border-green-600 bg-green-50 ring-2 ring-green-100' : 'border-gray-200 bg-white hover:border-green-400'
                      }`}
                    >
                      <p className={`text-sm font-semibold ${selected ? 'text-green-800' : 'text-gray-800'}`}>{option.label}</p>
                      <p className="mt-0.5 text-xs text-gray-600">{option.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="eaten-at" className="text-sm font-medium text-gray-800">
                Eaten At (Date & Time)
              </label>
              <input id="eaten-at" type="datetime-local" className={INPUT_CLASS} value={eatenAt} onChange={(e) => setEatenAt(e.target.value)} />
            </div>

            <div className="space-y-4 rounded-2xl border border-green-200 bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Meal Foods</h3>
                  <p className="mt-1 text-xs text-gray-600">Search USDA FoodData Central and add multiple foods to one meal.</p>
                </div>
                <span className="rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-green-800">
                  {selectedFoods.length} selected
                </span>
              </div>

              <div className="space-y-2">
                <label htmlFor="food-search" className="text-sm font-medium text-gray-800">
                  Search USDA foods
                </label>
                <div className="relative">
                  <IconSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="food-search"
                    type="text"
                    className={`${INPUT_CLASS} pl-9`}
                    placeholder="Search foods like banana, scrambled eggs, greek yogurt..."
                    value={foodQuery}
                    onChange={(e) => handleFoodQueryChange(e.target.value)}
                  />
                </div>
                <p className="text-xs text-gray-500">Search starts after 2 characters</p>
                {foodQuery.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => addCustomFoodToMeal(foodQuery)}
                    className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:border-green-400 hover:text-green-700 cursor-pointer"
                  >
                    Add custom food: {foodQuery.trim()}
                  </button>
                )}
              </div>

              {(isSearchingFoods || foodSearchError || foodResults.length > 0 || deferredFoodQuery.trim().length >= 2) && (
                <div className="rounded-2xl border border-green-100 bg-green-50/40 p-3">
                  {isSearchingFoods ? (
                    <p className="text-sm text-gray-600">Searching USDA foods...</p>
                  ) : foodSearchError ? (
                    <p className="text-sm text-red-600">{foodSearchError}</p>
                  ) : foodResults.length === 0 ? (
                    <p className="text-sm text-gray-600">No foods found for that search.</p>
                  ) : (
                    <div className="space-y-3">
                      {foodResults.map((food) => (
                        <div key={`${food.fdcId ?? food.description}-${food.brandName ?? ''}`} className="rounded-xl border border-green-200 bg-white p-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-gray-900">{food.description}</p>
                              <p className="text-xs text-gray-600">
                                {[food.brandName, food.servingDescription, food.dataType].filter(Boolean).join(' | ') || 'USDA food'}
                              </p>
                              <p className="text-xs text-gray-600">
                                {formatMacroValue(food.calories, 0)} cal | {formatMacroValue(food.protein)}g protein | {formatMacroValue(food.carbs)}g carbs | {formatMacroValue(food.fat)}g fat
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => addFoodToMeal(food)}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-300 bg-green-50 px-3 py-2 text-sm font-medium text-green-800 transition-all hover:border-green-500 hover:bg-green-100 cursor-pointer"
                            >
                              <IconPlus size={16} />
                              Add food
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedFoods.length > 0 ? (
                <div className="space-y-3">
                  {selectedFoods.map((food) => {
                    const itemTotals = serializeSelectedFoods([food])[0]

                    return (
                      <div key={food.localId} className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-gray-900">{food.food_name}</p>
                            <p className="text-xs text-gray-600">
                              {[food.brand_name, food.serving_description, food.data_type].filter(Boolean).join(' | ') || 'Meal item'}
                            </p>
                            <p className="text-xs text-gray-500">
                              Base serving: {formatFoodAmount(food.baseAmount, food.baseUnit)}
                            </p>
                            <p className="text-xs text-gray-600">
                              {formatMacroValue(itemTotals.calories ?? 0, 0)} cal | {formatMacroValue(itemTotals.protein_g ?? 0)}g protein | {formatMacroValue(itemTotals.carbs_g ?? 0)}g carbs | {formatMacroValue(itemTotals.fat_g ?? 0)}g fat
                            </p>
                            {food.isCustom && (
                              <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
                                <div className="space-y-1">
                                  <label className="text-[11px] font-medium text-gray-700" htmlFor={`custom-calories-${food.localId}`}>
                                    Calories
                                  </label>
                                  <input
                                    id={`custom-calories-${food.localId}`}
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={food.baseCalories}
                                    onChange={(e) => updateCustomFoodNutrition(food.localId, 'baseCalories', Number(e.target.value))}
                                    className="w-full rounded-xl border border-green-300 bg-white px-2.5 py-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-medium text-gray-700" htmlFor={`custom-protein-${food.localId}`}>
                                    Protein
                                  </label>
                                  <input
                                    id={`custom-protein-${food.localId}`}
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={food.baseProteinG}
                                    onChange={(e) => updateCustomFoodNutrition(food.localId, 'baseProteinG', Number(e.target.value))}
                                    className="w-full rounded-xl border border-green-300 bg-white px-2.5 py-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-medium text-gray-700" htmlFor={`custom-carbs-${food.localId}`}>
                                    Carbs
                                  </label>
                                  <input
                                    id={`custom-carbs-${food.localId}`}
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={food.baseCarbsG}
                                    onChange={(e) => updateCustomFoodNutrition(food.localId, 'baseCarbsG', Number(e.target.value))}
                                    className="w-full rounded-xl border border-green-300 bg-white px-2.5 py-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-medium text-gray-700" htmlFor={`custom-fat-${food.localId}`}>
                                    Fat
                                  </label>
                                  <input
                                    id={`custom-fat-${food.localId}`}
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={food.baseFatG}
                                    onChange={(e) => updateCustomFoodNutrition(food.localId, 'baseFatG', Number(e.target.value))}
                                    className="w-full rounded-xl border border-green-300 bg-white px-2.5 py-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-end gap-3">
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-700" htmlFor={`amount-${food.localId}`}>
                                Amount
                              </label>
                              <input
                                id={`amount-${food.localId}`}
                                type="number"
                                min="0.25"
                                step="0.25"
                                value={food.amount}
                                onChange={(e) => updateSelectedFoodAmount(food.localId, Number(e.target.value))}
                                className="w-24 rounded-xl border border-green-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-700" htmlFor={`unit-${food.localId}`}>
                                Unit
                              </label>
                              <select
                                id={`unit-${food.localId}`}
                                value={food.measurementMode}
                                onChange={(e) => updateSelectedFoodMeasurementMode(food.localId, e.target.value as SelectedMealFood['measurementMode'])}
                                className="w-28 rounded-xl border border-green-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
                              >
                                {getMeasurementOptions(food).map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeSelectedFood(food.localId)}
                              className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-all hover:bg-red-50 cursor-pointer"
                            >
                              <IconTrash size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-green-200 bg-green-50/30 p-4 text-sm text-gray-600">
                  No foods selected yet. Search above and add as many items as needed for one meal.
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="meal-notes" className="text-sm font-medium text-gray-800">
                  Notes
                </label>
                <span className="text-xs text-gray-500">{notes.length} characters</span>
              </div>
              <textarea
                id="meal-notes"
                rows={4}
                className={INPUT_CLASS}
                placeholder="Include key ingredients, rough portions, preparation, and any early reactions."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <aside className="h-fit space-y-4 rounded-2xl border border-green-200 bg-white p-4 shadow-sm md:p-5">
            <div className="rounded-xl border border-green-200 bg-green-50/60 p-3">
              <h3 className="text-sm font-semibold text-green-900">Preview</h3>
              <p className="mt-2 text-sm text-gray-700">
                <span className="font-medium">Meal:</span> {previewMealName}
              </p>
              <p className="mt-1 text-sm text-gray-700">
                <span className="font-medium">Type:</span> {type || 'Not set'}
              </p>
              <p className="mt-1 text-sm text-gray-700">
                <span className="font-medium">Time:</span> {eatenAt || 'Not set'}
              </p>
              <p className="mt-1 text-sm text-gray-700">
                <span className="font-medium">Foods:</span> {selectedFoods.length}
              </p>
              <p className="mt-1 text-sm text-gray-700">
                <span className="font-medium">Calories:</span> {formatMacroValue(selectedMacroTotals.calories, 0)}
              </p>
              <p className="mt-1 text-sm text-gray-700">
                <span className="font-medium">Macros:</span> {formatMacroValue(selectedMacroTotals.protein_g)}g protein | {formatMacroValue(selectedMacroTotals.carbs_g)}g carbs | {formatMacroValue(selectedMacroTotals.fat_g)}g fat
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <h3 className="text-sm font-semibold text-gray-900">Logging Tips</h3>
              <ul className="mt-2 space-y-1 text-xs text-gray-600">
                <li>Search and add each food item that was part of the same meal.</li>
                <li>Adjust quantity to reflect how many servings you actually ate.</li>
                <li>Use notes for prep details like fried, baked, or spicy.</li>
                <li>Keep meal timing accurate if symptoms show up later.</li>
                <li>Template reuse now carries food selections too.</li>
              </ul>
            </div>

            <AdSenseAd
              slot="4563997002"
              label="Suggested"
              description="A small sponsored placement that stays out of your meal logging flow."
              className="mt-2"
            />
          </aside>
        </div>

        {(message || error) && (
          <div
            className={`rounded-xl border px-3 py-2 text-sm ${
              error ? 'border-red-300 bg-red-50 text-red-700' : 'border-green-300 bg-green-50 text-green-700'
            }`}
          >
            {error ?? message}
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/trackMeals"
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:border-green-400 hover:text-green-700"
          >
            Cancel
          </Link>
          <button
            className="inline-flex items-center justify-center rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            disabled={isPending}
          >
            {isPending ? (editingMeal ? 'Updating...' : 'Adding...') : editingMeal ? 'Update Meal' : 'Add Meal'}
          </button>
        </div>
      </form>
    </div>
  )
}
