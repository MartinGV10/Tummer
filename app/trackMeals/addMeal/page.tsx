'use client'
import useMeals from '@/src/context/TrackedMealsContext'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useEffect, useState, useTransition } from 'react'

const AddMealPage = () => {
  const [name, setName] = useState('')
  const [type, setType] = useState('breakfast')
  const [eatenAt, setEatenAt] = useState('')
  const [notes, setNotes] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const router = useRouter()
  const searchParams = useSearchParams()
  const { addMeal, error: addMealError, updateMeal, meals } = useMeals()
  const mealId = searchParams.get('mealId')
  const editingMeal = mealId ? meals.find(m => m.id === mealId) : undefined

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
    }, 0)

    return () => clearTimeout(timer)
  }, [editingMeal])

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
      
      setMessage('Meal added successfully')
      router.push('/trackMeals')


    })
  }

  return (
    <div className="p-6 mt-5 flex flex-col items-center">
      <div className="w-full max-w-6xl flex items-center justify-between mb-4 border-b-2 border-b-green-600 pb-3">
        <h1 className="text-3xl font-medium flex items-center gap-3">{editingMeal ? 'Edit Meal' : 'Add Meals'}</h1>
      </div>

      <form onSubmit={handleAdding} className='flex flex-col w-full max-w-6xl pt-2 justify-between align-center pb-2 space-y-5'>
        <div className='flex space-x-5'>
          <div className='flex flex-col space-y-5 w-2/3'>
            <div>
              <p className='font-medium'>Food Name</p>
              <input type="text" className='shadow-md w-full bg-gray-50 border-2 rounded-lg p-2 border-green-600' value={name} onChange={(e) => setName(e.target.value)}/>
            </div>

            <div>
              <p className='font-medium'>Food Type</p>
              <select className='shadow-md w-full bg-gray-50 border-2 rounded-lg p-2 border-green-600' value={type} onChange={(e) => setType(e.target.value)}>
                <option value=''>Select a Type</option>
                <option value='breakfast'>Breakfast</option>
                <option value='lunch'>Lunch</option>
                <option value='dinner'>Dinner</option>
                <option value='snack'>Snack</option>
                <option value='other'>Other</option>
              </select>
            </div>

          </div>

          <div className='flex flex-col space-y-5 w-2/3'>
            <div>
              <p className='font-medium'>Eaten At (Date and Time)</p>
              <input type="datetime-local" className='shadow-md w-full bg-gray-50 border-2 rounded-lg p-2 border-green-600' value={eatenAt} onChange={(e) => setEatenAt(e.target.value)}/>
            </div>

            <div>
              <p className='font-medium'>Notes</p>
              <input type="text" className='shadow-md w-full bg-gray-50 border-2 rounded-lg p-2 border-green-600' value={notes} onChange={(e) => setNotes(e.target.value)}/>
            </div>
          </div>
        </div>

        <button className='font-medium shadow-lg transition-all cursor-pointer bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 disabled:opacity-50' disabled={isPending}>
          {isPending ? (editingMeal ? 'Updating...' : 'Adding...') : (editingMeal ? 'Update Meal' : 'Add Meal')}
        </button>
      </form>
      {message && (
        <div>
          {message}
        </div>
      )}
      {error && (
        <div>
          {error}
        </div>
      )}
    </div>
  )
}

export default AddMealPage
