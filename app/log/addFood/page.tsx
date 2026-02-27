'use client'
import { supabase } from '@/lib/supabaseClient'
import useLogged, { type Food } from '@/src/context/LoggedFoodContext'
import { useRouter } from 'next/navigation'
import React, { useState, useTransition } from 'react'

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
  const { addFoodLocal } = useLogged()

  const handleAdding = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !category || !status) {
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

      if (severityNumber !== null && Number.isNaN(severityNumber)) {
        setError('Severity must be a number')
        return
      }

      const payload = {
        user_id: session.user.id,
        name,
        category,
        status,
        notes: notes.trim() === '' ? null : notes,
        severity: severityNumber,
        common_symptoms: symptoms.trim() === '' ? null : symptoms,
        last_reacted_at: reactionDate.trim() === '' ? null : reactionDate
      }

      const { data: insertedFood, error: addingError } = await supabase
        .from('user_foods')
        .insert(payload)
        .select('id, user_id, name, category, status, notes, severity, common_symptoms, last_reacted_at')
        .single()

      if (addingError) {
        console.log('addingError props:', Object.getOwnPropertyNames(addingError))
        console.log('addingError message:', (addingError as any).message)
        console.log('addingError code:', (addingError as any).code)
        console.log('addingError details:', (addingError as any).details)
        console.log('addingError hint:', (addingError as any).hint)
        console.dir(addingError) // better than console.error for weird objects
        setError(
          "Couldn't add food: " +
            ((addingError as any).message ?? 'Unknown error (check console logs)')
        )
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
    <div className="p-6 mt-5 flex flex-col items-center">
      <div className="w-full max-w-6xl flex items-center justify-between mb-4 border-b-2 border-b-green-600 pb-3">
        <h1 className="text-3xl font-medium flex items-center gap-3">Add Foods</h1>
      </div>

      <form onSubmit={handleAdding} className='flex flex-col w-full max-w-6xl pt-2 justify-between align-center pb-2 space-y-5'>
        <div className='flex space-x-5'>
          <div className='flex flex-col space-y-5 w-2/3'>
            <div>
              <p className='font-medium'>Food Name</p>
              <input type="text" className='shadow-md w-full bg-gray-50 border-2 rounded-lg p-2 border-green-600' value={name} onChange={(e) => setName(e.target.value)}/>
            </div>

            <div>
              <p className='font-medium'>Status</p>
              <select className='shadow-md w-full bg-gray-50 border-2 rounded-lg p-2 border-green-600' value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value='' disabled>Select a status</option>
                <option value='safe'>Safe</option>
                <option value='trigger'>Trigger</option>
              </select>
            </div>

          </div>

          <div className="flex flex-col space-y-5 w-2/3">
            <div>
              <p className='font-medium'>Category</p>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className='shadow-md w-full bg-gray-50 border-2 rounded-lg p-2 border-green-600'
              >
                <option value='' disabled>Select a category</option>
                <option value='animal_based_proteins'>Animal Based Proteins</option>
                <option value='plant_based_proteins'>Plant Based Proteins</option>
                <option value='dairy'>Dairy</option>
                <option value='vegetables'>Vegetables</option>
                <option value='fruits'>Fruits</option>
                <option value='grains'>Grains</option>
                <option value='legumes'>Legumes</option>
                <option value='snacks'>Snacks</option>
                <option value='sweets'>Sweets</option>
                <option value='junk_food'>Junk Food</option>
                <option value='fats_oils'>Fats/Oils</option>
                <option value='drinks'>Drinks</option>
                <option value='vitamins'>Vitamins</option>
                <option value='other'>Other</option>
              </select>
            </div>

            <div>
              <p className='font-medium'>Pain Severity Level</p>
              <input type="text" placeholder='1-5' className='shadow-md w-full bg-gray-50 border-2 rounded-lg p-2 border-green-600' value={severity} onChange={(e) => setSeverity(e.target.value)}/>
            </div>
          </div>

          <div className='flex flex-col space-y-5 w-2/3'>
            <div>
              <p className='font-medium'>Common Symptoms</p>
              <input type="text" className='shadow-md w-full bg-gray-50 border-2 rounded-lg p-2 border-green-600' value={symptoms} onChange={(e) => setSymptoms(e.target.value)}/>
            </div>

            <div>
              <p className='font-medium'>Notes</p>
              <input type="text" className='shadow-md w-full bg-gray-50 border-2 rounded-lg p-2 border-green-600' value={notes} onChange={(e) => setNotes(e.target.value)}/>
            </div>
          </div>
        </div>

        <div>
          <p className='font-medium'>Date of Last Reaction</p>
          <input type="date" className='shadow-md w-full bg-gray-50 border-2 rounded-lg p-2 border-green-600' value={reactionDate} onChange={(e) => setReactionDate(e.target.value)}/>
        </div>

        <button className='font-medium shadow-lg transition-all cursor-pointer bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 disabled:opacity-50' disabled={isPending}>{isPending ? 'Adding...' : 'Add Food'}</button>
      </form>
      {message && (
        <div>
          {message}
        </div>
      )}
    </div>
  )
}

export default AddFood
