import { NextResponse } from 'next/server'
import { getAuthenticatedBillingUser } from '@/lib/auth'
import { createSimplePdf } from '@/lib/pdf'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type ReportMeal = {
  id: string
  meal_name: string
  eaten_at: string
}

type ReportMealItem = {
  meal_id: string
  food_name: string
}

type ReportDailyLog = {
  id: string
  log_date: string
  overall_feeling: number | null
  stress_level: number | null
  energy_level: number | null
  sleep_hours: number | null
  hydration_level: number | null
  flare_day: boolean | null
}

type ReportSymptom = {
  daily_log_id: string
  symptom_name: string
  severity: number | null
}

type ReportBowel = {
  daily_log_id: string
}

type ReportTriggerFood = {
  name: string
  created_at: string
}

function average(values: Array<number | null>) {
  const numbers = values.filter((value): value is number => typeof value === 'number')

  if (numbers.length === 0) {
    return null
  }

  return Math.round((numbers.reduce((sum, value) => sum + value, 0) / numbers.length) * 10) / 10
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(value: string) {
  const date = new Date(value)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function topCounts(values: string[], limit = 5) {
  const map = new Map<string, number>()

  values.forEach((value) => {
    const normalized = value.trim()
    if (!normalized) return
    map.set(normalized, (map.get(normalized) ?? 0) + 1)
  })

  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
}

function buildReportLines(input: {
  startDate: string
  endDate: string
  meals: ReportMeal[]
  mealItems: ReportMealItem[]
  dailyLogs: ReportDailyLog[]
  symptoms: ReportSymptom[]
  bowels: ReportBowel[]
  newTriggerFoods: ReportTriggerFood[]
}) {
  const logDateById = new Map(input.dailyLogs.map((log) => [log.id, log.log_date]))
  const mealNames = input.meals.map((meal) => meal.meal_name)
  const foodNames = input.mealItems.map((item) => item.food_name)
  const flareDates = input.dailyLogs
    .filter((log) => log.flare_day === true)
    .map((log) => log.log_date)

  const symptomLines = input.symptoms
    .map((symptom) => {
      const logDate = logDateById.get(symptom.daily_log_id)
      if (!logDate) return null
      const severityText = symptom.severity === null ? '' : ` (severity ${symptom.severity})`
      return `${formatDate(logDate)}: ${symptom.symptom_name}${severityText}`
    })
    .filter((line): line is string => Boolean(line))

  const topFoods = topCounts(foodNames)
  const topMeals = topCounts(mealNames)
  const averageSleep = average(input.dailyLogs.map((log) => log.sleep_hours))
  const averageStress = average(input.dailyLogs.map((log) => log.stress_level))
  const averageEnergy = average(input.dailyLogs.map((log) => log.energy_level))
  const averageHydration = average(input.dailyLogs.map((log) => log.hydration_level))
  const averageFeeling = average(input.dailyLogs.map((log) => log.overall_feeling))
  const uniqueFoods = new Set(foodNames.map((food) => food.trim()).filter(Boolean)).size

  return [
    'Tummer Monthly Premium Report',
    `Coverage: ${formatDate(input.startDate)} to ${formatDate(input.endDate)}`,
    '',
    'Monthly Stats',
    `- Meals logged: ${input.meals.length}`,
    `- Food items logged: ${input.mealItems.length}`,
    `- Unique foods eaten: ${uniqueFoods}`,
    `- Daily logs completed: ${input.dailyLogs.length}`,
    `- Average sleep hours: ${averageSleep ?? '-'}`,
    `- Average stress level: ${averageStress ?? '-'}`,
    `- Average energy level: ${averageEnergy ?? '-'}`,
    `- Average hydration level: ${averageHydration ?? '-'}`,
    `- Average overall feeling: ${averageFeeling ?? '-'}`,
    `- Bowel movements logged: ${input.bowels.length}`,
    `- Symptoms logged: ${input.symptoms.length}`,
    `- Flare days logged: ${flareDates.length}`,
    '',
    'Most Common Foods',
    ...(topFoods.length > 0 ? topFoods.map(([food, count]) => `- ${food}: ${count}`) : ['- None logged']),
    '',
    'Most Common Meals',
    ...(topMeals.length > 0 ? topMeals.map(([meal, count]) => `- ${meal}: ${count}`) : ['- None logged']),
    '',
    'New Trigger Foods Logged',
    ...(input.newTriggerFoods.length > 0
      ? input.newTriggerFoods.map((food) => `- ${food.name} (${formatDateTime(food.created_at)})`)
      : ['- No new trigger foods logged this month']),
    '',
    'Symptoms Logged',
    ...(symptomLines.length > 0 ? symptomLines : ['- No symptoms logged this month']),
    '',
    'Flare Days',
    ...(flareDates.length > 0 ? flareDates.map((date) => `- ${formatDate(date)}`) : ['- No flare days logged this month']),
  ]
}

export async function GET(request: Request) {
  try {
    const authResult = await getAuthenticatedBillingUser(request)

    if ('response' in authResult) {
      return authResult.response
    }

    if (!authResult.profile.is_premium) {
      return NextResponse.json({ error: 'Premium subscription required' }, { status: 403 })
    }

    const now = new Date()
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - 29)

    const startKey = startDate.toISOString().slice(0, 10)
    const endKey = now.toISOString().slice(0, 10)

    const [mealsRes, dailyLogsRes, triggerFoodsRes] = await Promise.all([
      supabaseAdmin
        .from('meals')
        .select('id, meal_name, eaten_at')
        .eq('user_id', authResult.userId)
        .gte('eaten_at', `${startKey}T00:00:00.000Z`)
        .lte('eaten_at', `${endKey}T23:59:59.999Z`)
        .order('eaten_at', { ascending: false }),
      supabaseAdmin
        .from('daily_logs')
        .select('id, log_date, overall_feeling, stress_level, energy_level, sleep_hours, hydration_level, flare_day')
        .eq('user_id', authResult.userId)
        .gte('log_date', startKey)
        .lte('log_date', endKey)
        .order('log_date', { ascending: true }),
      supabaseAdmin
        .from('user_foods')
        .select('name, created_at')
        .eq('user_id', authResult.userId)
        .eq('status', 'trigger')
        .gte('created_at', `${startKey}T00:00:00.000Z`)
        .lte('created_at', `${endKey}T23:59:59.999Z`)
        .order('created_at', { ascending: false }),
    ])

    if (mealsRes.error) throw mealsRes.error
    if (dailyLogsRes.error) throw dailyLogsRes.error
    if (triggerFoodsRes.error) throw triggerFoodsRes.error

    const meals = (mealsRes.data ?? []) as ReportMeal[]
    const dailyLogs = (dailyLogsRes.data ?? []) as ReportDailyLog[]
    const triggerFoods = (triggerFoodsRes.data ?? []) as ReportTriggerFood[]

    const mealIds = meals.map((meal) => meal.id)
    const dailyLogIds = dailyLogs.map((log) => log.id)

    const [mealItemsRes, symptomsRes, bowelsRes] = await Promise.all([
      mealIds.length > 0
        ? supabaseAdmin
            .from('meal_items')
            .select('meal_id, food_name')
            .in('meal_id', mealIds)
        : Promise.resolve({ data: [], error: null }),
      dailyLogIds.length > 0
        ? supabaseAdmin
            .from('symptom_entries')
            .select('daily_log_id, symptom_name, severity')
            .in('daily_log_id', dailyLogIds)
        : Promise.resolve({ data: [], error: null }),
      dailyLogIds.length > 0
        ? supabaseAdmin
            .from('bowel_entries')
            .select('daily_log_id')
            .in('daily_log_id', dailyLogIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (mealItemsRes.error) throw mealItemsRes.error
    if (symptomsRes.error) throw symptomsRes.error
    if (bowelsRes.error) throw bowelsRes.error

    const lines = buildReportLines({
      startDate: startKey,
      endDate: endKey,
      meals,
      mealItems: (mealItemsRes.data ?? []) as ReportMealItem[],
      dailyLogs,
      symptoms: (symptomsRes.data ?? []) as ReportSymptom[],
      bowels: (bowelsRes.data ?? []) as ReportBowel[],
      newTriggerFoods: triggerFoods,
    })

    const pdf = createSimplePdf(lines)

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="tummer-monthly-report-${endKey}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Monthly report generation error:', error)
    return NextResponse.json({ error: 'Unable to generate monthly report' }, { status: 500 })
  }
}
