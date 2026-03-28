'use client'
import { useHealth } from '@/src/context/HealthContext'
import { useProfile } from '@/src/context/ProfileContext'
import { Calendar } from '../components/ui/calendar'
import React, { useEffect, useMemo, useState } from 'react'
import { RadioGroup, Separator } from '@radix-ui/themes'
import { IconMoodAnnoyed, IconMoodEmpty, IconMoodHappy, IconMoodSad, IconMoodSmile } from '@tabler/icons-react'
import { normalizeGenderValue } from '@/src/shared/profileGender'
import AdSenseAd from '@/app/components/AdSenseAd'

function toLocalDateKey(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toDateTimeLocalValue(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function normalizeDecimalInput(value: string): string {
  return value.replace(',', '.')
}

const LogHealth = () => {
  const { profile } = useProfile()
  const { daily, symptoms, bowels, refreshHealth, upsertDaily, addSymptom, updateSymptom, deleteSymptom, addBowel, updateBowel, deleteBowel, isAuthenticated } = useHealth()
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

  const [symptomName, setSymptomName] = useState('')
  const [symptomSeverity, setSymptomSeverity] = useState('')
  const [symptomNotes, setSymptomNotes] = useState('')
  const [symptomSubmitting, setSymptomSubmitting] = useState(false)
  const [symptomError, setSymptomError] = useState<string | null>(null)
  const [editingSymptomId, setEditingSymptomId] = useState<string | null>(null)
  const [deletingSymptomId, setDeletingSymptomId] = useState<string | null>(null)

  const [bowelOccurredAt, setBowelOccurredAt] = useState('')
  const [bowelBristolType, setBowelBristolType] = useState('')
  const [bowelUrgency, setBowelUrgency] = useState('')
  const [bowelBlood, setBowelBlood] = useState<'unset' | 'yes' | 'no'>('unset')
  const [bowelMucus, setBowelMucus] = useState<'unset' | 'yes' | 'no'>('unset')
  const [bowelNotes, setBowelNotes] = useState('')
  const [bowelSubmitting, setBowelSubmitting] = useState(false)
  const [bowelError, setBowelError] = useState<string | null>(null)
  const [editingBowelId, setEditingBowelId] = useState<string | null>(null)
  const [deletingBowelId, setDeletingBowelId] = useState<string | null>(null)

  const selectedDateKey = useMemo(() => {
    if (!date) return ''
    return toLocalDateKey(date)
  }, [date])

  const showPeriodDay = useMemo(() => {
    if (!profile) return false
    return normalizeGenderValue(profile.gender) !== 'male'
  }, [profile])

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
    setPeriodDay(showPeriodDay ? (daily.period_day === null ? 'unset' : daily.period_day ? 'yes' : 'no') : 'unset')
    setMedicationChanges(daily.medication_changes ?? '')
    setNotes(daily.notes ?? '')
  }, [daily, selectedDateKey, showPeriodDay])

  useEffect(() => {
    if (!submitMessage) return
    const timer = setTimeout(() => setSubmitMessage(null), 2500)
    return () => clearTimeout(timer)
  }, [submitMessage])

  const handleForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDateKey) {
      setSubmitError('Pick a date first.')
      return
    }

    const normalizedSleep = normalizeDecimalInput(sleep.trim())
    const sleepNum = normalizedSleep === '' ? undefined : Number(normalizedSleep)
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
      period_day: showPeriodDay ? (periodDay === 'unset' ? undefined : periodDay === 'yes') : undefined,
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

  const ensureDailyLogId = async () => {
    if (!selectedDateKey) return null
    if (daily?.id && daily.log_date === selectedDateKey) return daily.id
    const created = await upsertDaily({ logDate: selectedDateKey })
    if (!created) return null
    await refreshHealth({ logDate: selectedDateKey })
    return created.id
  }

  const startEditSymptom = (id: string) => {
    const entry = symptoms.find((s) => s.id === id)
    if (!entry) return

    setEditingSymptomId(id)
    setSymptomName(entry.symptom_name)
    setSymptomSeverity(entry.severity === null ? '' : entry.severity.toString())
    setSymptomNotes(entry.notes ?? '')
    setSymptomError(null)
  }

  const cancelEditSymptom = () => {
    setEditingSymptomId(null)
    setSymptomName('')
    setSymptomSeverity('')
    setSymptomNotes('')
    setSymptomError(null)
  }
  const handleDeleteSymptom = async (id: string) => {
    const confirmed = window.confirm('Delete this symptom entry?')
    if (!confirmed) return

    setDeletingSymptomId(id)
    setSymptomError(null)

    const deleted = await deleteSymptom(id)
    if (!deleted) {
      setSymptomError('Could not delete symptom entry.')
      setDeletingSymptomId(null)
      return
    }

    if (editingSymptomId === id) {
      cancelEditSymptom()
    }

    await refreshHealth({ logDate: selectedDateKey })
    setDeletingSymptomId(null)
  }
  const handleSymptomSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!symptomName.trim()) {
      setSymptomError('Symptom name is required.')
      return
    }

    const severityNum = symptomSeverity.trim() === '' ? null : Number(symptomSeverity)
    if (severityNum !== null && Number.isNaN(severityNum)) {
      setSymptomError('Severity must be a number.')
      return
    }

    setSymptomSubmitting(true)
    setSymptomError(null)

    const dailyLogId = await ensureDailyLogId()
    if (!dailyLogId) {
      setSymptomError('Could not create/find daily log for this date.')
      setSymptomSubmitting(false)
      return
    }

    const saved = editingSymptomId
      ? await updateSymptom(editingSymptomId, {
          symptom_name: symptomName.trim(),
          severity: severityNum,
          notes: symptomNotes.trim() === '' ? null : symptomNotes.trim(),
        })
      : await addSymptom({
          daily_log_id: dailyLogId,
          symptom_name: symptomName.trim(),
          severity: severityNum,
          notes: symptomNotes.trim() === '' ? null : symptomNotes.trim(),
        })

    if (!saved) {
      setSymptomError('Could not save symptom entry.')
      setSymptomSubmitting(false)
      return
    }

    setEditingSymptomId(null)
    setSymptomName('')
    setSymptomSeverity('')
    setSymptomNotes('')
    await refreshHealth({ logDate: selectedDateKey })
    setSymptomSubmitting(false)
  }

  const startEditBowel = (id: string) => {
    const entry = bowels.find((b) => b.id === id)
    if (!entry) return

    setEditingBowelId(id)
    setBowelOccurredAt(toDateTimeLocalValue(entry.occurred_at))
    setBowelBristolType(entry.bristol_type === null ? '' : entry.bristol_type.toString())
    setBowelUrgency(entry.urgency_level === null ? '' : entry.urgency_level.toString())
    setBowelBlood(entry.blood_present === null ? 'unset' : entry.blood_present ? 'yes' : 'no')
    setBowelMucus(entry.mucus_present === null ? 'unset' : entry.mucus_present ? 'yes' : 'no')
    setBowelNotes(entry.notes ?? '')
    setBowelError(null)
  }

  const cancelEditBowel = () => {
    setEditingBowelId(null)
    setBowelOccurredAt('')
    setBowelBristolType('')
    setBowelUrgency('')
    setBowelBlood('unset')
    setBowelMucus('unset')
    setBowelNotes('')
    setBowelError(null)
  }
  const handleDeleteBowel = async (id: string) => {
    const confirmed = window.confirm('Delete this bowel entry?')
    if (!confirmed) return

    setDeletingBowelId(id)
    setBowelError(null)

    const deleted = await deleteBowel(id)
    if (!deleted) {
      setBowelError('Could not delete bowel entry.')
      setDeletingBowelId(null)
      return
    }

    if (editingBowelId === id) {
      cancelEditBowel()
    }

    await refreshHealth({ logDate: selectedDateKey })
    setDeletingBowelId(null)
  }
  const handleBowelSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const bristolNum = bowelBristolType.trim() === '' ? null : Number(bowelBristolType)
    const urgencyNum = bowelUrgency.trim() === '' ? null : Number(bowelUrgency)
    if (bristolNum !== null && Number.isNaN(bristolNum)) {
      setBowelError('Bristol type must be a number.')
      return
    }
    if (urgencyNum !== null && Number.isNaN(urgencyNum)) {
      setBowelError('Urgency must be a number.')
      return
    }

    setBowelSubmitting(true)
    setBowelError(null)

    const dailyLogId = await ensureDailyLogId()
    if (!dailyLogId) {
      setBowelError('Could not create/find daily log for this date.')
      setBowelSubmitting(false)
      return
    }

    let occurredAtIso: string | undefined
    if (bowelOccurredAt.trim() !== '') {
      const parsed = new Date(bowelOccurredAt)
      if (Number.isNaN(parsed.getTime())) {
        setBowelError('Occurrence time is invalid.')
        setBowelSubmitting(false)
        return
      }
      occurredAtIso = parsed.toISOString()
    }

    const saved = editingBowelId
      ? await updateBowel(editingBowelId, {
          occurred_at: occurredAtIso,
          bristol_type: bristolNum,
          urgency_level: urgencyNum,
          blood_present: bowelBlood === 'unset' ? null : bowelBlood === 'yes',
          mucus_present: bowelMucus === 'unset' ? null : bowelMucus === 'yes',
          notes: bowelNotes.trim() === '' ? null : bowelNotes.trim(),
        })
      : await addBowel({
          daily_log_id: dailyLogId,
          occurred_at: occurredAtIso,
          bristol_type: bristolNum,
          urgency_level: urgencyNum,
          blood_present: bowelBlood === 'unset' ? null : bowelBlood === 'yes',
          mucus_present: bowelMucus === 'unset' ? null : bowelMucus === 'yes',
          notes: bowelNotes.trim() === '' ? null : bowelNotes.trim(),
        })

    if (!saved) {
      setBowelError('Could not save bowel entry.')
      setBowelSubmitting(false)
      return
    }

    setEditingBowelId(null)
    setBowelOccurredAt('')
    setBowelBristolType('')
    setBowelUrgency('')
    setBowelBlood('unset')
    setBowelMucus('unset')
    setBowelNotes('')
    await refreshHealth({ logDate: selectedDateKey })
    setBowelSubmitting(false)
  }

  const scoreGroupCls = 'flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2'

  return (
    <div className="p-4 md:p-6 mt-3 md:mt-5 flex flex-col items-center">
      <div className="w-full max-w-6xl flex flex-col md:flex-row md:items-center md:justify-between mb-4 border-b-2 border-b-green-600/70 pb-4 gap-3">
        <div>
          <h1 className="text-3xl font-medium tracking-tight">Log Health</h1>
          <p className="text-sm text-gray-600 mt-1">Track daily health markers, symptoms, and bowel entries.</p>
        </div>
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
              {date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Pick a date'}
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
            Viewing{' '}
            <span className="font-medium">
              {date ? date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'selected date'}
            </span>
          </p>
        </div>
      </div>

      <div className="w-full max-w-6xl space-y-5">
        <form onSubmit={handleForm} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div className="flex flex-col bg-white border border-green-300 bg-linear-to-br from-white to-green-50/60 p-5 rounded-2xl shadow-sm space-y-4 lg:col-span-8 h-full">
            <div className="flex items-center justify-between border-b border-green-200 pb-3">
              <h2 className="text-xl font-semibold leading-tight">Daily Check-In</h2>
              <button
                type="submit"
                disabled={isSubmitting || !isAuthenticated}
                className="inline-flex items-center justify-center rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Save Daily Log'}
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-gray-800">How are you feeling?</p>
                <div className="flex items-center space-x-2">
                  <button type="button" onClick={() => setFeeling('1')} className={`rounded-xl p-1 transition-all cursor-pointer ${feeling === '1' ? 'text-green-700 bg-green-100' : 'hover:text-green-700 text-gray-500'}`} aria-label="Feeling 1">
                    <IconMoodSad size={30} />
                  </button>
                  <button type="button" onClick={() => setFeeling('2')} className={`rounded-xl p-1 transition-all cursor-pointer ${feeling === '2' ? 'text-green-700 bg-green-100' : 'hover:text-green-700 text-gray-500'}`} aria-label="Feeling 2">
                    <IconMoodAnnoyed size={30} />
                  </button>
                  <button type="button" onClick={() => setFeeling('3')} className={`rounded-xl p-1 transition-all cursor-pointer ${feeling === '3' ? 'text-green-700 bg-green-100' : 'hover:text-green-700 text-gray-500'}`} aria-label="Feeling 3">
                    <IconMoodEmpty size={30} />
                  </button>
                  <button type="button" onClick={() => setFeeling('4')} className={`rounded-xl p-1 transition-all cursor-pointer ${feeling === '4' ? 'text-green-700 bg-green-100' : 'hover:text-green-700 text-gray-500'}`} aria-label="Feeling 4">
                    <IconMoodSmile size={30} />
                  </button>
                  <button type="button" onClick={() => setFeeling('5')} className={`rounded-xl p-1 transition-all cursor-pointer ${feeling === '5' ? 'text-green-700 bg-green-100' : 'hover:text-green-700 text-gray-500'}`} aria-label="Feeling 5">
                    <IconMoodHappy size={30} />
                  </button>
                </div>
              </div>

              <Separator size="4" color="green" />

              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-gray-800">How stressed are you?</p>
                <div className={scoreGroupCls}>
                  <p className="text-xs text-gray-600">Low</p>
                  <RadioGroup.Root value={stress} onValueChange={setStress} orientation="horizontal" className="flex! flex-row! items-center! gap-3!" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.75rem' }}>
                    <RadioGroup.Item value="1" />
                    <RadioGroup.Item value="2" />
                    <RadioGroup.Item value="3" />
                    <RadioGroup.Item value="4" />
                    <RadioGroup.Item value="5" />
                  </RadioGroup.Root>
                  <p className="text-xs text-gray-600">High</p>
                </div>
              </div>

              <Separator size="4" color="green" />

              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-gray-800">How energetic do you feel?</p>
                <div className={scoreGroupCls}>
                  <p className="text-xs text-gray-600">Low</p>
                  <RadioGroup.Root value={energy} onValueChange={setEnergy} orientation="horizontal" className="flex! flex-row! items-center! gap-3!" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.75rem' }}>
                    <RadioGroup.Item value="1" />
                    <RadioGroup.Item value="2" />
                    <RadioGroup.Item value="3" />
                    <RadioGroup.Item value="4" />
                    <RadioGroup.Item value="5" />
                  </RadioGroup.Root>
                  <p className="text-xs text-gray-600">High</p>
                </div>
              </div>

              <Separator size="4" color="green" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-800 mb-1">Sleep (hours)</p>
                  <input
                    type="text"
                    value={sleep}
                    inputMode="decimal"
                    placeholder="e.g. 8 or 7.5"
                    className="w-full bg-gray-50 rounded-xl border border-green-300 shadow-sm px-3 py-2 text-sm"
                    onChange={(e) => setSleep(normalizeDecimalInput(e.target.value))}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 mb-1">Hydration (1-5)</p>
                  <div className={scoreGroupCls}>
                    <p className="text-xs text-gray-600">Low</p>
                    <RadioGroup.Root value={hydrate} onValueChange={setHydrate} orientation="horizontal" className="flex! flex-row! items-center! gap-3!" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.75rem' }}>
                      <RadioGroup.Item value="1" />
                      <RadioGroup.Item value="2" />
                      <RadioGroup.Item value="3" />
                      <RadioGroup.Item value="4" />
                      <RadioGroup.Item value="5" />
                    </RadioGroup.Root>
                    <p className="text-xs text-gray-600">High</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">General notes</p>
                <textarea
                  value={notes}
                  rows={4}
                  placeholder="Optional"
                  className="w-full bg-gray-50 rounded-xl border border-green-300 shadow-sm px-3 py-2 text-sm resize-none"
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
            {submitMessage && <p className="text-sm text-green-700">{submitMessage}</p>}
          </div>

          <div className="flex flex-col bg-white border border-green-300 bg-linear-to-br from-white to-green-50/60 p-5 rounded-2xl shadow-sm space-y-4 lg:col-span-4 h-full">
            <div className="border-b border-green-200 pb-3">
              <h2 className="text-xl font-semibold leading-tight">Daily Details</h2>
              <p className="text-xs text-gray-600 mt-1">Additional context for this date.</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <p className="text-sm font-medium mb-2">Flare day?</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setFlareDay('yes')} className={`px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${flareDay === 'yes' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200 hover:border-green-400'}`}>Yes</button>
                  <button type="button" onClick={() => setFlareDay('no')} className={`px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${flareDay === 'no' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200 hover:border-green-400'}`}>No</button>
                  <button type="button" onClick={() => setFlareDay('unset')} className={`px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${flareDay === 'unset' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200 hover:border-green-400'}`}>Clear</button>
                </div>
              </div>

              {showPeriodDay && (
                <div>
                  <p className="text-sm font-medium mb-2">Period day?</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setPeriodDay('yes')} className={`px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${periodDay === 'yes' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200 hover:border-green-400'}`}>Yes</button>
                    <button type="button" onClick={() => setPeriodDay('no')} className={`px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${periodDay === 'no' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200 hover:border-green-400'}`}>No</button>
                    <button type="button" onClick={() => setPeriodDay('unset')} className={`px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${periodDay === 'unset' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200 hover:border-green-400'}`}>Clear</button>
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-1">Weight</p>
                <input
                  type="number"
                  value={weight}
                  min={0}
                  step="0.1"
                  placeholder="Optional"
                  className="w-full bg-gray-50 rounded-xl border border-green-300 shadow-sm px-3 py-2 text-sm"
                  onChange={(e) => setWeight(e.target.value)}
                />
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Medication changes</p>
                <textarea
                  value={medicationChanges}
                  rows={3}
                  placeholder="Optional"
                  className="w-full bg-gray-50 rounded-xl border border-green-300 shadow-sm px-3 py-2 text-sm resize-none"
                  onChange={(e) => setMedicationChanges(e.target.value)}
                />
              </div>

            </div>
          </div>
        </form>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
          <form onSubmit={handleSymptomSubmit} className="flex flex-col bg-white border border-green-300 bg-linear-to-br from-white to-green-50/60 p-5 rounded-2xl shadow-sm space-y-3 h-full">
            <div className="flex items-center justify-between border-b border-green-200 pb-3">
              <h2 className="text-xl font-semibold leading-tight">Symptoms</h2>
              <button
                type="submit"
                disabled={!isAuthenticated || symptomSubmitting}
                className="inline-flex items-center justify-center rounded-xl bg-green-600 px-3 py-1.5 text-sm font-medium text-white shadow-md transition-all hover:bg-green-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {symptomSubmitting ? 'Saving...' : editingSymptomId ? 'Update Symptom' : 'Add Symptom'}
              </button>
            </div>

            <input
              type="text"
              value={symptomName}
              placeholder="Symptom name"
              className="w-full bg-gray-50 rounded-xl border border-green-300 shadow-sm px-3 py-2 text-sm"
              onChange={(e) => setSymptomName(e.target.value)}
            />
            <input
              type="number"
              min={0}
              max={10}
              value={symptomSeverity}
              placeholder="Severity (optional)"
              className="w-full bg-gray-50 rounded-xl border border-green-300 shadow-sm px-3 py-2 text-sm"
              onChange={(e) => setSymptomSeverity(e.target.value)}
            />
            <textarea
              value={symptomNotes}
              rows={3}
              placeholder="Notes (optional)"
              className="w-full bg-gray-50 rounded-xl border border-green-300 shadow-sm px-3 py-2 text-sm resize-none"
              onChange={(e) => setSymptomNotes(e.target.value)}
            />

            {symptomError && <p className="text-sm text-red-600">{symptomError}</p>}

            {editingSymptomId && (
              <button
                type="button"
                onClick={cancelEditSymptom}
                className="self-start text-xs rounded-lg border border-gray-200 bg-white px-2 py-1 hover:border-green-400 cursor-pointer"
              >
                Cancel Editing
              </button>
            )}

            <div className="pt-1 space-y-2">
              <p className="text-xs text-gray-600">Entries this day: {symptoms.length}</p>
              {symptoms.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1">
                  <p className="text-sm text-gray-700">
                    {s.symptom_name} {s.severity !== null ? `(sev ${s.severity})` : ''}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEditSymptom(s.id)}
                      className="text-xs rounded-lg border border-gray-200 bg-white px-2 py-1 hover:border-green-400 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSymptom(s.id)}
                      disabled={deletingSymptomId === s.id}
                      className="text-xs rounded-lg border border-red-200 bg-white px-2 py-1 text-red-700 hover:border-red-400 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {deletingSymptomId === s.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </form>

          <form onSubmit={handleBowelSubmit} className="flex flex-col bg-white border border-green-300 bg-linear-to-br from-white to-green-50/60 p-5 rounded-2xl shadow-sm space-y-3 h-full">
            <div className="flex items-center justify-between border-b border-green-200 pb-3">
              <h2 className="text-xl font-semibold leading-tight">Bowel Entries</h2>
              <button
                type="submit"
                disabled={!isAuthenticated || bowelSubmitting}
                className="inline-flex items-center justify-center rounded-xl bg-green-600 px-3 py-1.5 text-sm font-medium text-white shadow-md transition-all hover:bg-green-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bowelSubmitting ? 'Saving...' : editingBowelId ? 'Update Bowel' : 'Add Bowel'}
              </button>
            </div>

            <input
              type="datetime-local"
              value={bowelOccurredAt}
              className="w-full bg-gray-50 rounded-xl border border-green-300 shadow-sm px-3 py-2 text-sm"
              onChange={(e) => setBowelOccurredAt(e.target.value)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="number"
                min={1}
                max={7}
                value={bowelBristolType}
                placeholder="Bristol type (1-7)"
                className="w-full bg-gray-50 rounded-xl border border-green-300 shadow-sm px-3 py-2 text-sm"
                onChange={(e) => setBowelBristolType(e.target.value)}
              />
              <input
                type="number"
                min={0}
                max={10}
                value={bowelUrgency}
                placeholder="Urgency (0-10)"
                className="w-full bg-gray-50 rounded-xl border border-green-300 shadow-sm px-3 py-2 text-sm"
                onChange={(e) => setBowelUrgency(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={bowelBlood}
                onChange={(e) => setBowelBlood(e.target.value as 'unset' | 'yes' | 'no')}
                className="w-full bg-gray-50 rounded-xl border border-green-300 shadow-sm px-3 py-2 text-sm"
              >
                <option value="unset">Blood: Unset</option>
                <option value="yes">Blood: Yes</option>
                <option value="no">Blood: No</option>
              </select>
              <select
                value={bowelMucus}
                onChange={(e) => setBowelMucus(e.target.value as 'unset' | 'yes' | 'no')}
                className="w-full bg-gray-50 rounded-xl border border-green-300 shadow-sm px-3 py-2 text-sm"
              >
                <option value="unset">Mucus: Unset</option>
                <option value="yes">Mucus: Yes</option>
                <option value="no">Mucus: No</option>
              </select>
            </div>
            <textarea
              value={bowelNotes}
              rows={3}
              placeholder="Notes (optional)"
              className="w-full bg-gray-50 rounded-xl border border-green-300 shadow-sm px-3 py-2 text-sm resize-none"
              onChange={(e) => setBowelNotes(e.target.value)}
            />

            {bowelError && <p className="text-sm text-red-600">{bowelError}</p>}

            {editingBowelId && (
              <button
                type="button"
                onClick={cancelEditBowel}
                className="self-start text-xs rounded-lg border border-gray-200 bg-white px-2 py-1 hover:border-green-400 cursor-pointer"
              >
                Cancel Editing
              </button>
            )}

            <div className="pt-1 space-y-2">
              <p className="text-xs text-gray-600">Entries this day: {bowels.length}</p>
              {bowels.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1">
                  <p className="text-sm text-gray-700">
                    Bristol: {b.bristol_type ?? '-'} | Urgency: {b.urgency_level ?? '-'}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEditBowel(b.id)}
                      className="text-xs rounded-lg border border-gray-200 bg-white px-2 py-1 hover:border-green-400 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBowel(b.id)}
                      disabled={deletingBowelId === b.id}
                      className="text-xs rounded-lg border border-red-200 bg-white px-2 py-1 text-red-700 hover:border-red-400 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {deletingBowelId === b.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </form>
        </div>

        <div className="w-full max-w-6xl pt-2">
          <AdSenseAd
            slot="4563997002"
            label="Suggested"
            description="A sponsored placement below your health logging workspace."
          />
        </div>
      </div>
    </div>
  )
}

export default LogHealth

