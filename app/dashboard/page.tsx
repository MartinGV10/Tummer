'use client'
import { useEffect, useMemo, useState } from 'react'
import { Avatar } from '@radix-ui/themes'
import { IconBrain, IconChartBar, IconLock, IconMoodSadDizzy, IconPoo, IconSoup, IconTrendingUp, IconUsersGroup } from '@tabler/icons-react'
import Link from 'next/link'
import AdSenseAd from '@/app/components/AdSenseAd'
import MonthlyReportButton from '@/app/components/MonthlyReportButton'
import { useProfile } from '@/src/context/ProfileContext'
import useMeals from '@/src/context/TrackedMealsContext'
import { supabase } from '@/lib/supabaseClient'
import { DASHBOARD_AI_EMPTY_STATE, hasDashboardInsightInputs } from '@/src/shared/dashboardAi'
import { formatMacroValue, getMealSearchText, sumMealMacros } from '@/src/shared/meals'
import { normalizeGenderValue } from '@/src/shared/profileGender'

type DailyLogRow = {
  id: string
  log_date: string
  overall_feeling: number | null
  stress_level: number | null
  energy_level: number | null
  sleep_hours: number | null
  hydration_level: number | null
  flare_day: boolean | null
  period_day: boolean | null
  notes: string | null
}

type SimpleBowel = {
  id: string
  daily_log_id: string
  bristol_type: number | null
  urgency_level: number | null
  blood_present: boolean | null
  mucus_present: boolean | null
  notes: string | null
}

type SimpleSymptom = {
  id: string
  daily_log_id: string
  symptom_name: string
  severity: number | null
  notes: string | null
}

type DashboardAiData = {
  insight: string
  alert: string
}

type DashboardMealEntry = {
  date: string
  meal_name: string
  items: string[]
}

type TriggerFoodRow = {
  name: string
  status: string
}

type ProfileMetaRow = {
  condition_id: string | null
  reason: string | null
}

type ConditionRow = {
  name: string
}

type DashboardAiCache = {
  signature: string
  savedAt: number
  data: DashboardAiData
}

type DashboardRangeId = '7d' | '14d' | '30d' | '365d'

type DashboardRangeOption = {
  id: DashboardRangeId
  label: string
  shortLabel: string
  days: number
}

type AggregatedPoint = {
  key: string
  label: string
  meals: number
  bowels: number
  symptoms: number
  stress: number | null
  sleep: number | null
  overallFeeling: number | null
  flareDays: number
  periodDays: number
  energy: number | null
  hydration: number | null
}

const AI_CACHE_KEY = 'dashboard_ai_insights_v1'
const AI_CACHE_TTL_MS = 15 * 60 * 1000
const FREE_RANGE: DashboardRangeOption = {
  id: '7d',
  label: '1 Week',
  shortLabel: '7D',
  days: 7,
}
const PREMIUM_RANGES: DashboardRangeOption[] = [
  FREE_RANGE,
  { id: '14d', label: '2 Weeks', shortLabel: '14D', days: 14 },
  { id: '30d', label: '1 Month', shortLabel: '30D', days: 30 },
  { id: '365d', label: '1 Year', shortLabel: '1Y', days: 365 },
]

function normalizeProfileContextValue(value: string | null | undefined): string | null {
  const normalized = (value ?? '').trim()
  if (!normalized) return null
  const lower = normalized.toLowerCase()
  if (['none', 'no condition', 'no conditions', 'n/a', 'na'].includes(lower)) return null
  return normalized
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

function formatDayLabel(dateKey: string, totalDays: number): string {
  const date = new Date(`${dateKey}T00:00:00`)

  if (totalDays <= 14) {
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  }

  if (totalDays <= 45) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return date.toLocaleDateString('en-US', { month: 'short' })
}

function formatRangeSummary(days: number): string {
  if (days === 7) return 'Last 7 days'
  if (days === 14) return 'Last 14 days'
  if (days === 30) return 'Last 30 days'
  if (days === 365) return 'Last 12 months'
  return `Last ${days} days`
}

function averageNullable(values: Array<number | null | undefined>): number | null {
  const numericValues = values.filter((value): value is number => typeof value === 'number')

  if (numericValues.length === 0) {
    return null
  }

  const average = numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length
  return Math.round(average * 10) / 10
}

function formatMonthKey(dateKey: string): string {
  return dateKey.slice(0, 7)
}

function formatMonthLabel(monthKey: string): string {
  const date = new Date(`${monthKey}-01T00:00:00`)
  return date.toLocaleDateString('en-US', { month: 'short' })
}

function formatMonthTableLabel(monthKey: string): string {
  const date = new Date(`${monthKey}-01T00:00:00`)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function daysBetween(dateA: string, dateB: Date): number {
  const parsedA = new Date(`${dateA}T00:00:00`)
  const parsedB = new Date(`${toDateKey(dateB)}T00:00:00`)
  const diff = parsedB.getTime() - parsedA.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function normalizeFoodName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function findTriggerMatch(mealName: string, triggerFoods: string[]): string | null {
  const mealNorm = normalizeFoodName(mealName)
  for (const trigger of triggerFoods) {
    const trigNorm = normalizeFoodName(trigger)
    if (!trigNorm) continue
    if (mealNorm === trigNorm || mealNorm.includes(trigNorm) || trigNorm.includes(mealNorm)) {
      return trigger
    }
  }
  return null
}

const LOCKED_MACRO_PREVIEW = [
  { label: 'Calories', value: '1,860', unit: 'cal' },
  { label: 'Protein', value: '128', unit: 'g' },
  { label: 'Carbs', value: '174', unit: 'g' },
  { label: 'Fat', value: '62', unit: 'g' },
]

export default function DashboardPage() {
  const { profile } = useProfile()
  const { meals, loading: loadingMeals } = useMeals()
  const isPremium = Boolean(profile?.is_premium)
  const availableRanges = isPremium ? PREMIUM_RANGES : [FREE_RANGE]
  const [selectedRange, setSelectedRange] = useState<DashboardRangeId>(isPremium ? '14d' : '7d')

  const [loadingHealth, setLoadingHealth] = useState(true)
  const [healthError, setHealthError] = useState<string | null>(null)
  const [weeklyDailyLogs, setWeeklyDailyLogs] = useState<DailyLogRow[]>([])
  const [weeklyBowels, setWeeklyBowels] = useState<SimpleBowel[]>([])
  const [weeklySymptoms, setWeeklySymptoms] = useState<SimpleSymptom[]>([])
  const [lastSymptomDate, setLastSymptomDate] = useState<string | null>(null)
  const [triggerFoods, setTriggerFoods] = useState<string[]>([])
  const [profileCondition, setProfileCondition] = useState<string | null>(null)
  const [profileRestriction, setProfileRestriction] = useState<string | null>(null)
  const [aiData, setAiData] = useState<DashboardAiData | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const today = useMemo(() => new Date(), [])
  const todayKey = useMemo(() => toDateKey(today), [today])
  const selectedRangeOption = useMemo(
    () => availableRanges.find((range) => range.id === selectedRange) ?? availableRanges[0],
    [availableRanges, selectedRange],
  )
  const chartWindowDays = selectedRangeOption.days
  const aiWindowDays = isPremium ? 14 : 7
  const fetchWindowDays = Math.max(chartWindowDays, aiWindowDays)
  const chartDays = useMemo(() => buildLastNDays(chartWindowDays), [chartWindowDays])
  const aiDays = useMemo(() => buildLastNDays(aiWindowDays), [aiWindowDays])
  const fetchDays = useMemo(() => buildLastNDays(fetchWindowDays), [fetchWindowDays])
  const rangeStart = fetchDays[0]?.key ?? todayKey
  const showPeriodDay = useMemo(() => {
    if (!profile) return false
    return normalizeGenderValue(profile.gender) !== 'male'
  }, [profile])

  useEffect(() => {
    setSelectedRange(isPremium ? '14d' : '7d')
  }, [isPremium])

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
        setTriggerFoods([])
        setProfileCondition(null)
        setProfileRestriction(null)
        setLoadingHealth(false)
        if (userError) setHealthError(userError.message)
        return
      }

      const dailyLogsPromise = supabase
        .from('daily_logs')
        .select('id, log_date, overall_feeling, stress_level, energy_level, sleep_hours, hydration_level, flare_day, period_day, notes')
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

      const triggerFoodsPromise = supabase
        .from('user_foods')
        .select('name, status')
        .eq('user_id', user.id)

      const profileMetaPromise = supabase
        .from('profiles')
        .select('condition_id, reason')
        .eq('id', user.id)
        .maybeSingle()

      const [dailyLogsRes, lastSymptomRes, triggerFoodsRes, profileMetaRes] = await Promise.all([dailyLogsPromise, lastSymptomPromise, triggerFoodsPromise, profileMetaPromise])

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
          supabase
            .from('bowel_entries')
            .select('id, daily_log_id, bristol_type, urgency_level, blood_present, mucus_present, notes')
            .in('daily_log_id', ids),
          supabase
            .from('symptom_entries')
            .select('id, daily_log_id, symptom_name, severity, notes')
            .in('daily_log_id', ids),
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

      if (triggerFoodsRes.error) {
        setTriggerFoods([])
      } else {
        const rows = (triggerFoodsRes.data ?? []) as TriggerFoodRow[]
        setTriggerFoods(
          rows
            .filter((r) => r.status === 'trigger' && typeof r.name === 'string' && r.name.trim() !== '')
            .map((r) => r.name.trim())
        )
      }

      if (profileMetaRes.error || !profileMetaRes.data) {
        setProfileCondition(null)
        setProfileRestriction(normalizeProfileContextValue(profile?.reason ?? null))
      } else {
        const profileMeta = profileMetaRes.data as ProfileMetaRow
        setProfileRestriction(normalizeProfileContextValue(profileMeta.reason ?? profile?.reason ?? null))

        if (profileMeta.condition_id) {
          const conditionRes = await supabase
            .from('conditions')
            .select('name')
            .eq('id', profileMeta.condition_id)
            .maybeSingle()

          if (!active) return

          if (conditionRes.error || !conditionRes.data) {
            setProfileCondition(null)
          } else {
            const conditionRow = conditionRes.data as ConditionRow
            setProfileCondition(normalizeProfileContextValue(conditionRow.name ?? null))
          }
        } else {
          setProfileCondition(null)
        }
      }

      setLoadingHealth(false)
    }

    void loadDashboardHealth()

    return () => {
      active = false
    }
  }, [rangeStart, todayKey, profile?.reason])

  const mealsLoggedToday = useMemo(
    () => meals.filter((meal) => isSameLocalDay(meal.eaten_at, today)),
    [meals, today]
  )

  const mealsToday = useMemo(() => mealsLoggedToday.length, [mealsLoggedToday])

  const dailyMacroTotals = useMemo(
    () => sumMealMacros(mealsLoggedToday.flatMap((meal) => meal.meal_items)),
    [mealsLoggedToday]
  )

  const foodsLoggedToday = useMemo(
    () => mealsLoggedToday.reduce((total, meal) => total + meal.meal_items.length, 0),
    [mealsLoggedToday]
  )

  const mealsByFetchedDay = useMemo(() => {
    const out: Record<string, number> = {}
    for (const day of fetchDays) out[day.key] = 0
    for (const meal of meals) {
      const key = toDateKey(new Date(meal.eaten_at))
      if (key in out) out[key] += 1
    }
    return out
  }, [meals, fetchDays])

  const logIdToDate = useMemo(() => {
    const map: Record<string, string> = {}
    for (const l of weeklyDailyLogs) map[l.id] = l.log_date
    return map
  }, [weeklyDailyLogs])

  const bowelsByFetchedDay = useMemo(() => {
    const out: Record<string, number> = {}
    for (const day of fetchDays) out[day.key] = 0
    for (const b of weeklyBowels) {
      const dateKey = logIdToDate[b.daily_log_id]
      if (dateKey && dateKey in out) out[dateKey] += 1
    }
    return out
  }, [weeklyBowels, logIdToDate, fetchDays])

  const symptomsByFetchedDay = useMemo(() => {
    const out: Record<string, number> = {}
    for (const day of fetchDays) out[day.key] = 0
    for (const s of weeklySymptoms) {
      const dateKey = logIdToDate[s.daily_log_id]
      if (dateKey && dateKey in out) out[dateKey] += 1
    }
    return out
  }, [weeklySymptoms, logIdToDate, fetchDays])

  const bowelsToday = bowelsByFetchedDay[todayKey] ?? 0
  const symptomsToday = symptomsByFetchedDay[todayKey] ?? 0
  const daysSinceSymptom = lastSymptomDate ? Math.max(0, daysBetween(lastSymptomDate, today)) : null

  const mealsByChartDay = useMemo(() => {
    const out: Record<string, number> = {}
    for (const day of chartDays) {
      out[day.key] = mealsByFetchedDay[day.key] ?? 0
    }
    return out
  }, [chartDays, mealsByFetchedDay])

  const bowelsByChartDay = useMemo(() => {
    const out: Record<string, number> = {}
    for (const day of chartDays) {
      out[day.key] = bowelsByFetchedDay[day.key] ?? 0
    }
    return out
  }, [chartDays, bowelsByFetchedDay])

  const symptomsByChartDay = useMemo(() => {
    const out: Record<string, number> = {}
    for (const day of chartDays) {
      out[day.key] = symptomsByFetchedDay[day.key] ?? 0
    }
    return out
  }, [chartDays, symptomsByFetchedDay])

  const chartLogsByDay = useMemo(() => {
    const set = new Set(chartDays.map((day) => day.key))
    return weeklyDailyLogs.filter((log) => set.has(log.log_date))
  }, [chartDays, weeklyDailyLogs])

  const aggregatedChartData = useMemo(() => {
    if (chartWindowDays !== 365) {
      return null
    }

    return chartDays.reduce<AggregatedPoint[]>((accumulator, day) => {
      const monthKey = formatMonthKey(day.key)
      const existing = accumulator[accumulator.length - 1]
      const dayLog = chartLogsByDay.find((log) => log.log_date === day.key)

      if (!existing || existing.key !== monthKey) {
        accumulator.push({
          key: monthKey,
          label: formatMonthLabel(monthKey),
          meals: mealsByChartDay[day.key] ?? 0,
          bowels: bowelsByChartDay[day.key] ?? 0,
          symptoms: symptomsByChartDay[day.key] ?? 0,
          stress: averageNullable([dayLog?.stress_level ?? null]),
          sleep: averageNullable([dayLog?.sleep_hours ?? null]),
          overallFeeling: averageNullable([dayLog?.overall_feeling ?? null]),
          flareDays: dayLog?.flare_day ? 1 : 0,
          periodDays: dayLog?.period_day ? 1 : 0,
          energy: averageNullable([dayLog?.energy_level ?? null]),
          hydration: averageNullable([dayLog?.hydration_level ?? null]),
        })
        return accumulator
      }

      const monthLogs = chartLogsByDay.filter((log) => formatMonthKey(log.log_date) === monthKey)

      existing.meals += mealsByChartDay[day.key] ?? 0
      existing.bowels += bowelsByChartDay[day.key] ?? 0
      existing.symptoms += symptomsByChartDay[day.key] ?? 0
      existing.stress = averageNullable(monthLogs.map((log) => log.stress_level))
      existing.sleep = averageNullable(monthLogs.map((log) => log.sleep_hours))
      existing.overallFeeling = averageNullable(monthLogs.map((log) => log.overall_feeling))
      existing.flareDays = monthLogs.filter((log) => log.flare_day === true).length
      existing.periodDays = monthLogs.filter((log) => log.period_day === true).length
      existing.energy = averageNullable(monthLogs.map((log) => log.energy_level))
      existing.hydration = averageNullable(monthLogs.map((log) => log.hydration_level))

      return accumulator
    }, [])
  }, [bowelsByChartDay, chartDays, chartLogsByDay, chartWindowDays, mealsByChartDay, symptomsByChartDay])

  const chartBars = aggregatedChartData
    ? aggregatedChartData.map((month) => ({
        key: month.key,
        label: month.label,
        meals: month.meals,
        bowels: month.bowels,
      }))
    : chartDays.map((day) => ({
        key: day.key,
        label: formatDayLabel(day.key, chartWindowDays),
        meals: mealsByChartDay[day.key] ?? 0,
        bowels: bowelsByChartDay[day.key] ?? 0,
      }))

  const tableRows = aggregatedChartData
    ? aggregatedChartData.map((month) => ({
        key: month.key,
        label: formatMonthTableLabel(month.key),
        meals: month.meals,
        bowels: month.bowels,
        symptoms: month.symptoms,
        stress: month.stress,
        sleep: month.sleep,
        overallFeeling: month.overallFeeling,
        flareDay: month.flareDays > 0 ? `${month.flareDays} days` : '-',
        periodDay: month.periodDays > 0 ? `${month.periodDays} days` : '-',
        energy: month.energy,
        hydration: month.hydration,
      }))
    : chartDays.map((day) => {
        const log = chartLogsByDay.find((entry) => entry.log_date === day.key)

        return {
          key: day.key,
          label: new Date(`${day.key}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          meals: mealsByChartDay[day.key] ?? 0,
          bowels: bowelsByChartDay[day.key] ?? 0,
          symptoms: symptomsByChartDay[day.key] ?? 0,
          stress: log?.stress_level ?? null,
          sleep: log?.sleep_hours ?? null,
          overallFeeling: log?.overall_feeling ?? null,
          flareDay: log?.flare_day === true ? 'Yes' : log?.flare_day === false ? 'No' : '-',
          periodDay: log?.period_day === true ? 'Yes' : log?.period_day === false ? 'No' : '-',
          energy: log?.energy_level ?? null,
          hydration: log?.hydration_level ?? null,
        }
      })

  const aiMealsByDay = useMemo(() => {
    const out: Record<string, number> = {}
    for (const day of aiDays) {
      out[day.key] = mealsByFetchedDay[day.key] ?? 0
    }
    return out
  }, [aiDays, mealsByFetchedDay])

  const aiBowelsByDay = useMemo(() => {
    const out: Record<string, number> = {}
    for (const day of aiDays) {
      out[day.key] = bowelsByFetchedDay[day.key] ?? 0
    }
    return out
  }, [aiDays, bowelsByFetchedDay])

  const aiSymptomsByDay = useMemo(() => {
    const out: Record<string, number> = {}
    for (const day of aiDays) {
      out[day.key] = symptomsByFetchedDay[day.key] ?? 0
    }
    return out
  }, [aiDays, symptomsByFetchedDay])

  const maxBowels = Math.max(1, ...chartBars.map((point) => point.bowels))
  const maxMeals = Math.max(1, ...chartBars.map((point) => point.meals))

  const weeklyTriggerMeals = useMemo(() => {
    const allowedDays = new Set(aiDays.map((d) => d.key))
    const out: Array<{ date: string; meal_name: string; trigger_food: string }> = []

    for (const meal of meals) {
      const dateKey = toDateKey(new Date(meal.eaten_at))
      if (!allowedDays.has(dateKey)) continue
      const match = findTriggerMatch(getMealSearchText(meal.meal_name, meal.meal_items), triggerFoods)
      if (!match) continue
      out.push({
        date: dateKey,
        meal_name: meal.meal_name,
        trigger_food: match,
      })
    }

    return out
  }, [aiDays, meals, triggerFoods])

  const weeklyMealEntries = useMemo(() => {
    const allowedDays = new Set(aiDays.map((d) => d.key))
    const out: DashboardMealEntry[] = []

    for (const meal of meals) {
      const dateKey = toDateKey(new Date(meal.eaten_at))
      if (!allowedDays.has(dateKey)) continue

      out.push({
        date: dateKey,
        meal_name: meal.meal_name,
        items: meal.meal_items.map((item) => item.food_name).filter(Boolean),
      })
    }

    return out
  }, [aiDays, meals])

  const aiPayload = useMemo(
    () => ({
      today: todayKey,
      analysisDays: aiWindowDays,
      mealsToday,
      bowelsToday,
      symptomsToday,
      daysSinceSymptom,
      weeklyMeals: aiDays.map((d) => ({ date: d.key, value: aiMealsByDay[d.key] ?? 0 })),
      weeklyBowels: aiDays.map((d) => ({ date: d.key, value: aiBowelsByDay[d.key] ?? 0 })),
      weeklyBowelDetails: aiDays.map((d) => {
        const entries = weeklyBowels
          .filter((entry) => logIdToDate[entry.daily_log_id] === d.key)
          .map((entry) => ({
            bristol_type: entry.bristol_type,
            urgency_level: entry.urgency_level,
            blood_present: entry.blood_present,
            mucus_present: entry.mucus_present,
            notes: entry.notes,
          }))

        return {
          date: d.key,
          entries,
        }
      }),
      weeklySymptoms: aiDays.map((d) => ({ date: d.key, value: aiSymptomsByDay[d.key] ?? 0 })),
      weeklySymptomDetails: aiDays.map((d) => {
        const entries = weeklySymptoms
          .filter((entry) => logIdToDate[entry.daily_log_id] === d.key)
          .map((entry) => ({
            symptom_name: entry.symptom_name,
            severity: entry.severity,
            notes: entry.notes,
          }))

        return {
          date: d.key,
          entries,
        }
      }),
      weeklyFactors: aiDays.map((d) => {
        const row = weeklyDailyLogs.find((log) => log.log_date === d.key)
        return {
          date: d.key,
          stress_level: row?.stress_level ?? null,
          sleep_hours: row?.sleep_hours ?? null,
          energy_level: row?.energy_level ?? null,
          hydration_level: row?.hydration_level ?? null,
          overall_feeling: row?.overall_feeling ?? null,
          flare_day: row?.flare_day ?? null,
          period_day: showPeriodDay ? (row?.period_day ?? null) : null,
        }
      }),
      weeklyDailyNotes: aiDays.map((d) => {
        const row = weeklyDailyLogs.find((log) => log.log_date === d.key)
        return {
          date: d.key,
          notes: row?.notes ?? null,
        }
      }),
      triggerFoods,
      weeklyTriggerMeals,
      weeklyMealEntries,
      profileContext: {
        condition: profileCondition,
        dietaryRestriction: profileRestriction,
      },
    }),
    [todayKey, aiWindowDays, mealsToday, bowelsToday, symptomsToday, daysSinceSymptom, aiDays, aiMealsByDay, aiBowelsByDay, aiSymptomsByDay, weeklyDailyLogs, weeklyBowels, weeklySymptoms, logIdToDate, triggerFoods, weeklyTriggerMeals, weeklyMealEntries, profileCondition, profileRestriction, showPeriodDay]
  )

  const hasAiInputs = useMemo(
    () => hasDashboardInsightInputs(aiPayload),
    [aiPayload]
  )

  const isDashboardDataLoading = loadingMeals || loadingHealth

  useEffect(() => {
    let active = true
    const loadAi = async () => {
      if (!profile || isDashboardDataLoading) return

      if (!hasAiInputs) {
        setAiData(DASHBOARD_AI_EMPTY_STATE)
        setAiError(null)
        setAiLoading(false)
        return
      }

      const signature = JSON.stringify(aiPayload)
      const rawCache = typeof window !== 'undefined' ? window.localStorage.getItem(AI_CACHE_KEY) : null
      if (rawCache) {
        try {
          const parsed = JSON.parse(rawCache) as DashboardAiCache
          const stillValid = Date.now() - parsed.savedAt < AI_CACHE_TTL_MS
          if (parsed.signature === signature && stillValid) {
            if (!active) return
            setAiData(parsed.data)
            setAiLoading(false)
            setAiError(null)
            return
          }
        } catch {
          // Ignore malformed cache and fetch fresh result.
        }
      }

      setAiLoading(true)
      setAiError(null)
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const res = await fetch('/api/dashboard-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify(aiPayload),
      })

      if (!active) return

      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({}))) as { error?: string }
        setAiError(errorData.error ?? 'Could not load AI insights')
        setAiLoading(false)
        return
      }

      const data = (await res.json()) as DashboardAiData
      setAiData(data)
      if (typeof window !== 'undefined') {
        const cachePayload: DashboardAiCache = {
          signature,
          savedAt: Date.now(),
          data,
        }
        window.localStorage.setItem(AI_CACHE_KEY, JSON.stringify(cachePayload))
      }
      setAiLoading(false)
    }

    void loadAi()
    return () => {
      active = false
    }
  }, [profile, isDashboardDataLoading, aiPayload, hasAiInputs])

  if (!profile) return null

  return (
    <div className="p-4 md:p-6 mt-3 md:mt-5 flex flex-col items-center">
      <div className="w-full max-w-6xl flex flex-col md:flex-row md:items-center md:justify-between mb-4 border-b-2 border-b-green-600/70 pb-4 gap-3">
        <h1 className="text-3xl font-medium tracking-tight flex items-center gap-3">
          Welcome {profile.first_name}!
          <Avatar size="5" radius="full" src={profile.avatar_url ?? undefined} fallback={profile.first_name[0]} color="green" className="border-2 border-green-600" />
        </h1>
      </div>

      <div className="w-full max-w-6xl mb-6 rounded-2xl border border-green-100 bg-linear-to-r from-green-50 via-white to-emerald-50 p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-gray-700">
            Today is <span className="font-medium">{today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </p>
          {isPremium ? (
            <div className="flex flex-col items-start gap-3 md:items-end">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-green-700">History</span>
                {availableRanges.map((range) => (
                  <button
                    key={range.id}
                    type="button"
                    onClick={() => setSelectedRange(range.id)}
                    className={`rounded-full px-3 py-2 text-xs font-semibold transition-all ${
                      selectedRangeOption.id === range.id
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'border border-green-200 bg-white text-green-800 hover:border-green-400 hover:bg-green-50'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-full border border-green-200 bg-white px-4 py-2 text-xs font-medium text-green-800">
              Free dashboard range: 1 week
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-green-300 bg-linear-to-br from-white to-green-50/60 p-5 rounded-2xl shadow-sm">
          <p className="text-sm text-gray-600">Meals Logged Today</p>
          <p className="text-3xl font-semibold mt-1">{isDashboardDataLoading ? '-' : mealsToday}</p>
        </div>
        <div className="bg-white border border-green-300 bg-linear-to-br from-white to-green-50/60 p-5 rounded-2xl shadow-sm">
          <p className="text-sm text-gray-600">Bowels Logged Today</p>
          <p className="text-3xl font-semibold mt-1">{isDashboardDataLoading ? '-' : bowelsToday}</p>
        </div>
        <div className="bg-white border border-green-300 bg-linear-to-br from-white to-green-50/60 p-5 rounded-2xl shadow-sm">
          <p className="text-sm text-gray-600">Symptoms Logged Today</p>
          <p className="text-3xl font-semibold mt-1">{isDashboardDataLoading ? '-' : symptomsToday}</p>
        </div>
        <div className="bg-white border border-green-300 bg-linear-to-br from-white to-green-50/60 p-5 rounded-2xl shadow-sm">
          <p className="text-sm text-gray-600">Days Since Last Symptom</p>
          <p className="text-3xl font-semibold mt-1">
            {isDashboardDataLoading ? '-' : daysSinceSymptom === null ? '-' : daysSinceSymptom}
          </p>
        </div>
      </div>

      <section className="w-full max-w-6xl mb-6 rounded-2xl border border-green-300 bg-linear-to-br from-white via-green-50/50 to-emerald-50/70 p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 border-b border-green-200 pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-700">Daily Macros</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">Nutrition totals from today&apos;s logged foods</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              Keep weight goals and gut-health tracking in one place by turning your meal logs into daily calorie and macro totals.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
            <span className="rounded-full border border-green-200 bg-white px-3 py-1.5 font-medium">
              {isDashboardDataLoading ? 'Meals loading...' : `${mealsToday} meal${mealsToday === 1 ? '' : 's'} today`}
            </span>
            <span className="rounded-full border border-green-200 bg-white px-3 py-1.5 font-medium">
              {isDashboardDataLoading ? 'Foods loading...' : `${foodsLoggedToday} food item${foodsLoggedToday === 1 ? '' : 's'} logged`}
            </span>
          </div>
        </div>

        {isPremium ? (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-2xl border border-green-200 bg-white/90 p-4 shadow-sm">
                <p className="text-sm text-gray-600">Calories</p>
                <p className="mt-2 text-3xl font-semibold text-gray-950">
                  {isDashboardDataLoading ? '-' : formatMacroValue(dailyMacroTotals.calories, 0)}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">calories today</p>
              </div>
              <div className="rounded-2xl border border-green-200 bg-white/90 p-4 shadow-sm">
                <p className="text-sm text-gray-600">Protein</p>
                <p className="mt-2 text-3xl font-semibold text-gray-950">
                  {isDashboardDataLoading ? '-' : `${formatMacroValue(dailyMacroTotals.protein_g)}g`}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">daily total</p>
              </div>
              <div className="rounded-2xl border border-green-200 bg-white/90 p-4 shadow-sm">
                <p className="text-sm text-gray-600">Carbs</p>
                <p className="mt-2 text-3xl font-semibold text-gray-950">
                  {isDashboardDataLoading ? '-' : `${formatMacroValue(dailyMacroTotals.carbs_g)}g`}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">daily total</p>
              </div>
              <div className="rounded-2xl border border-green-200 bg-white/90 p-4 shadow-sm">
                <p className="text-sm text-gray-600">Fat</p>
                <p className="mt-2 text-3xl font-semibold text-gray-950">
                  {isDashboardDataLoading ? '-' : `${formatMacroValue(dailyMacroTotals.fat_g)}g`}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">daily total</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-green-200 bg-white/80 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Fiber</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {isDashboardDataLoading ? '-' : `${formatMacroValue(dailyMacroTotals.fiber_g)}g`}
                </p>
              </div>
              <div className="rounded-xl border border-green-200 bg-white/80 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Sugar</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {isDashboardDataLoading ? '-' : `${formatMacroValue(dailyMacroTotals.sugar_g)}g`}
                </p>
              </div>
              <div className="rounded-xl border border-green-200 bg-white/80 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Sodium</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {isDashboardDataLoading ? '-' : `${formatMacroValue(dailyMacroTotals.sodium_mg, 0)}mg`}
                </p>
              </div>
            </div>

            {/* <p className="mt-4 text-sm text-gray-600">
              These totals update from the foods you log, so you can track calories and macros for body-weight goals without leaving Tummer.
            </p> */}
          </>
        ) : (
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-green-300 bg-white/80 p-4">
            <div className="pointer-events-none space-y-4 opacity-45 blur-[2px] select-none">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {LOCKED_MACRO_PREVIEW.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-green-200 bg-white p-4 shadow-sm">
                    <p className="text-sm text-gray-600">{item.label}</p>
                    <p className="mt-2 text-3xl font-semibold text-gray-950">
                      {item.value}
                      <span className="ml-1 text-lg font-medium text-gray-500">{item.unit}</span>
                    </p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-green-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Fiber</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">24g</p>
                </div>
                <div className="rounded-xl border border-green-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Sugar</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">41g</p>
                </div>
                <div className="rounded-xl border border-green-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Sodium</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">2,180mg</p>
                </div>
              </div>
            </div>

            <div className="absolute inset-0 flex items-center justify-center bg-white/65 p-5">
              <div className="max-w-md rounded-2xl border border-green-200 bg-white px-5 py-4 text-center shadow-lg">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-green-100 text-green-800">
                  <IconLock size={20} />
                </div>
                <h3 className="mt-3 text-lg font-semibold text-gray-950">Upgrade to unlock daily macro tracking</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Premium shows your real daily calories, protein, carbs, fat, and more from the foods you&apos;ve logged.
                </p>
                <Link
                  href="/settings"
                  className="mt-4 inline-flex items-center justify-center rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-green-700"
                >
                  Upgrade your plan
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="w-full max-w-6xl mb-6">
        <AdSenseAd slot="4563997002" />
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
        <section className="lg:col-span-8 bg-white border border-green-300 bg-linear-to-br from-white to-green-50/60 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-green-200 pb-3">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <IconChartBar size={20} />
              Trend History
            </h2>
            <span className="text-xs text-gray-600">
              {chartWindowDays === 365 ? 'Last 12 months, grouped by month' : formatRangeSummary(chartWindowDays)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-xl border border-green-200 bg-white/80 p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Bowels per day</p>
              {isDashboardDataLoading ? (
                <div className="h-40 flex items-center justify-center">
                  <p className="text-sm text-gray-500">Loading chart...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="flex h-40 min-w-max items-end gap-2">
                  {chartBars.map((point) => {
                    const value = point.bowels
                    const heightPx = Math.max(10, Math.round((value / maxBowels) * 120))
                    return (
                      <div key={`bowel-${point.key}`} className="flex h-full w-10 flex-col items-center justify-end gap-1">
                        <span className="text-[11px] text-gray-600">{value}</span>
                        <div title={`${point.key}: ${value}`} className="w-full rounded-md bg-green-500/80 hover:bg-green-600 transition-all" style={{ height: `${heightPx}px` }} />
                        <span className="text-[11px] text-gray-600">{point.label}</span>
                      </div>
                    )
                  })}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-green-200 bg-white/80 p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Meals per day</p>
              {isDashboardDataLoading ? (
                <div className="h-40 flex items-center justify-center">
                  <p className="text-sm text-gray-500">Loading chart...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="flex h-40 min-w-max items-end gap-2">
                  {chartBars.map((point) => {
                    const value = point.meals
                    const heightPx = Math.max(10, Math.round((value / maxMeals) * 120))
                    return (
                      <div key={`meal-${point.key}`} className="flex h-full w-10 flex-col items-center justify-end gap-1">
                        <span className="text-[11px] text-gray-600">{value}</span>
                        <div title={`${point.key}: ${value}`} className="w-full rounded-md bg-emerald-500/80 hover:bg-emerald-600 transition-all" style={{ height: `${heightPx}px` }} />
                        <span className="text-[11px] text-gray-600">{point.label}</span>
                      </div>
                    )
                  })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="lg:col-span-4 bg-white border border-green-300 bg-linear-to-br from-white to-green-50/60 p-5 rounded-2xl shadow-sm space-y-3">
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
          <Link href="/community" className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 hover:border-green-400 hover:text-green-700 transition-all">
            <span className="font-medium">Engage with the Community</span>
            <IconUsersGroup size={22} />
          </Link>
        </section>
      </div>

      <div className="w-full max-w-6xl mb-6 bg-white border border-green-300 bg-linear-to-br from-white to-green-50/60 p-5 rounded-2xl shadow-sm">
        <div className="mb-3 flex flex-col gap-3 border-b border-green-200 pb-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <IconTrendingUp size={20} />
              Summary Table
            </h2>
            <span className="text-xs text-gray-600">
              {chartWindowDays === 365 ? 'Monthly totals and averages' : formatRangeSummary(chartWindowDays)}
            </span>
          </div>
          {isPremium ? (
            <MonthlyReportButton className="self-start md:items-end" label="Download report" />
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 border-b border-green-100">
                <th className="py-2 pr-2">Date</th>
                <th className="py-2 pr-2">Meals</th>
                <th className="py-2 pr-2">Bowels</th>
                <th className="py-2 pr-2">Symptoms</th>
                <th className="py-2 pr-2">Stress</th>
                <th className="py-2 pr-2">Sleep (hrs)</th>
                <th className="py-2 pr-2">Overall Feeling</th>
                <th className="py-2 pr-2">Flare Day</th>
                {showPeriodDay && <th className="py-2 pr-2">Period Day</th>}
                <th className="py-2 pr-2">Energy</th>
                <th className="py-2 pr-2">Hydration</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => {
                return (
                  <tr key={`row-${row.key}`} className="border-b border-green-50 last:border-b-0">
                    <td className="py-2 pr-2 font-medium text-gray-800">{row.label}</td>
                    <td className="py-2 pr-2">{row.meals}</td>
                    <td className="py-2 pr-2">{row.bowels}</td>
                    <td className="py-2 pr-2">{row.symptoms}</td>
                    <td className="py-2 pr-2">{row.stress ?? '-'}</td>
                    <td className="py-2 pr-2">{row.sleep ?? '-'}</td>
                    <td className="py-2 pr-2">{row.overallFeeling ?? '-'}</td>
                    <td className="py-2 pr-2">{row.flareDay}</td>
                    {showPeriodDay && <td className="py-2 pr-2">{row.periodDay}</td>}
                    <td className="py-2 pr-2">{row.energy ?? '-'}</td>
                    <td className="py-2 pr-2">{row.hydration ?? '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white border border-dashed border-green-300 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <IconBrain size={20} />
            <h3 className="text-lg font-semibold">AI Insights</h3>
          </div>
          <p className="mb-3 text-xs uppercase tracking-[0.18em] text-green-700">
            {isPremium ? 'Premium analysis: past 2 weeks' : 'Free analysis: past week'}
          </p>
          {aiLoading ? (
            <p className="text-sm text-gray-600">Generating insight...</p>
          ) : aiError ? (
            <p className="text-sm text-red-600">{aiError}</p>
          ) : (
            <p className="text-sm text-gray-700">{aiData?.insight ?? 'No insight yet.'}</p>
          )}
        </div>
        <div className="bg-white border border-dashed border-green-300 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <IconBrain size={20} />
            <h3 className="text-lg font-semibold">AI Alerts</h3>
          </div>
          <p className="mb-3 text-xs uppercase tracking-[0.18em] text-green-700">
            {isPremium ? 'Premium analysis: past 2 weeks' : 'Free analysis: past week'}
          </p>
          {aiLoading ? (
            <p className="text-sm text-gray-600">Checking trends...</p>
          ) : aiError ? (
            <p className="text-sm text-red-600">{aiError}</p>
          ) : (
            <p className="text-sm text-gray-700">{aiData?.alert ?? 'No alert right now.'}</p>
          )}
        </div>
      </div>

      {(isDashboardDataLoading || healthError) && (
        <div className="w-full max-w-6xl mt-5">
          {isDashboardDataLoading && <p className="text-sm text-gray-600">Loading dashboard health data...</p>}
          {healthError && <p className="text-sm text-red-600">{healthError}</p>}
        </div>
      )}
    </div>
  )
}
