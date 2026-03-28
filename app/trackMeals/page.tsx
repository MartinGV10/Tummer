'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import useMeals, { type Meal } from '@/src/context/TrackedMealsContext'
import { useProfile } from '@/src/context/ProfileContext'
import { formatMacroValue, sumMealMacros } from '@/src/shared/meals'
import { Calendar } from '../components/ui/calendar'
import { IconPencil, IconTrash } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import AdSenseAd from '@/app/components/AdSenseAd'

function formatLoggedAmount(quantity: number, unit: string | null) {
  const amount = formatMacroValue(quantity, quantity % 1 === 0 ? 0 : 2)
  return unit?.trim() ? `${amount} ${unit.trim()}` : amount
}

export default function TrackMeals() {
  const { meals, loading, error, deleteMeal } = useMeals()
  const { profile } = useProfile()
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const isPremium = Boolean(profile?.is_premium)

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

  const getMealsByType = (mealType: Meal['meal_type']) => meals.filter((meal) => meal.meal_type === mealType && isSameDay(meal.eaten_at, date))

  const onPickDate = (pickedDate: Date | undefined) => {
    setDate(pickedDate)
    setOpen(false)
  }

  const changeDateBy = (days: number) => {
    const base = date ? new Date(date) : new Date()
    base.setDate(base.getDate() + days)
    setDate(base)
  }

  return (
    <div className="mt-3 flex flex-col items-center p-4 md:mt-5 md:p-6">
      <div className="mb-4 flex w-full max-w-6xl flex-col gap-3 border-b-2 border-b-green-600/70 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-medium tracking-tight">Track Meals</h1>
          <p className="mt-1 text-sm text-gray-600">View meals by day and quickly update entries.</p>
        </div>
        <Link
          href="/trackMeals/addMeal"
          className="inline-flex items-center justify-center rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-lg"
        >
          Add Meal
        </Link>
      </div>

      <div className="mb-6 w-full max-w-6xl rounded-2xl border border-green-100 bg-linear-to-r from-green-50 via-white to-emerald-50 p-3 shadow-sm md:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex items-center gap-2">
            <button
              type="button"
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:border-green-400 hover:text-green-700 cursor-pointer"
              onClick={() => changeDateBy(-1)}
              aria-label="Previous day"
            >
              {'<'}
            </button>

            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="min-w-48 rounded-xl border border-green-600 bg-green-600 px-3 py-2 text-sm font-medium text-white shadow-md transition-all cursor-pointer"
            >
              {date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Pick a date'}
            </button>

            <button
              type="button"
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:border-green-400 hover:text-green-700 cursor-pointer"
              onClick={() => changeDateBy(1)}
              aria-label="Next day"
            >
              {'>'}
            </button>

            {open && (
              <div
                className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 rounded-2xl bg-white/95 p-3 shadow-xl ring-1 ring-black/5 backdrop-blur"
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
              {date ? date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'all dates'}
            </span>
          </p>
        </div>
      </div>

      {loading ? (
        <div className="w-full max-w-6xl rounded-2xl border border-green-200 bg-white p-6 shadow-md">
          <p className="text-sm text-gray-600">Loading meals...</p>
        </div>
      ) : error ? (
        <div className="w-full max-w-6xl rounded-2xl border border-red-300 bg-white p-6 shadow-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : (
        <div className="w-full max-w-6xl space-y-6">
          {mealSections.map((section) => {
            const sectionMeals = getMealsByType(section.key)

            return (
              <section key={section.key}>
                <div className="mb-3 flex items-center justify-between border-b-2 border-b-green-600/70 pb-2">
                  <h2 className="text-2xl font-medium">{section.label}</h2>
                  <span className="rounded-full bg-green-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-green-800">
                    {sectionMeals.length} items
                  </span>
                </div>

                {sectionMeals.length === 0 ? (
                  <div className="rounded-2xl border border-green-200 bg-white p-5 shadow-md">
                    <p className="text-sm text-gray-600">No meals recorded for this section on the selected date.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
                    {sectionMeals.map((meal) => {
                      const totals = sumMealMacros(meal.meal_items)

                      return (
                        <div
                          key={meal.id}
                          className="flex flex-col space-y-3 rounded-2xl border border-green-300 bg-linear-to-br from-white to-green-50/60 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-lg font-semibold leading-tight">{meal.meal_name}</p>
                            <span className="rounded-full bg-green-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-green-800">
                              {formatMealTime(meal.eaten_at)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="box-content flex items-center rounded-lg border border-gray-200 p-1.5 text-gray-600 transition-all hover:border-green-600 hover:bg-green-600 hover:text-white cursor-pointer"
                              aria-label="Delete meal"
                              onClick={() => deleteMeal(meal.id)}
                            >
                              <IconTrash size={18} />
                            </button>
                            <button
                              type="button"
                              className="box-content flex items-center rounded-lg border border-gray-200 p-1.5 text-gray-600 transition-all hover:border-green-600 hover:bg-green-600 hover:text-white cursor-pointer"
                              aria-label="Edit meal"
                              onClick={() => router.push(`/trackMeals/addMeal?mealId=${meal.id}`)}
                            >
                              <IconPencil size={18} />
                            </button>
                          </div>

                          {meal.meal_items.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-gray-800">Foods in this meal</p>
                              <div className="flex flex-wrap gap-2">
                                {meal.meal_items.map((item) => (
                                  <span key={item.id} className="rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs text-green-900">
                                    {formatLoggedAmount(item.quantity, item.unit)} {item.food_name}
                                  </span>
                                ))}
                              </div>
                              <p className="text-xs text-gray-600">
                                {formatMacroValue(totals.calories, 0)} cal
                                {isPremium
                                  ? ` | ${formatMacroValue(totals.protein_g)}g protein | ${formatMacroValue(totals.carbs_g)}g carbs | ${formatMacroValue(totals.fat_g)}g fat`
                                  : ''}
                              </p>
                            </div>
                          )}

                          <p className="text-sm text-gray-700">
                            <span className="font-medium text-gray-800">Notes:</span> {meal.notes || 'No notes'}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })}

          <div className="pt-2">
            <AdSenseAd
              slot="4563997002"
              label="Suggested"
              description="A sponsored placement below your meal history."
            />
          </div>
        </div>
      )}
    </div>
  )
}
