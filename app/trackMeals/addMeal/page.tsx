'use client'
import useMeals from '@/src/context/TrackedMealsContext'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useEffect, useState, useTransition } from 'react'

const MEAL_TYPE_OPTIONS = [
  {
    value: 'breakfast',
    label: 'Breakfast',
    description: 'Morning meal to start your day.',
  },
  {
    value: 'lunch',
    label: 'Lunch',
    description: 'Midday meal for energy and balance.',
  },
  {
    value: 'dinner',
    label: 'Dinner',
    description: 'Evening meal and end-of-day intake.',
  },
  {
    value: 'snack',
    label: 'Snack',
    description: 'Smaller meal between main meals.',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Any meal that does not fit the main types.',
  },
]

const INPUT_CLASS =
  'w-full rounded-xl border border-green-300 bg-white px-3 py-2.5 text-sm shadow-sm transition-all placeholder:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100'

function formatHistoryMealTime(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Unknown time'
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const AddMealPage = () => {
  const [name, setName] = useState('')
  const [type, setType] = useState('breakfast')
  const [eatenAt, setEatenAt] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const router = useRouter()
  const searchParams = useSearchParams()
  const { addMeal, error: addMealError, updateMeal, meals } = useMeals()
  const mealId = searchParams.get('mealId')
  const editingMeal = mealId ? meals.find((m) => m.id === mealId) : undefined

  const mealHistory = React.useMemo(() => {
    const seen = new Set<string>()

    return meals.filter((meal) => {
      const key = JSON.stringify({
        meal_name: meal.meal_name.trim().toLowerCase(),
        meal_type: meal.meal_type,
        notes: meal.notes?.trim().toLowerCase() ?? '',
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
      setType(editingMeal.meal_type ?? '')
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
      setSelectedTemplateId('')
    }, 0)

    return () => clearTimeout(timer)
  }, [editingMeal])

  const applyMealTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
    const selectedMeal = mealHistory.find((meal) => meal.id === templateId)
    if (!selectedMeal) return

    setName(selectedMeal.meal_name ?? '')
    setType(selectedMeal.meal_type ?? 'breakfast')
    setNotes(selectedMeal.notes ?? '')
  }

  const handleAdding = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !type.trim()) {
      setError('Please fill out the required fields')
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

      if (mealId && editingMeal) {
        try {
          await updateMeal(mealId, {
            meal_name: name.trim(),
            meal_type: type,
            eaten_at: eatenAtIso,
            notes: notes.trim() === '' ? null : notes.trim(),
          })

          setMessage('Meal updated successfully')
          router.push('/trackMeals')
          return
        } catch (err) {
          setError('Failed to update meal')
          console.error(err)
          return
        }
      }

      const newMeal = await addMeal({
        meal_name: name.trim(),
        meal_type: type,
        eaten_at: eatenAtIso,
        notes: notes.trim() === '' ? null : notes.trim(),
      })

      if (!newMeal) {
        setError(addMealError ?? 'Failed to add meal')
        return
      }

      setName('')
      setType('')
      setEatenAt('')
      setNotes('')
      setSelectedTemplateId('')

      setMessage('Meal added successfully')
      router.push('/trackMeals')
    })
  }

  return (
    <div className="p-4 md:p-6 mt-3 md:mt-5 flex flex-col items-center">
      <div className="w-full max-w-6xl mb-5 rounded-2xl border border-green-100 bg-linear-to-r from-green-50 via-white to-emerald-50 p-4 md:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-medium tracking-tight">{editingMeal ? 'Edit Meal' : 'Add Meal'}</h1>
            <p className="text-sm text-gray-600 mt-1">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 rounded-2xl border border-green-200 bg-linear-to-br from-white to-green-50/60 p-4 md:p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-green-200 pb-3">
              <h2 className="text-lg font-semibold text-gray-900">Meal Details</h2>
              <p className="text-xs text-gray-500">Fields marked * are required</p>
            </div>

            {!editingMeal && mealHistory.length > 0 && (
              <div className="rounded-2xl border border-green-200 bg-green-50/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Use a previously logged meal</h3>
                    <p className="mt-1 text-xs text-gray-600">Select one to prefill the meal name, type, and notes.</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-green-800 shadow-sm">
                    {mealHistory.length} saved
                  </span>
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <select
                    className={INPUT_CLASS}
                    value={selectedTemplateId}
                    onChange={(e) => applyMealTemplate(e.target.value)}
                  >
                    <option value="">Choose a previous meal</option>
                    {mealHistory.map((meal) => (
                      <option key={meal.id} value={meal.id}>
                        {meal.meal_name} • {meal.meal_type} • {formatHistoryMealTime(meal.eaten_at)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTemplateId('')
                      setName('')
                      setType('breakfast')
                      setNotes('')
                    }}
                    className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:border-green-400 hover:text-green-700"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="meal-name" className="text-sm font-medium text-gray-800">
                Meal Name *
              </label>
              <input
                id="meal-name"
                type="text"
                placeholder="e.g. Oatmeal with blueberries and almonds"
                className={INPUT_CLASS}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-800">Meal Type *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MEAL_TYPE_OPTIONS.map((option) => {
                  const selected = type === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setType(option.value)}
                      className={`text-left rounded-xl border p-3 transition-all ${
                        selected
                          ? 'border-green-600 bg-green-50 ring-2 ring-green-100'
                          : 'border-gray-200 bg-white hover:border-green-400'
                      }`}
                    >
                      <p className={`text-sm font-semibold ${selected ? 'text-green-800' : 'text-gray-800'}`}>{option.label}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{option.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="eaten-at" className="text-sm font-medium text-gray-800">
                Eaten At (Date & Time)
              </label>
              <input
                id="eaten-at"
                type="datetime-local"
                className={INPUT_CLASS}
                value={eatenAt}
                onChange={(e) => setEatenAt(e.target.value)}
              />
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

          <aside className="rounded-2xl border border-green-200 bg-white p-4 md:p-5 shadow-sm space-y-4 h-fit">
            <div className="rounded-xl border border-green-200 bg-green-50/60 p-3">
              <h3 className="text-sm font-semibold text-green-900">Preview</h3>
              <p className="mt-2 text-sm text-gray-700">
                <span className="font-medium">Meal:</span> {name.trim() || 'Not set'}
              </p>
              <p className="mt-1 text-sm text-gray-700">
                <span className="font-medium">Type:</span> {type || 'Not set'}
              </p>
              <p className="mt-1 text-sm text-gray-700">
                <span className="font-medium">Time:</span> {eatenAt || 'Not set'}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <h3 className="text-sm font-semibold text-gray-900">AI Optimization Tips</h3>
              <ul className="mt-2 space-y-1 text-xs text-gray-600">
                <li>List the main ingredients, not just the dish name.</li>
                <li>Add rough portions like 1 cup, 2 eggs, or half a sandwich.</li>
                <li>Mention preparation details such as fried, baked, or raw.</li>
                <li>If symptoms appear, note timing like within 1-3 hours.</li>
                <li>Keep names consistent across days so AI can spot patterns.</li>
              </ul>
            </div>
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

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Link
            href="/trackMeals"
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:border-green-400 hover:text-green-700"
          >
            Cancel
          </Link>
          <button
            className="inline-flex items-center justify-center rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isPending}
          >
            {isPending ? (editingMeal ? 'Updating...' : 'Adding...') : editingMeal ? 'Update Meal' : 'Add Meal'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddMealPage
