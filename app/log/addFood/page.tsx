'use client'
import AdSenseAd from '@/app/components/AdSenseAd'
import { supabase } from '@/lib/supabaseClient'
import useLogged, { type Food } from '@/src/context/LoggedFoodContext'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useEffect, useState, useTransition } from 'react'

const CATEGORY_OPTIONS = [
  { value: 'animal_based_proteins', label: 'Animal Based Proteins' },
  { value: 'plant_based_proteins', label: 'Plant Based Proteins' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'vegetables', label: 'Vegetables' },
  { value: 'fruits', label: 'Fruits' },
  { value: 'grains', label: 'Grains' },
  { value: 'legumes', label: 'Legumes' },
  { value: 'snacks', label: 'Snacks' },
  { value: 'sweets', label: 'Sweets' },
  { value: 'junk_food', label: 'Junk Food' },
  { value: 'fats_oils', label: 'Fats/Oils' },
  { value: 'drinks', label: 'Drinks' },
  { value: 'vitamins', label: 'Vitamins' },
  { value: 'other', label: 'Other' },
]

const STATUS_OPTIONS = [
  {
    value: 'safe',
    label: 'Safe',
    description: 'Food that usually does not trigger symptoms.',
  },
  {
    value: 'trigger',
    label: 'Trigger',
    description: 'Food that often causes reactions for you.',
  },
]

const INPUT_CLASS =
  'w-full rounded-xl border border-green-300 bg-white px-3 py-2.5 text-sm shadow-sm transition-all placeholder:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100'

const AddFood = () => {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [reactionDate, setReactionDate] = useState('')
  const [severity, setSeverity] = useState('')
  const [status, setStatus] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [notes, setNotes] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const router = useRouter()
  const searchParams = useSearchParams()
  const { addFoodLocal, food, updateFood } = useLogged()

  const foodId = searchParams.get('foodId')
  const editingFood = foodId ? food.find((f) => f.id === foodId) : undefined

  useEffect(() => {
    if (!editingFood) return

    const timer = setTimeout(() => {
      setName(editingFood.name ?? '')
      setCategory(editingFood.category ?? '')
      setStatus(editingFood.status ?? '')
      setSeverity(editingFood.severity?.toString() ?? '')
      setSymptoms(editingFood.common_symptoms ?? '')
      setNotes(editingFood.notes ?? '')
      setReactionDate(editingFood.last_reacted_at ? editingFood.last_reacted_at.slice(0, 10) : '')
    }, 0)

    return () => clearTimeout(timer)
  }, [editingFood])

  const handleAdding = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !category.trim() || !status.trim()) {
      setError('Please fill out the required fields')
      return
    }

    setError(null)
    setMessage(null)

    startTransition(async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session) {
        setError('You must be logged in to add foods')
        return
      }

      const severityNumber = severity.trim() === '' ? null : Number(severity)
      if (severityNumber !== null && (Number.isNaN(severityNumber) || severityNumber < 1 || severityNumber > 5)) {
        setError('Severity must be a number between 1 and 5')
        return
      }

      const payload = {
        user_id: session.user.id,
        name: name.trim(),
        category: category.trim(),
        status: status.trim(),
        notes: notes.trim() === '' ? null : notes.trim(),
        severity: severityNumber,
        common_symptoms: symptoms.trim() === '' ? null : symptoms.trim(),
        last_reacted_at: reactionDate.trim() === '' ? null : reactionDate,
      }

      if (foodId && editingFood) {
        try {
          await updateFood(foodId, {
            name: payload.name,
            category: payload.category,
            status: payload.status,
            severity: payload.severity,
            common_symptoms: payload.common_symptoms,
            notes: payload.notes,
            last_reacted_at: payload.last_reacted_at,
          })
          setMessage('Food updated successfully')
          router.push('/log')
          return
        } catch (err) {
          setError('Failed to update food')
          console.error(err)
          return
        }
      }

      const { data: insertedFood, error: addingError } = await supabase
        .from('user_foods')
        .insert(payload)
        .select('id, user_id, name, category, status, notes, severity, common_symptoms, last_reacted_at')
        .single()

      if (addingError) {
        console.log('addingError props:', Object.getOwnPropertyNames(addingError))
        console.log('addingError message:', addingError.message)
        console.log('addingError code:', addingError.code)
        console.log('addingError details:', addingError.details)
        console.log('addingError hint:', addingError.hint)
        console.dir(addingError)
        setError("Couldn't add food: " + (addingError.message ?? 'Unknown error (check console logs)'))
        return
      }

      if (insertedFood) {
        addFoodLocal(insertedFood as Food)
      }

      setMessage('Food item added successfully')
      setName('')
      setCategory('')
      setSeverity('')
      setSymptoms('')
      setReactionDate('')
      setNotes('')
      setStatus('')
      router.push('/log')
    })
  }

  return (
    <div className="p-4 md:p-6 mt-3 md:mt-5 flex flex-col items-center">
      <div className="w-full max-w-6xl mb-5 rounded-2xl border border-green-100 bg-linear-to-r from-green-50 via-white to-emerald-50 p-4 md:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-medium tracking-tight">{editingFood ? 'Edit Food' : 'Add Food'}</h1>
            <p className="text-sm text-gray-600 mt-1">
              {editingFood ? 'Update food details and reaction history.' : 'Save foods as safe or trigger for easier tracking.'}
            </p>
          </div>
          <Link
            href="/log"
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:border-green-400 hover:text-green-700"
          >
            Back to Food Log
          </Link>
        </div>
      </div>

      <form onSubmit={handleAdding} className="w-full max-w-6xl space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 rounded-2xl border border-green-200 bg-linear-to-br from-white to-green-50/60 p-4 md:p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-green-200 pb-3">
              <h2 className="text-lg font-semibold text-gray-900">Food Details</h2>
              <p className="text-xs text-gray-500">Fields marked * are required</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="food-name" className="text-sm font-medium text-gray-800">
                Food Name *
              </label>
              <input
                id="food-name"
                type="text"
                placeholder="e.g. Greek yogurt"
                className={INPUT_CLASS}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-800">Status *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STATUS_OPTIONS.map((option) => {
                  const selected = status === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setStatus(option.value)}
                      className={`text-left rounded-xl border p-3 transition-all cursor-pointer ${
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <div className="space-y-1.5">
                <label htmlFor="food-category" className="text-sm font-medium text-gray-800">
                  Category *
                </label>
                <select id="food-category" value={category} onChange={(e) => setCategory(e.target.value)} className={INPUT_CLASS}>
                  <option value="" disabled>
                    Select a category
                  </option>
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="food-severity" className="text-sm font-medium text-gray-800">
                  Pain Severity (1-5)
                </label>
                <input
                  id="food-severity"
                  type="number"
                  min={1}
                  max={5}
                  placeholder="Optional"
                  className={INPUT_CLASS}
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label htmlFor="reaction-date" className="text-sm font-medium text-gray-800">
                  Date of Last Reaction
                </label>
                <input
                  id="reaction-date"
                  type="date"
                  className={INPUT_CLASS}
                  value={reactionDate}
                  onChange={(e) => setReactionDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="food-symptoms" className="text-sm font-medium text-gray-800">
                Common Symptoms
              </label>
              <input
                id="food-symptoms"
                type="text"
                placeholder="e.g. bloating, cramps"
                className={INPUT_CLASS}
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="food-notes" className="text-sm font-medium text-gray-800">
                  Notes
                </label>
                <span className="text-xs text-gray-500">{notes.length} characters</span>
              </div>
              <textarea
                id="food-notes"
                rows={4}
                className={INPUT_CLASS}
                placeholder="Optional details about quantity, preparation, or context."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <aside className="rounded-2xl border border-green-200 bg-white p-4 md:p-5 shadow-sm space-y-4 h-fit">
            <div className="rounded-xl border border-green-200 bg-green-50/60 p-3">
              <h3 className="text-sm font-semibold text-green-900">Preview</h3>
              <p className="mt-2 text-sm text-gray-700">
                <span className="font-medium">Name:</span> {name.trim() || 'Not set'}
              </p>
              <p className="mt-1 text-sm text-gray-700">
                <span className="font-medium">Status:</span> {status || 'Not set'}
              </p>
              <p className="mt-1 text-sm text-gray-700">
                <span className="font-medium">Category:</span> {category || 'Not set'}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <h3 className="text-sm font-semibold text-gray-900">Tips</h3>
              <ul className="mt-2 space-y-1 text-xs text-gray-600">
                <li>Use specific names like &quot;Whole milk yogurt&quot;.</li>
                <li>Add symptoms to make trigger patterns easier to spot.</li>
                <li>Keep notes short and focused on context and quantity.</li>
              </ul>
            </div>

            <AdSenseAd
              slot="4563997002"
              label="Suggested"
              description="A small sponsored placement that stays out of your food logging flow."
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

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Link
            href="/log"
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:border-green-400 hover:text-green-700"
          >
            Cancel
          </Link>
          <button
            className="inline-flex items-center justify-center rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            disabled={isPending}
          >
            {isPending ? (editingFood ? 'Updating...' : 'Adding...') : editingFood ? 'Update Food' : 'Add Food'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddFood
