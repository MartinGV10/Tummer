'use client'
import { useProfile } from '@/src/context/ProfileContext'
import { IconApple, IconBottle, IconCandy, IconCarrot, IconCookie, IconDropCircle, IconFilter, IconMeat, IconMeatOff, IconMilk, IconPill, IconPizza, IconSoup, IconTrash, IconWheat } from '@tabler/icons-react'
import React from 'react'
import { DropdownMenu } from '@radix-ui/themes'

const Log = () => {
  const { profile } = useProfile()

  if (!profile) {
    return null
  }

  return (
    <div className="p-6 mt-5 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-6xl flex items-center justify-between mb-4 border-b-2 border-b-green-600 pb-3">
        <h1 className="text-3xl font-medium flex items-center gap-3">Log Foods</h1>
        <div className='flex justify-around gap-5 bg-white p-3 cursor-pointer rounded-4xl shadow-md hover:shadow-lg transition-all hover:bg-green-600 hover:text-white'>
          <p className='font-medium'>Add Food</p>
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
      <div className='grid grid-cols-4 gap-4 w-full max-w-6xl'>
        <div className='flex flex-col bg-white border-3 border-green-600 p-5 rounded-md shadow-lg space-y-2'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-x-4'>
              <IconCookie className='border-3 box-content p-1.25 border-green-800 rounded-2xl shadow-md' size={30}></IconCookie>
              <p className='text-lg font-medium'>CC Cookie</p>
            </div>
            <IconTrash className='hover:bg-green-600 box-content p-1.25 rounded-lg hover:text-white transition-all'></IconTrash>
          </div>
          <div>
            <p className=''>Can't have bc x, y, z reasons</p>
          </div>
        </div>
        <div className='flex flex-col bg-white border-3 border-green-600 p-5 rounded-md shadow-lg space-y-2'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-x-4'>
              <IconCookie className='border-3 box-content p-1.25 border-green-800 rounded-2xl shadow-md' size={30}></IconCookie>
              <p className='text-lg font-medium'>CC Cookie</p>
            </div>
            <IconTrash className='hover:bg-green-600 box-content p-1.25 rounded-lg hover:text-white transition-all'></IconTrash>
          </div>
          <div>
            <p className=''>Can't have bc x, y, z reasons</p>
          </div>
        </div>
        <div className='flex flex-col bg-white border-3 border-green-600 p-5 rounded-md shadow-lg space-y-2'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-x-4'>
              <IconCookie className='border-3 box-content p-1.25 border-green-800 rounded-2xl shadow-md' size={30}></IconCookie>
              <p className='text-lg font-medium'>CC Cookie</p>
            </div>
            <IconTrash className='hover:bg-green-600 box-content p-1.25 rounded-lg hover:text-white transition-all'></IconTrash>
          </div>
          <div>
            <p className=''>Can't have bc x, y, z reasons</p>
          </div>
        </div>
        <div className='flex flex-col bg-white border-3 border-green-600 p-5 rounded-md shadow-lg space-y-2'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-x-4'>
              <IconCookie className='border-3 box-content p-1.25 border-green-800 rounded-2xl shadow-md' size={30}></IconCookie>
              <p className='text-lg font-medium'>CC Cookie</p>
            </div>
            <IconTrash className='hover:bg-green-600 box-content p-1.25 rounded-lg hover:text-white transition-all'></IconTrash>
          </div>
          <div>
            <p className=''>Can't have bc x, y, z reasons</p>
          </div>
        </div>
        <div className='flex flex-col bg-white border-3 border-green-600 p-5 rounded-md shadow-lg space-y-2'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-x-4'>
              <IconCookie className='border-3 box-content p-1.25 border-green-800 rounded-2xl shadow-md' size={30}></IconCookie>
              <p className='text-lg font-medium'>CC Cookie</p>
            </div>
            <IconTrash className='hover:bg-green-600 box-content p-1.25 rounded-lg hover:text-white transition-all'></IconTrash>
          </div>
          <div>
            <p className=''>Can't have bc x, y, z reasons</p>
          </div>
        </div>
        <div className='flex flex-col bg-white border-3 border-green-600 p-5 rounded-md shadow-lg space-y-2'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-x-4'>
              <IconCookie className='border-3 box-content p-1.25 border-green-800 rounded-2xl shadow-md' size={30}></IconCookie>
              <p className='text-lg font-medium'>CC Cookie</p>
            </div>
            <IconTrash className='hover:bg-green-600 box-content p-1.25 rounded-lg hover:text-white transition-all'></IconTrash>
          </div>
          <div>
            <p className=''>Can't have bc x, y, z reasons</p>
          </div>
        </div>
        <div className='flex flex-col bg-white border-3 border-green-600 p-5 rounded-md shadow-lg space-y-2'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-x-4'>
              <IconCookie className='border-3 box-content p-1.25 border-green-800 rounded-2xl shadow-md' size={30}></IconCookie>
              <p className='text-lg font-medium'>CC Cookie</p>
            </div>
            <IconTrash className='hover:bg-green-600 box-content p-1.25 rounded-lg hover:text-white transition-all'></IconTrash>
          </div>
          <div>
            <p className=''>Can't have bc x, y, z reasons</p>
          </div>
        </div>
        <div className='flex flex-col bg-white border-3 border-green-600 p-5 rounded-md shadow-lg space-y-2'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-x-4'>
              <IconCookie className='border-3 box-content p-1.25 border-green-800 rounded-2xl shadow-md' size={30}></IconCookie>
              <p className='text-lg font-medium'>CC Cookie</p>
            </div>
            <IconTrash className='hover:bg-green-600 box-content p-1.25 rounded-lg hover:text-white transition-all'></IconTrash>
          </div>
          <div>
            <p className=''>Can't have bc x, y, z reasons</p>
          </div>
        </div>
        <div className='flex flex-col bg-white border-3 border-green-600 p-5 rounded-md shadow-lg space-y-2'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-x-4'>
              <IconCookie className='border-3 box-content p-1.25 border-green-800 rounded-2xl shadow-md' size={30}></IconCookie>
              <p className='text-lg font-medium'>CC Cookie</p>
            </div>
            <IconTrash className='hover:bg-green-600 box-content p-1.25 rounded-lg hover:text-white transition-all'></IconTrash>
          </div>
          <div>
            <p className=''>Can't have bc x, y, z reasons</p>
          </div>
        </div>
        <div className='flex flex-col bg-white border-3 border-green-600 p-5 rounded-md shadow-lg space-y-2'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-x-4'>
              <IconCookie className='border-3 box-content p-1.25 border-green-800 rounded-2xl shadow-md' size={30}></IconCookie>
              <p className='text-lg font-medium'>CC Cookie</p>
            </div>
            <IconTrash className='hover:bg-green-600 box-content p-1.25 rounded-lg hover:text-white transition-all'></IconTrash>
          </div>
          <div>
            <p className=''>Can't have bc x, y, z reasons</p>
          </div>
        </div>
        <div className='flex flex-col bg-white border-3 border-green-600 p-5 rounded-md shadow-lg space-y-2'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-x-4'>
              <IconCookie className='border-3 box-content p-1.25 border-green-800 rounded-2xl shadow-md' size={30}></IconCookie>
              <p className='text-lg font-medium'>CC Cookie</p>
            </div>
            <IconTrash className='hover:bg-green-600 box-content p-1.25 rounded-lg hover:text-white transition-all'></IconTrash>
          </div>
          <div>
            <p className=''>Can't have bc x, y, z reasons</p>
          </div>
        </div>
        <div className='flex flex-col bg-white border-3 border-green-600 p-5 rounded-md shadow-lg space-y-2'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-x-4'>
              <IconCookie className='border-3 box-content p-1.25 border-green-800 rounded-2xl shadow-md' size={30}></IconCookie>
              <p className='text-lg font-medium'>CC Cookie</p>
            </div>
            <IconTrash className='hover:bg-green-600 box-content p-1.25 rounded-lg hover:text-white transition-all'></IconTrash>
          </div>
          <div>
            <p className=''>Can't have bc x, y, z reasons</p>
          </div>
        </div>

      </div>

    </div>
  )
}

export default Log