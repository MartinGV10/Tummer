'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import useMeals, { type Meal } from '@/src/context/TrackedMealsContext'
import { Calendar } from '../components/ui/calendar'
import { IconPencil, IconTrash } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'

const TrackMeals = () => {
  const { meals, loading, error, deleteMeal } = useMeals()
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [open, setOpen] = useState(false)

  const router = useRouter()

  const mealSections: Array<{ key: Meal['meal_type']; label: string }> = [
    { key: 'breakfast', label: 'Breakfast' },
    { key: 'lunch', label: 'Lunch' },
    { key: 'dinner', label: 'Dinner' },
    { key: 'snack', label: 'Snacks' },
  ]

  const formatMealTime = (eatenAt: string) => {
    const parsed = new Date(eatenAt)
    if (Number.isNaN(parsed.getTime())) return 'Unknown time'
    return parsed.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  const isSameDay = (value: string, selectedDate?: Date) => {
    if (!selectedDate) return true
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return false

    return (
      parsed.getFullYear() === selectedDate.getFullYear() &&
      parsed.getMonth() === selectedDate.getMonth() &&
      parsed.getDate() === selectedDate.getDate()
    )
  }

  const getMealsByType = (mealType: Meal['meal_type']) => {
    return meals.filter((meal) => meal.meal_type === mealType && isSameDay(meal.eaten_at, date))
  }

  const onPickDate = (d: Date | undefined) => {
    setDate(d)
    setOpen(false)
  }

  const changeDateBy = (days: number) => {
    const base = date ? new Date(date) : new Date()
    base.setDate(base.getDate() + days)
    setDate(base)
  }

  return (
    <div className="p-4 md:p-6 mt-3 md:mt-5 flex flex-col items-center">
      <div className="w-full max-w-6xl flex flex-col md:flex-row md:items-center md:justify-between mb-4 border-b-2 border-b-green-600/70 pb-4 gap-3">
        <div>
          <h1 className="text-3xl font-medium tracking-tight">Track Meals</h1>
          <p className="text-sm text-gray-600 mt-1">View meals by day and quickly update entries.</p>
        </div>
        <Link
          href="/trackMeals/addMeal"
          className="inline-flex items-center justify-center rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-lg"
        >
          Add Meal
        </Link>
      </div>

      <div className="w-full max-w-6xl mb-6 rounded-2xl border border-green-100 bg-linear-to-r from-green-50 via-white to-emerald-50 p-3 md:p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="relative flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-2 rounded-xl font-medium transition-all cursor-pointer border text-sm bg-white text-gray-700 border-gray-200 hover:border-green-400 hover:text-green-700"
              onClick={() => changeDateBy(-1)}
              aria-label="Previous day"
            >
              {'<'}
            </button>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="px-3 py-2 rounded-xl font-medium transition-all cursor-pointer border text-sm bg-green-600 text-white border-green-600 shadow-md min-w-48"
            >
              {date
                ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Pick a date'}
            </button>

            <button
              type="button"
              className="px-3 py-2 rounded-xl font-medium transition-all cursor-pointer border text-sm bg-white text-gray-700 border-gray-200 hover:border-green-400 hover:text-green-700"
              onClick={() => changeDateBy(1)}
              aria-label="Next day"
            >
              {'>'}
            </button>

            {open && (
              <div
                className="absolute top-full left-1/2 z-50 mt-2 -translate-x-1/2 rounded-2xl bg-white/95 p-3 shadow-xl ring-1 ring-black/5 backdrop-blur"
                style={
                  {
                    '--primary': 'oklch(0.62 0.16 145)',
                    '--primary-foreground': 'white',
                    '--accent': 'oklch(0.95 0.04 145)',
                    '--accent-foreground': 'oklch(0.30 0.06 145)',
                    '--muted-foreground': 'oklch(0.50 0.02 145)',
                  } as React.CSSProperties
                }
              >
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={onPickDate}
                  classNames={{
                    today: 'bg-green-100 text-green-900 rounded-md',
                    outside: 'text-gray-300',
                    selected: 'bg-green-300 text-green-900 rounded-md font-medium',
                    day_button:
                      'transition-colors hover:bg-green-100 hover:text-green-900 group-data-[focused=true]/day:border-2 group-data-[focused=true]/day:ring-0 focus-visible:ring-0 focus-visible:outline-none',
                  }}
                />
              </div>
            )}
          </div>

          <p className="text-sm text-gray-700">
            Showing meals for{' '}
            <span className="font-medium">
              {date
                ? date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                : 'all dates'}
            </span>
          </p>
        </div>
      </div>

      {loading ? (
        <div className="w-full max-w-6xl bg-white p-6 rounded-2xl shadow-md border border-green-200">
          <p className="text-sm text-gray-600">Loading meals...</p>
        </div>
      ) : error ? (
        <div className="w-full max-w-6xl bg-white p-6 rounded-2xl shadow-md border border-red-300">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : (
        <div className="w-full max-w-6xl space-y-6">
          {mealSections.map((section) => {
            const sectionMeals = getMealsByType(section.key)

            return (
              <section key={section.key}>
                <div className="flex items-center justify-between mb-3 border-b-2 border-b-green-600/70 pb-2">
                  <h2 className="text-2xl font-medium">{section.label}</h2>
                  <span className="text-[11px] px-2 py-1 rounded-full font-semibold uppercase tracking-wide bg-green-100 text-green-800">
                    {sectionMeals.length} items
                  </span>
                </div>

                {sectionMeals.length === 0 ? (
                  <div className="bg-white p-5 rounded-2xl shadow-md border border-green-200">
                    <p className="text-sm text-gray-600">No meals recorded for this section on the selected date.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                    {sectionMeals.map((meal) => (
                      <div
                        key={meal.id}
                        className="flex flex-col bg-white border border-green-300 bg-linear-to-br from-white to-green-50/60 p-5 rounded-2xl shadow-sm space-y-3 transition-all hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-lg font-semibold leading-tight">{meal.meal_name}</p>
                          <span className="text-[11px] px-2 py-1 rounded-full font-semibold uppercase tracking-wide bg-green-100 text-green-800">
                            {formatMealTime(meal.eaten_at)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="box-content cursor-pointer p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-green-600 hover:border-green-600 hover:text-white transition-all flex items-center"
                            aria-label="Delete meal"
                            onClick={() => deleteMeal(meal.id)}
                          >
                            <IconTrash size={18} />
                          </button>
                          <button
                            type="button"
                            className="box-content cursor-pointer p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-green-600 hover:border-green-600 hover:text-white transition-all flex items-center"
                            aria-label="Edit meal"
                            onClick={() => router.push(`/trackMeals/addMeal?mealId=${meal.id}`)}
                          >
                            <IconPencil size={18} />
                          </button>
                        </div>

                        <p className="text-sm text-gray-700">
                          <span className="font-medium text-gray-800">Notes:</span> {meal.notes || 'No notes'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default TrackMeals
