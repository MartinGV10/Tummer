'use client'
import { useProfile } from '@/src/context/ProfileContext'
import { IconApple, IconBottle, IconCandy, IconCarrot, IconCookie, IconDropCircle, IconFilter, IconMeat, IconMeatOff, IconMilk, IconPill, IconPizza, IconSoup, IconTrash, IconWheat } from '@tabler/icons-react'
import React from 'react'
import { DropdownMenu } from '@radix-ui/themes'
import useLogged from '@/src/context/LoggedFoodContext'
import Link from 'next/link'

const Log = () => {
  const { profile } = useProfile()
  const { food, loading, error } = useLogged()

  if (!profile) {
    return null
  }

  if (!food) {
    return null
  }

  const categoryIconMap: Record<string, React.ElementType> = {
    animal_based_proteins: IconMeat,
    plant_based_proteins: IconMeatOff,
    dairy: IconMilk,
    vegetables: IconCarrot,
    fruits: IconApple,
    grains: IconWheat,
    legumes: IconSoup,
    snacks: IconCookie,
    sweets: IconCandy,
    junk_food: IconPizza,
    fats_oils: IconDropCircle,
    drinks: IconBottle,
    vitamins: IconPill,
    other: IconCookie,
  }

  return (
    <div className="p-6 mt-5 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-6xl flex items-center justify-between mb-4 border-b-2 border-b-green-600 pb-3">
        <h1 className="text-3xl font-medium flex items-center gap-3">Log Foods</h1>
        <div className='flex justify-around gap-5 bg-white p-3 cursor-pointer rounded-4xl shadow-md hover:shadow-lg transition-all hover:bg-green-600 hover:text-white'>
          <Link href='/log/addFood' className='font-medium'>Add Food</Link>
        </div>
      </div>

      {/* Buttons */}
      <div className='w-full max-w-6xl pt-2 rounded-2xl flex mb-5 items-center justify-between'>
        <div className='flex gap-5'>
          <button className='bg-white p-2 rounded-xl shadow-md font-medium hover:bg-green-600 transition-all cursor-pointer hover:text-white'>All Foods</button>
          <button className='bg-white p-2 rounded-xl shadow-md font-medium hover:bg-green-600 transition-all cursor-pointer hover:text-white'>Triggers</button>
          <button className='bg-white p-2 rounded-xl shadow-md font-medium hover:bg-green-600 transition-all cursor-pointer hover:text-white'>Safe Foods</button>
        </div>
        <div>
          <button className='bg-white p-2 rounded-xl shadow-md font-medium hover:bg-green-600 transition-all cursor-pointer hover:text-white'>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <IconFilter></IconFilter>
            </DropdownMenu.Trigger>

            <DropdownMenu.Content>
              <DropdownMenu.Item>Animal Based Proteins</DropdownMenu.Item>
              <DropdownMenu.Item>Plant Based Proteins</DropdownMenu.Item>
              <DropdownMenu.Item>Dairy</DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item>Vegetables</DropdownMenu.Item>
              <DropdownMenu.Item>Fruits</DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item>Grains</DropdownMenu.Item>
              <DropdownMenu.Item>Legumes</DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item>Snacks</DropdownMenu.Item>
              <DropdownMenu.Item>Sweets</DropdownMenu.Item>
              <DropdownMenu.Item>Junk Food</DropdownMenu.Item>
              <DropdownMenu.Item>Fats/Oils</DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item>Drinks</DropdownMenu.Item>
              <DropdownMenu.Item>Vitamins</DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item>Other</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
          </button>
        </div>
      </div>

      {/* Foods */}
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-6xl">
        {loading && !food && !error ? (
          <div className="col-span-full bg-white p-5 rounded-md shadow-lg border-2 border-green-600">
            <p className="text-sm text-gray-600">Loading foods...</p>
          </div>
        ) : error ? (
          <div className="col-span-full bg-white p-5 rounded-md shadow-lg border-2 border-red-500">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        ) : food.length === 0 ? (
          <div className="col-span-full bg-white p-5 rounded-md shadow-lg border-2 border-green-600">
            <p className="text-sm text-gray-600">No foods logged yet.</p>
          </div>
        ) : (
          food.map((f) => {
            const Icon = categoryIconMap[f.category] ?? IconCookie

            return (
              <div
                className="flex flex-col bg-white border-2 border-green-600 p-5 rounded-md shadow-lg space-y-2"
                key={f.id}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-x-4">
                    <Icon className="border-2 box-content p-1 border-green-800 rounded-2xl shadow-md" size={30} />
                    <p className="text-lg font-medium">{f.name}</p>
                  </div>

                  <button
                    type="button"
                    className="hover:bg-green-600 box-content cursor-pointer p-1 rounded-lg hover:text-white transition-all"
                    aria-label="Delete food"
                  >
                    <IconTrash size={22} />
                  </button>
                </div>

                <div className="flex flex-col text-sm text-gray-700 gap-1">
                  <p>Notes: {f.notes ?? '—'}</p>
                  <p>Pain Severity: {f.severity ?? '—'}</p>
                  <p>Symptoms: {f.common_symptoms ?? '—'}</p>
                  <p>{f.last_reacted_at ? `Last Reaction Date: ${f.last_reacted_at}` : 'No recorded reactions'}</p>
                </div>
              </div>
            )
          })
        )}
      </div>

    </div>
  )
}

export default Log