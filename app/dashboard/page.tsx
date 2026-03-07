'use client'
import { useEffect, useMemo, useState } from 'react'
import { Avatar } from '@radix-ui/themes'
import { IconBrain, IconChartBar, IconMoodSadDizzy, IconPoo, IconSoup, IconTrendingUp } from '@tabler/icons-react'
import Link from 'next/link'
import { useProfile } from '@/src/context/ProfileContext'
import useMeals from '@/src/context/TrackedMealsContext'
import { supabase } from '@/lib/supabaseClient'

type DailyLogRow = {
  id: string
  log_date: string
}

type SimpleBowel = {
  id: string
  daily_log_id: string
}

type SimpleSymptom = {
  id: string
  daily_log_id: string
}

function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isSameLocalDay(isoLike: string, target: Date): boolean {
  const parsed = new Date(isoLike)
  if (Number.isNaN(parsed.getTime())) return false
  return (
    parsed.getFullYear() === target.getFullYear() &&
    parsed.getMonth() === target.getMonth() &&
    parsed.getDate() === target.getDate()
  )
}

function buildLastNDays(n: number): Array<{ key: string; label: string }> {
  const out: Array<{ key: string; label: string }> = []
  const today = new Date()
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    out.push({
      key: toDateKey(d),
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
    })
  }
  return out
}

function daysBetween(dateA: string, dateB: Date): number {
  const parsedA = new Date(`${dateA}T00:00:00`)
  const parsedB = new Date(`${toDateKey(dateB)}T00:00:00`)
  const diff = parsedB.getTime() - parsedA.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export default function DashboardPage() {
  const { profile } = useProfile()
  const { meals } = useMeals()

  const [loadingHealth, setLoadingHealth] = useState(true)
  const [healthError, setHealthError] = useState<string | null>(null)
  const [weeklyDailyLogs, setWeeklyDailyLogs] = useState<DailyLogRow[]>([])
  const [weeklyBowels, setWeeklyBowels] = useState<SimpleBowel[]>([])
  const [weeklySymptoms, setWeeklySymptoms] = useState<SimpleSymptom[]>([])
  const [lastSymptomDate, setLastSymptomDate] = useState<string | null>(null)

  const today = useMemo(() => new Date(), [])
  const todayKey = useMemo(() => toDateKey(today), [today])
  const last7Days = useMemo(() => buildLastNDays(7), [])
  const rangeStart = last7Days[0]?.key ?? todayKey

  useEffect(() => {
    let active = true

    const loadDashboardHealth = async () => {
      setLoadingHealth(true)
      setHealthError(null)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        if (!active) return
        setWeeklyDailyLogs([])
        setWeeklyBowels([])
        setWeeklySymptoms([])
        setLastSymptomDate(null)
        setLoadingHealth(false)
        if (userError) setHealthError(userError.message)
        return
      }

      const dailyLogsPromise = supabase
        .from('daily_logs')
        .select('id, log_date')
        .eq('user_id', user.id)
        .gte('log_date', rangeStart)
        .lte('log_date', todayKey)
        .order('log_date', { ascending: true })

      const lastSymptomPromise = supabase
        .from('symptom_entries')
        .select('id, daily_logs!inner(log_date, user_id)')
        .eq('daily_logs.user_id', user.id)
        .order('log_date', { foreignTable: 'daily_logs', ascending: false })
        .limit(1)

      const [dailyLogsRes, lastSymptomRes] = await Promise.all([dailyLogsPromise, lastSymptomPromise])

      if (!active) return

      if (dailyLogsRes.error) {
        setHealthError(dailyLogsRes.error.message)
        setLoadingHealth(false)
        return
      }

      const logs = (dailyLogsRes.data ?? []) as DailyLogRow[]
      setWeeklyDailyLogs(logs)

      const ids = logs.map((l) => l.id)
      if (ids.length === 0) {
        setWeeklyBowels([])
        setWeeklySymptoms([])
      } else {
        const [bowelRes, symptomRes] = await Promise.all([
          supabase.from('bowel_entries').select('id, daily_log_id').in('daily_log_id', ids),
          supabase.from('symptom_entries').select('id, daily_log_id').in('daily_log_id', ids),
        ])

        if (!active) return

        if (bowelRes.error) {
          setHealthError(bowelRes.error.message)
          setWeeklyBowels([])
        } else {
          setWeeklyBowels((bowelRes.data ?? []) as SimpleBowel[])
        }

        if (symptomRes.error) {
          setHealthError(symptomRes.error.message)
          setWeeklySymptoms([])
        } else {
          setWeeklySymptoms((symptomRes.data ?? []) as SimpleSymptom[])
        }
      }

      if (lastSymptomRes.error) {
        setLastSymptomDate(null)
      } else {
        const row = lastSymptomRes.data?.[0] as { daily_logs?: { log_date?: string } } | undefined
        setLastSymptomDate(row?.daily_logs?.log_date ?? null)
      }

      setLoadingHealth(false)
    }

    void loadDashboardHealth()

    return () => {
      active = false
    }
  }, [rangeStart, todayKey])

  const mealsToday = useMemo(() => meals.filter((m) => isSameLocalDay(m.eaten_at, today)).length, [meals, today])

  const mealsByDay = useMemo(() => {
    const out: Record<string, number> = {}
    for (const day of last7Days) out[day.key] = 0
    for (const meal of meals) {
      const key = toDateKey(new Date(meal.eaten_at))
      if (key in out) out[key] += 1
    }
    return out
  }, [meals, last7Days])

  const logIdToDate = useMemo(() => {
    const map: Record<string, string> = {}
    for (const l of weeklyDailyLogs) map[l.id] = l.log_date
    return map
  }, [weeklyDailyLogs])

  const bowelsByDay = useMemo(() => {
    const out: Record<string, number> = {}
    for (const day of last7Days) out[day.key] = 0
    for (const b of weeklyBowels) {
      const dateKey = logIdToDate[b.daily_log_id]
      if (dateKey && dateKey in out) out[dateKey] += 1
    }
    return out
  }, [weeklyBowels, logIdToDate, last7Days])

  const symptomsByDay = useMemo(() => {
    const out: Record<string, number> = {}
    for (const day of last7Days) out[day.key] = 0
    for (const s of weeklySymptoms) {
      const dateKey = logIdToDate[s.daily_log_id]
      if (dateKey && dateKey in out) out[dateKey] += 1
    }
    return out
  }, [weeklySymptoms, logIdToDate, last7Days])

  const bowelsToday = bowelsByDay[todayKey] ?? 0
  const symptomsToday = symptomsByDay[todayKey] ?? 0
  const daysSinceSymptom = lastSymptomDate ? Math.max(0, daysBetween(lastSymptomDate, today)) : null

  const maxBowels = Math.max(1, ...Object.values(bowelsByDay))
  const maxMeals = Math.max(1, ...Object.values(mealsByDay))

  if (!profile) return null

  return (
    <div className="p-4 md:p-6 mt-3 md:mt-5 flex flex-col items-center">
      <div className="w-full max-w-6xl flex flex-col md:flex-row md:items-center md:justify-between mb-4 border-b-2 border-b-green-600/70 pb-4 gap-3">
        <h1 className="text-3xl font-medium tracking-tight flex items-center gap-3">
          Welcome {profile.first_name}!
          <Avatar size="5" radius="full" src={profile.avatar_url ?? undefined} fallback={profile.first_name[0]} color="green" className="border-2 border-green-600" />
        </h1>
      </div>

      <div className="w-full max-w-6xl mb-6 rounded-2xl border border-green-100 bg-gradient-to-r from-green-50 via-white to-emerald-50 p-4 shadow-sm">
        <p className="text-sm text-gray-700">
          Today is <span className="font-medium">{today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
        </p>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-green-300 bg-gradient-to-br from-white to-green-50/60 p-5 rounded-2xl shadow-sm">
          <p className="text-sm text-gray-600">Meals Logged Today</p>
          <p className="text-3xl font-semibold mt-1">{mealsToday}</p>
        </div>
        <div className="bg-white border border-green-300 bg-gradient-to-br from-white to-green-50/60 p-5 rounded-2xl shadow-sm">
          <p className="text-sm text-gray-600">Bowels Logged Today</p>
          <p className="text-3xl font-semibold mt-1">{bowelsToday}</p>
        </div>
        <div className="bg-white border border-green-300 bg-gradient-to-br from-white to-green-50/60 p-5 rounded-2xl shadow-sm">
          <p className="text-sm text-gray-600">Symptoms Logged Today</p>
          <p className="text-3xl font-semibold mt-1">{symptomsToday}</p>
        </div>
        <div className="bg-white border border-green-300 bg-gradient-to-br from-white to-green-50/60 p-5 rounded-2xl shadow-sm">
          <p className="text-sm text-gray-600">Days Since Last Symptom</p>
          <p className="text-3xl font-semibold mt-1">{daysSinceSymptom === null ? '-' : daysSinceSymptom}</p>
        </div>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
        <section className="lg:col-span-8 bg-white border border-green-300 bg-gradient-to-br from-white to-green-50/60 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-green-200 pb-3">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <IconChartBar size={20} />
              Weekly Trends
            </h2>
            <span className="text-xs text-gray-600">Last 7 days</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-xl border border-green-200 bg-white/80 p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Bowels per day</p>
              <div className="h-40 flex items-end gap-2">
                {last7Days.map((d) => {
                  const value = bowelsByDay[d.key] ?? 0
                  const heightPx = Math.max(10, Math.round((value / maxBowels) * 120))
                  return (
                    <div key={`bowel-${d.key}`} className="h-full flex-1 flex flex-col justify-end items-center gap-1">
                      <span className="text-[11px] text-gray-600">{value}</span>
                      <div title={`${d.key}: ${value}`} className="w-full rounded-md bg-green-500/80 hover:bg-green-600 transition-all" style={{ height: `${heightPx}px` }} />
                      <span className="text-[11px] text-gray-600">{d.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-xl border border-green-200 bg-white/80 p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Meals per day</p>
              <div className="h-40 flex items-end gap-2">
                {last7Days.map((d) => {
                  const value = mealsByDay[d.key] ?? 0
                  const heightPx = Math.max(10, Math.round((value / maxMeals) * 120))
                  return (
                    <div key={`meal-${d.key}`} className="h-full flex-1 flex flex-col justify-end items-center gap-1">
                      <span className="text-[11px] text-gray-600">{value}</span>
                      <div title={`${d.key}: ${value}`} className="w-full rounded-md bg-emerald-500/80 hover:bg-emerald-600 transition-all" style={{ height: `${heightPx}px` }} />
                      <span className="text-[11px] text-gray-600">{d.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="lg:col-span-4 bg-white border border-green-300 bg-gradient-to-br from-white to-green-50/60 p-5 rounded-2xl shadow-sm space-y-3">
          <h2 className="text-xl font-semibold border-b border-green-200 pb-3">What to Do Next</h2>
          <Link href="/trackMeals" className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 hover:border-green-400 hover:text-green-700 transition-all">
            <span className="font-medium">Log a meal</span>
            <IconSoup size={22} />
          </Link>
          <Link href="/logHealth" className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 hover:border-green-400 hover:text-green-700 transition-all">
            <span className="font-medium">Log bowel/symptom</span>
            <IconPoo size={22} />
          </Link>
          <Link href="/log" className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 hover:border-green-400 hover:text-green-700 transition-all">
            <span className="font-medium">Review trigger foods</span>
            <IconMoodSadDizzy size={22} />
          </Link>
        </section>
      </div>

      <div className="w-full max-w-6xl mb-6 bg-white border border-green-300 bg-gradient-to-br from-white to-green-50/60 p-5 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between mb-3 border-b border-green-200 pb-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <IconTrendingUp size={20} />
            Weekly Summary Table
          </h2>
          <span className="text-xs text-gray-600">Last 7 days</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 border-b border-green-100">
                <th className="py-2 pr-2">Date</th>
                <th className="py-2 pr-2">Meals</th>
                <th className="py-2 pr-2">Bowels</th>
                <th className="py-2 pr-2">Symptoms</th>
              </tr>
            </thead>
            <tbody>
              {last7Days.map((d) => (
                <tr key={`row-${d.key}`} className="border-b border-green-50 last:border-b-0">
                  <td className="py-2 pr-2 font-medium text-gray-800">{new Date(`${d.key}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                  <td className="py-2 pr-2">{mealsByDay[d.key] ?? 0}</td>
                  <td className="py-2 pr-2">{bowelsByDay[d.key] ?? 0}</td>
                  <td className="py-2 pr-2">{symptomsByDay[d.key] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white border border-dashed border-green-300 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <IconBrain size={20} />
            <h3 className="text-lg font-semibold">AI Insights Placeholder</h3>
          </div>
          <p className="text-sm text-gray-600">Reserved for future trend explanations and personalized guidance.</p>
        </div>
        <div className="bg-white border border-dashed border-green-300 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <IconBrain size={20} />
            <h3 className="text-lg font-semibold">AI Alerts Placeholder</h3>
          </div>
          <p className="text-sm text-gray-600">Reserved for future anomaly alerts and proactive recommendations.</p>
        </div>
      </div>

      {(loadingHealth || healthError) && (
        <div className="w-full max-w-6xl mt-5">
          {loadingHealth && <p className="text-sm text-gray-600">Loading dashboard health data...</p>}
          {healthError && <p className="text-sm text-red-600">{healthError}</p>}
        </div>
      )}
    </div>
  )
}
