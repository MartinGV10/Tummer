'use client'
import { useHealth } from '@/src/context/HealthContext'
import { Calendar } from '../components/ui/calendar'
import Link from 'next/link'
import React, { useState } from 'react'
import { RadioGroup, Separator, Switch } from '@radix-ui/themes'
import { IconFileSmile, IconMoodAnnoyed, IconMoodCry, IconMoodEmpty, IconMoodHappy, IconMoodSad, IconMoodSmile } from '@tabler/icons-react'

const logHealth = () => {
  const { daily, symptoms, bowels, loading, error } = useHealth()
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [open, setOpen] = useState(false)

  const [feeling, setFeeling] = useState('')
  const [stress, setStress] = useState('')
  const [energy, setEnergy] = useState('')
  const [sleep, setSleep] = useState('')
  const [hydrate, setHydrate] = useState('')

  const onPickDate = (d: Date | undefined) => {
    setDate(d)
    setOpen(false)
  }

  const changeDateBy = (days: number) => {
    const base = date ? new Date(date) : new Date()
    base.setDate(base.getDate() + days)
    setDate(base)
  }

  const handleForm = (e: React.FormEvent) => {
    e.preventDefault()
  }

  return (
    <div className="p-4 md:p-6 mt-3 md:mt-5 flex flex-col items-center">
      <div className="w-full max-w-6xl flex flex-col md:flex-row md:items-center md:justify-between mb-4 border-b-2 border-b-green-600/70 pb-4 gap-3">
        <div>
          <h1 className="text-3xl font-medium tracking-tight">Log Health</h1>
          <p className="text-sm text-gray-600 mt-1">Track any symptoms and bowel movements to receive insights.</p>
        </div>
        {/* <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-lg"
        >
          Add Food
        </Link> */}

        
      </div>

      <div className='w-full max-w-6xl mb-6 rounded-2xl border border-green-100 bg-linear-to-r from-green-50 via-white to-emerald-50 p-3 md:p-4 shadow-sm'>
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
        </div>
      </div>

      <div className="w-full max-w-6xl space-y-6">
        <div className='flex space-x-5'> 
          <div className='flex flex-col bg-white border border-green-300 bg-linear-to-br from-white to-green-50/60 p-5 rounded-2xl shadow-sm space-y-3 transition-all w-3/4'>
            <form onSubmit={handleForm} className='flex flex-col space-y-3'>
              <div className='flex justify-between items-center'>
                <h1 className='text-lg font-semibold leading-tight'>Daily Check-in</h1>
                <button className='inline-flex items-center justify-center rounded-xl bg-green-600 px-4 py-1.5 text-sm font-medium text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-lg cursor-pointer'>Save</button>
              </div>
              <div className='flex items-center justify-between'>
                <p>How are you feeling?</p>
                <div className='flex items-center space-x-3'>
                  <IconMoodSad size={35} className='hover:text-green-700 rounded-2xl transition-all cursor-pointer'/>
                  <IconMoodAnnoyed size={35} className='hover:text-green-700 rounded-2xl transition-all cursor-pointer'/>
                  <IconMoodEmpty size={35} className='hover:text-green-700 rounded-2xl transition-all cursor-pointer'/>
                  <IconMoodSmile size={35} className='hover:text-green-700 rounded-2xl transition-all cursor-pointer'/>
                  <IconMoodHappy size={35} className='hover:text-green-700 rounded-2xl transition-all cursor-pointer'/>
                </div>
              </div>

              <Separator size='4' color='green'/>

              <div className='flex items-center justify-between'>
                <p>How stressed are you?</p>
                <div className='flex items-center space-x-2 justify-around'>
                  <p>Low</p>
                  <RadioGroup.Root
                    orientation='horizontal'
                    className='!flex !flex-row !items-center !gap-4'
                    style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem' }}
                  >
                    <RadioGroup.Item value='1'></RadioGroup.Item>
                    <RadioGroup.Item value='2'></RadioGroup.Item>
                    <RadioGroup.Item value='3'></RadioGroup.Item>
                    <RadioGroup.Item value='4'></RadioGroup.Item>
                    <RadioGroup.Item value='5'></RadioGroup.Item>
                  </RadioGroup.Root>
                  <p>High</p>
                </div>
              </div>

              <Separator size='4' color='green'/>

              <div className='flex items-center justify-between'>
                <p>How energetic do you feel?</p>
                <div className='flex items-center space-x-2 justify-around'>
                  <p>Low</p>
                  <RadioGroup.Root
                    orientation='horizontal'
                    className='!flex !flex-row !items-center !gap-4'
                    style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem' }}
                  >
                    <RadioGroup.Item value='1'></RadioGroup.Item>
                    <RadioGroup.Item value='2'></RadioGroup.Item>
                    <RadioGroup.Item value='3'></RadioGroup.Item>
                    <RadioGroup.Item value='4'></RadioGroup.Item>
                    <RadioGroup.Item value='5'></RadioGroup.Item>
                  </RadioGroup.Root>
                  <p>High</p>
                </div>
              </div>

              <Separator size='4' color='green'/>

              <div className='flex items-center justify-between'>
                <p>How much sleep did you get?</p>
                <input type="number" className='bg-gray-50 rounded-2xl border border-green-300 shadow-md w-1/9 text-center font-medium' onChange={(e) => setSleep(e.target.value)}/>
              </div>

              <Separator size='4' color='green'/>
              
              <div className='flex items-center justify-between'>
                <p>How much hydrated are you?</p>
                <div className='flex items-center space-x-2 justify-around'>
                  <p>Low</p>
                  <RadioGroup.Root
                    orientation='horizontal'
                    className='!flex !flex-row !items-center !gap-4'
                    style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem' }}
                  >
                    <RadioGroup.Item value='1'></RadioGroup.Item>
                    <RadioGroup.Item value='2'></RadioGroup.Item>
                    <RadioGroup.Item value='3'></RadioGroup.Item>
                    <RadioGroup.Item value='4'></RadioGroup.Item>
                    <RadioGroup.Item value='5'></RadioGroup.Item>
                  </RadioGroup.Root>
                  <p>High</p>
                </div>
              </div>
            </form>
          </div>
          <div className='flex flex-col bg-white border border-green-300 bg-linear-to-br from-white to-green-50/60 p-5 rounded-2xl shadow-sm space-y-3 transition-all w-1/3'>
            sd
          </div>
        </div>
      </div>

    </div>
  )
}

export default logHealth
