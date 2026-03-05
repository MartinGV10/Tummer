'use client'
import { useHealth } from '@/src/context/HealthContext'
import { Calendar } from '../components/ui/calendar'
import React, { useEffect, useMemo, useState } from 'react'
import { RadioGroup, Separator } from '@radix-ui/themes'
import { IconMoodAnnoyed, IconMoodEmpty, IconMoodHappy, IconMoodSad, IconMoodSmile } from '@tabler/icons-react'

function toLocalDateKey(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const LogHealth = () => {
  const { daily, refreshHealth, upsertDaily, isAuthenticated } = useHealth()
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [feeling, setFeeling] = useState('')
  const [stress, setStress] = useState('')
  const [energy, setEnergy] = useState('')
  const [sleep, setSleep] = useState('')
  const [hydrate, setHydrate] = useState('')
  const [weight, setWeight] = useState('')
  const [flareDay, setFlareDay] = useState<'unset' | 'yes' | 'no'>('unset')
  const [periodDay, setPeriodDay] = useState<'unset' | 'yes' | 'no'>('unset')
  const [medicationChanges, setMedicationChanges] = useState('')
  const [notes, setNotes] = useState('')

  const selectedDateKey = useMemo(() => {
    if (!date) return ''
    return toLocalDateKey(date)
  }, [date])

  const onPickDate = (d: Date | undefined) => {
    setDate(d)
    setOpen(false)
  }

  const changeDateBy = (days: number) => {
    const base = date ? new Date(date) : new Date()
    base.setDate(base.getDate() + days)
    setDate(base)
  }

  useEffect(() => {
    if (!selectedDateKey || !isAuthenticated) return
    void refreshHealth({ logDate: selectedDateKey })
  }, [selectedDateKey, refreshHealth, isAuthenticated])

  useEffect(() => {
    if (!daily || daily.log_date !== selectedDateKey) {
      setFeeling('')
      setStress('')
      setEnergy('')
      setSleep('')
      setHydrate('')
      setWeight('')
      setFlareDay('unset')
      setPeriodDay('unset')
      setMedicationChanges('')
      setNotes('')
      return
    }

    setFeeling(daily.overall_feeling?.toString() ?? '')
    setStress(daily.stress_level?.toString() ?? '')
    setEnergy(daily.energy_level?.toString() ?? '')
    setSleep(daily.sleep_hours?.toString() ?? '')
    setHydrate(daily.hydration_level?.toString() ?? '')
    setWeight(daily.weight?.toString() ?? '')
    setFlareDay(daily.flare_day === null ? 'unset' : daily.flare_day ? 'yes' : 'no')
    setPeriodDay(daily.period_day === null ? 'unset' : daily.period_day ? 'yes' : 'no')
    setMedicationChanges(daily.medication_changes ?? '')
    setNotes(daily.notes ?? '')
  }, [daily, selectedDateKey])

  const handleForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDateKey) {
      setSubmitError('Pick a date first.')
      return
    }

    const sleepNum = sleep.trim() === '' ? undefined : Number(sleep)
    const weightNum = weight.trim() === '' ? undefined : Number(weight)
    if (sleepNum !== undefined && Number.isNaN(sleepNum)) {
      setSubmitError('Sleep hours must be a number.')
      return
    }
    if (weightNum !== undefined && Number.isNaN(weightNum)) {
      setSubmitError('Weight must be a number.')
      return
    }

    const payload = {
      overall_feeling: feeling === '' ? undefined : Number(feeling),
      stress_level: stress === '' ? undefined : Number(stress),
      energy_level: energy === '' ? undefined : Number(energy),
      sleep_hours: sleepNum,
      hydration_level: hydrate === '' ? undefined : Number(hydrate),
      weight: weightNum,
      flare_day: flareDay === 'unset' ? undefined : flareDay === 'yes',
      period_day: periodDay === 'unset' ? undefined : periodDay === 'yes',
      medication_changes: medicationChanges.trim() === '' ? undefined : medicationChanges,
      notes: notes.trim() === '' ? undefined : notes,
    }

    const hasAnyValue = Object.values(payload).some((value) => value !== undefined)
    if (!hasAnyValue) {
      setSubmitError('Fill at least one field before saving.')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitMessage(null)

    const saved = await upsertDaily({
      logDate: selectedDateKey,
      ...payload,
    })

    if (!saved) {
      setSubmitError('Could not save health log.')
      setIsSubmitting(false)
      return
    }

    await refreshHealth({ logDate: selectedDateKey })
    setSubmitMessage('Health log saved.')
    setIsSubmitting(false)
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
        <form onSubmit={handleForm} className='grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch'>
          <div className='flex flex-col bg-white border border-green-300 bg-linear-to-br from-white to-green-50/60 p-5 rounded-2xl shadow-sm space-y-3 transition-all lg:col-span-8 h-full'>
              <div className='flex justify-between items-center'>
                <h1 className='text-lg font-semibold leading-tight'>Daily Check-in</h1>
                <button
                  type="submit"
                  disabled={isSubmitting || !isAuthenticated}
                  className='inline-flex items-center justify-center rounded-xl bg-green-600 px-4 py-1.5 text-sm font-medium text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
              <div className='flex items-center justify-between'>
                <p>How are you feeling?</p>
                <div className='flex items-center space-x-3'>
                  <button type="button" onClick={() => setFeeling('1')} className={`rounded-2xl transition-all cursor-pointer ${feeling === '1' ? 'text-green-700' : 'hover:text-green-700 text-gray-500'}`} aria-label='Feeling 1'>
                    <IconMoodSad size={35} />
                  </button>
                  <button type="button" onClick={() => setFeeling('2')} className={`rounded-2xl transition-all cursor-pointer ${feeling === '2' ? 'text-green-700' : 'hover:text-green-700 text-gray-500'}`} aria-label='Feeling 2'>
                    <IconMoodAnnoyed size={35} />
                  </button>
                  <button type="button" onClick={() => setFeeling('3')} className={`rounded-2xl transition-all cursor-pointer ${feeling === '3' ? 'text-green-700' : 'hover:text-green-700 text-gray-500'}`} aria-label='Feeling 3'>
                    <IconMoodEmpty size={35} />
                  </button>
                  <button type="button" onClick={() => setFeeling('4')} className={`rounded-2xl transition-all cursor-pointer ${feeling === '4' ? 'text-green-700' : 'hover:text-green-700 text-gray-500'}`} aria-label='Feeling 4'>
                    <IconMoodSmile size={35} />
                  </button>
                  <button type="button" onClick={() => setFeeling('5')} className={`rounded-2xl transition-all cursor-pointer ${feeling === '5' ? 'text-green-700' : 'hover:text-green-700 text-gray-500'}`} aria-label='Feeling 5'>
                    <IconMoodHappy size={35} />
                  </button>
                </div>
              </div>

              <Separator size='4' color='green'/>

              <div className='flex items-center justify-between'>
                <p>How stressed are you?</p>
                <div className='flex items-center space-x-2 justify-around'>
                  <p>Low</p>
                  <RadioGroup.Root
                    value={stress}
                    onValueChange={setStress}
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
                    value={energy}
                    onValueChange={setEnergy}
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
                <input
                  type="number"
                  value={sleep}
                  min={0}
                  step="0.5"
                  className='bg-gray-50 rounded-2xl border border-green-300 shadow-md w-20 text-center font-medium'
                  onChange={(e) => setSleep(e.target.value)}
                />
              </div>

              <Separator size='4' color='green'/>
              
              <div className='flex items-center justify-between'>
                <p>How much hydrated are you?</p>
                <div className='flex items-center space-x-2 justify-around'>
                  <p>Low</p>
                  <RadioGroup.Root
                    value={hydrate}
                    onValueChange={setHydrate}
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

            <div>
              <p className='text-sm font-medium mb-1'>Notes</p>
              <textarea
                value={notes}
                rows={4}
                placeholder="Optional"
                className='w-full bg-gray-50 rounded-xl border border-green-300 shadow-sm px-3 py-2 text-sm resize-none'
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
            {submitMessage && <p className="text-sm text-green-700">{submitMessage}</p>}
          </div>
          <div className='flex flex-col bg-white border border-green-300 bg-linear-to-br from-white to-green-50/60 p-5 rounded-2xl shadow-sm space-y-4 transition-all lg:col-span-4 h-full'>
            <h2 className='text-lg font-semibold'>Day Snapshot</h2>
            <p className='text-sm text-gray-600'>
              {date
                ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'No date selected'}
            </p>

            <div>
              <p className='text-sm font-medium mb-2'>Flare day?</p>
              <div className='flex gap-2'>
                <button
                  type="button"
                  onClick={() => setFlareDay('yes')}
                  className={`px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${flareDay === 'yes' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200'}`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setFlareDay('no')}
                  className={`px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${flareDay === 'no' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200'}`}
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={() => setFlareDay('unset')}
                  className={`px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${flareDay === 'unset' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200'}`}
                >
                  Clear
                </button>
              </div>
            </div>

            <div>
              <p className='text-sm font-medium mb-2'>Period day?</p>
              <div className='flex gap-2'>
                <button
                  type="button"
                  onClick={() => setPeriodDay('yes')}
                  className={`px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${periodDay === 'yes' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200'}`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodDay('no')}
                  className={`px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${periodDay === 'no' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200'}`}
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodDay('unset')}
                  className={`px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${periodDay === 'unset' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200'}`}
                >
                  Clear
                </button>
              </div>
            </div>

            <div>
              <p className='text-sm font-medium mb-1'>Weight</p>
              <input
                type="number"
                value={weight}
                min={0}
                step="0.1"
                placeholder="Optional"
                className='w-full bg-gray-50 rounded-xl border border-green-300 shadow-sm px-3 py-2 text-sm'
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>

            <div>
              <p className='text-sm font-medium mb-1'>Medication changes</p>
              <textarea
                value={medicationChanges}
                rows={3}
                placeholder="Optional"
                className='w-full bg-gray-50 rounded-xl border border-green-300 shadow-sm px-3 py-2 text-sm resize-none'
                onChange={(e) => setMedicationChanges(e.target.value)}
              />
            </div>



          </div>
        </form>
      </div>

    </div>
  )
}

export default LogHealth
