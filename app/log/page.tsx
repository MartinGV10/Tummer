'use client'
import { useProfile } from '@/src/context/ProfileContext'
import {
  IconApple,
  IconBottle,
  IconCandy,
  IconCarrot,
  IconCookie,
  IconDropCircle,
  IconFilter,
  IconMeat,
  IconMeatOff,
  IconMilk,
  IconPencil,
  IconPill,
  IconPizza,
  IconSoup,
  IconTrash,
  IconWheat,
} from '@tabler/icons-react'
import React, { useMemo, useState } from 'react'
import { DropdownMenu } from '@radix-ui/themes'
import useLogged from '@/src/context/LoggedFoodContext'
import Link from 'next/link'
import classNames from 'classnames'
import { useRouter } from 'next/navigation'

const Log = () => {
  const { profile } = useProfile()
  const { food, loading, error, deleteFood } = useLogged()
  const router = useRouter()

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

  const statusButtons: Array<{ key: 'all' | 'safe' | 'trigger'; label: string }> = [
    { key: 'all', label: 'All Foods' },
    { key: 'safe', label: 'Safe Foods' },
    { key: 'trigger', label: 'Trigger Foods' },
  ]

  const categoryOptions: Array<{ value: string; label: string }> = [
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

  const [statusFilter, setStatusFilter] = useState<'all' | 'trigger' | 'safe'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('none')

  const filterTrigSafe = useMemo(() => {
    return (food ?? []).filter((f) => {
      const matchesStatus = statusFilter === 'all' || f.status === statusFilter
      const matchesType = typeFilter === 'none' || f.category === typeFilter

      return matchesStatus && matchesType
    })
  }, [food, statusFilter, typeFilter])

  if (!profile) {
    return null
  }

  return (
    <div className="p-4 md:p-6 mt-3 md:mt-5 flex flex-col items-center">
      <div className="w-full max-w-6xl flex flex-col md:flex-row md:items-center md:justify-between mb-4 border-b-2 border-b-green-600/70 pb-4 gap-3">
        <div>
          <h1 className="text-3xl font-medium tracking-tight">Log Foods</h1>
          <p className="text-sm text-gray-600 mt-1">Track safe and trigger foods with quick filters.</p>
        </div>
        <Link
          href="/log/addFood"
          className="inline-flex items-center justify-center rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-lg"
        >
          Add Food
        </Link>
      </div>

      <div className="w-full max-w-6xl mb-6 rounded-2xl border border-green-100 bg-gradient-to-r from-green-50 via-white to-emerald-50 p-3 md:p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {statusButtons.map((button) => (
              <button
                key={button.key}
                className={classNames({
                  'px-3 py-2 rounded-xl font-medium transition-all cursor-pointer border text-sm': true,
                  'bg-green-600 text-white border-green-600 shadow-md': statusFilter === button.key,
                  'bg-white text-gray-700 border-gray-200 hover:border-green-400 hover:text-green-700': statusFilter !== button.key,
                })}
                onClick={() => setStatusFilter(button.key)}
              >
                {button.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 md:gap-5">
            <div className="text-sm text-gray-700">
              {typeFilter === 'none' ? 'No category filter' : `Category: ${typeFilter.replaceAll('_', ' ')}`}
            </div>

            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <button className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 p-2.5 shadow-sm font-medium hover:border-green-400 hover:text-green-700 transition-all cursor-pointer">
                  <IconFilter size={18} />
                  <span className="text-sm">Filter</span>
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Content>
                <DropdownMenu.Item onSelect={() => setTypeFilter('none')}>None</DropdownMenu.Item>
                <DropdownMenu.Separator />
                {categoryOptions.map((option) => (
                  <DropdownMenu.Item key={option.value} onSelect={() => setTypeFilter(option.value)}>
                    {option.label}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-6xl">
        {loading && !food && !error ? (
          <div className="col-span-full bg-white p-6 rounded-2xl shadow-md border border-green-200">
            <p className="text-sm text-gray-600">Loading foods...</p>
          </div>
        ) : error ? (
          <div className="col-span-full bg-white p-6 rounded-2xl shadow-md border border-red-300">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        ) : food.length === 0 ? (
          <div className="col-span-full bg-white p-6 rounded-2xl shadow-md border border-green-200">
            <p className="text-base text-gray-600 text-center">No foods logged yet.</p>
            <p className="text-base text-gray-600 text-center">Add foods to get started.</p>
          </div>
        ) : filterTrigSafe.length === 0 ? (
          <div className="col-span-full bg-white p-6 rounded-2xl shadow-md border border-green-200">
            <p className="text-base text-gray-700 text-center">No foods match your current filters.</p>
            <p className="text-sm text-gray-500 text-center mt-1">Try changing status or category filters.</p>
          </div>
        ) : (
          filterTrigSafe.map((f) => {
            const Icon = categoryIconMap[f.category] ?? IconCookie

            return (
              <div
                className={classNames({
                  'flex flex-col bg-white border p-5 rounded-2xl shadow-sm space-y-3 transition-all hover:-translate-y-0.5 hover:shadow-md': true,
                  'border-green-300 bg-gradient-to-br from-white to-green-50/60': f.status === 'safe',
                  'border-red-300 bg-gradient-to-br from-white to-red-50/60': f.status === 'trigger',
                })}
                key={f.id}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-x-4">
                    <Icon
                      className={classNames({
                        'border-2 box-content p-1.5 rounded-xl shadow-sm': true,
                        'border-green-800': f.status === 'safe',
                        'border-red-800': f.status === 'trigger',
                      })}
                      size={30}
                    />
                    <div>
                      <p className="text-lg font-semibold leading-tight">{f.name}</p>
                      <p className="text-xs uppercase tracking-wide text-gray-500 mt-0.5">{f.category.replaceAll('_', ' ')}</p>
                    </div>
                  </div>

                  <span
                    className={classNames({
                      'text-[11px] px-2 py-1 rounded-full font-semibold uppercase tracking-wide': true,
                      'bg-green-100 text-green-800': f.status === 'safe',
                      'bg-red-100 text-red-800': f.status === 'trigger',
                    })}
                  >
                    {f.status}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="box-content cursor-pointer p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-green-600 hover:border-green-600 hover:text-white transition-all flex items-center"
                    aria-label="Delete food"
                    onClick={() => deleteFood(f.id)}
                  >
                    <IconTrash size={18} />
                  </button>
                  <button
                    type="button"
                    className="box-content cursor-pointer p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-green-600 hover:border-green-600 hover:text-white transition-all flex items-center"
                    aria-label="Edit food"
                    onClick={() => router.push(`/log/addFood?foodId=${f.id}`)}
                  >
                    <IconPencil size={18} />
                  </button>
                </div>

                <div className="flex flex-col text-sm text-gray-700 gap-1">
                  <p>
                    <span className="font-medium text-gray-800">Notes:</span> {f.notes || 'No notes'}
                  </p>
                  <p>
                    <span className="font-medium text-gray-800">Pain Severity:</span> {f.severity ?? 'No reported pain'}
                  </p>
                  <p>
                    <span className="font-medium text-gray-800">Symptoms:</span> {f.common_symptoms || 'No reported symptoms'}
                  </p>
                  <p>
                    {/* <span className="font-medium text-gray-800">Last Reaction:</span> {f.last_reacted_at || 'No recorded reactions'} */}
                  </p>
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
