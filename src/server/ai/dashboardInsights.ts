import 'server-only'
import OpenAI from 'openai'
import { DASHBOARD_AI_EMPTY_STATE, hasDashboardInsightInputs } from '@/src/shared/dashboardAi'

export type DashboardAiPayload = {
  today: string
  analysisDays?: number
  mealsToday: number
  bowelsToday: number
  symptomsToday: number
  daysSinceSymptom: number | null
  weeklyMeals: Array<{ date: string; value: number }>
  weeklyBowels: Array<{ date: string; value: number }>
  weeklyBowelDetails?: Array<{
    date: string
    entries: Array<{
      bristol_type: number | null
      urgency_level: number | null
      blood_present: boolean | null
      mucus_present: boolean | null
      notes: string | null
    }>
  }>
  weeklySymptoms: Array<{ date: string; value: number }>
  weeklySymptomDetails?: Array<{
    date: string
    entries: Array<{
      symptom_name: string
      severity: number | null
      notes: string | null
    }>
  }>
  weeklyFactors?: Array<{
    date: string
    stress_level: number | null
    sleep_hours: number | null
    energy_level: number | null
    hydration_level: number | null
    overall_feeling: number | null
    flare_day: boolean | null
    period_day: boolean | null
  }>
  weeklyDailyNotes?: Array<{
    date: string
    notes: string | null
  }>
  triggerFoods?: string[]
  weeklyTriggerMeals?: Array<{
    date: string
    meal_name: string
    trigger_food: string
  }>
  weeklyMealEntries?: Array<{
    date: string
    meal_name: string
    items: string[]
  }>
  profileContext?: {
    condition?: string | null
    dietaryRestriction?: string | null
  }
}

export type DashboardAiResult = {
  insight: string
  alert: string
}

type Trend = 'up' | 'down' | 'flat' | 'insufficient'

type DashboardAiStructured = {
  insight_title: string
  insight: string
  alert: string
  likely_drivers: string[]
  watch_next: string
  confidence: 'low' | 'medium' | 'high'
}

type ConditionFoodFlag = {
  date: string
  meal_name: string
  matched_food: string
  reason: string
  alternative: string
}

type ConditionFoodRule = {
  conditionTokens: string[]
  riskyFoods: Array<{
    keywords: string[]
    reason: string
    alternative: string
  }>
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

function describeAnalysisWindow(days?: number): string {
  if (days === 14) return 'the past 2 weeks'
  if (days === 7) return 'the past week'
  if (typeof days === 'number' && days > 0) return `the past ${days} days`
  return 'the recent tracking window'
}

function avg(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function sumSeries(series: Array<{ date: string; value: number }>): number {
  return series.reduce((acc, item) => acc + item.value, 0)
}

function maxSeries(series: Array<{ date: string; value: number }>): number {
  return series.reduce((acc, item) => Math.max(acc, item.value), 0)
}

function recentWindowAvg(series: Array<{ date: string; value: number }>, size = 3): number | null {
  if (series.length === 0) return null
  const window = series.slice(-size)
  if (window.length === 0) return null
  return avg(window.map((x) => x.value))
}

function trendOfSeries(series: Array<{ date: string; value: number }>): Trend {
  if (series.length < 4) return 'insufficient'

  const midpoint = Math.floor(series.length / 2)
  const firstHalf = series.slice(0, midpoint)
  const secondHalf = series.slice(midpoint)

  const firstAvg = avg(firstHalf.map((x) => x.value))
  const secondAvg = avg(secondHalf.map((x) => x.value))

  if (firstAvg === null || secondAvg === null) return 'insufficient'

  const diff = secondAvg - firstAvg

  if (diff >= 0.75) return 'up'
  if (diff <= -0.75) return 'down'
  return 'flat'
}

function countHighDays(series: Array<{ date: string; value: number }>, threshold: number): number {
  return series.filter((x) => x.value >= threshold).length
}

function countZeroDays(series: Array<{ date: string; value: number }>): number {
  return series.filter((x) => x.value === 0).length
}

function arraysAlignedByIndex<T>(a: T[], b: unknown[]): boolean {
  return a.length > 0 && b.length > 0 && a.length === b.length
}

function correlationHint(
  left: Array<number | null | undefined>,
  right: Array<number | null | undefined>,
  leftName: string,
  rightName: string
): string | null {
  const pairs: Array<[number, number]> = []

  for (let i = 0; i < Math.min(left.length, right.length); i++) {
    const a = left[i]
    const b = right[i]
    if (typeof a === 'number' && typeof b === 'number' && Number.isFinite(a) && Number.isFinite(b)) {
      pairs.push([a, b])
    }
  }

  if (pairs.length < 4) return null

  const xs = pairs.map(([x]) => x)
  const ys = pairs.map(([, y]) => y)

  const xAvg = avg(xs)
  const yAvg = avg(ys)
  if (xAvg === null || yAvg === null) return null

  let numerator = 0
  let xDen = 0
  let yDen = 0

  for (let i = 0; i < pairs.length; i++) {
    const dx = xs[i] - xAvg
    const dy = ys[i] - yAvg
    numerator += dx * dy
    xDen += dx * dx
    yDen += dy * dy
  }

  if (xDen === 0 || yDen === 0) return null

  const r = numerator / Math.sqrt(xDen * yDen)

  if (r >= 0.45) return `${leftName} tends to rise with ${rightName}`
  if (r <= -0.45) return `${leftName} tends to fall as ${rightName} rises`
  return null
}

function averageForMatchingDays(
  factorValues: Array<number | null | undefined>,
  symptoms: number[],
  predicate: (symptomValue: number) => boolean
): number | null {
  const matching: number[] = []

  for (let i = 0; i < Math.min(factorValues.length, symptoms.length); i++) {
    const factor = factorValues[i]
    const symptom = symptoms[i]
    if (typeof factor === 'number' && Number.isFinite(factor) && predicate(symptom)) {
      matching.push(factor)
    }
  }

  return avg(matching)
}

function countBooleanOnSymptomDays(
  flags: Array<boolean | null | undefined>,
  symptoms: number[],
  predicate: (symptomValue: number) => boolean
): number {
  let count = 0
  for (let i = 0; i < Math.min(flags.length, symptoms.length); i++) {
    if (predicate(symptoms[i]) && flags[i] === true) count++
  }
  return count
}

function countOverlapDays(
  seriesA: Array<{ date: string; value: number }>,
  seriesB: Array<{ date: string; value: number }>,
  thresholdA: number,
  thresholdB: number
): number {
  let count = 0
  for (let i = 0; i < Math.min(seriesA.length, seriesB.length); i++) {
    if (seriesA[i].value >= thresholdA && seriesB[i].value >= thresholdB) count++
  }
  return count
}

function changeBetweenWindows(
  series: Array<{ date: string; value: number }>,
  windowSize = 3
): number | null {
  if (series.length < windowSize * 2) return null

  const earlier = series.slice(-(windowSize * 2), -windowSize)
  const recent = series.slice(-windowSize)

  const earlierAvg = avg(earlier.map((x) => x.value))
  const recentAvg = avg(recent.map((x) => x.value))

  if (earlierAvg === null || recentAvg === null) return null
  return recentAvg - earlierAvg
}

function daysBetweenDateKeys(fromDate: string, toDate: string): number {
  const a = new Date(`${fromDate}T00:00:00`)
  const b = new Date(`${toDate}T00:00:00`)
  const diff = b.getTime() - a.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function truncateTextList(values: Array<string | null | undefined>, limit = 4, maxLen = 120): string[] {
  return values
    .map((value) => sanitizeOutput(value, maxLen))
    .filter(Boolean)
    .slice(0, limit)
}

function normalizeFoodText(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const CONDITION_FOOD_RULES: ConditionFoodRule[] = [
  {
    conditionTokens: ['ibs', 'irritable bowel'],
    riskyFoods: [
      { keywords: ['onion', 'garlic'], reason: 'high-FODMAP aromatics often worsen IBS symptoms', alternative: 'herb-seasoned low-FODMAP meals' },
      { keywords: ['bean', 'beans', 'lentil', 'lentils'], reason: 'legumes can be harder to tolerate with IBS', alternative: 'eggs, tofu, or lean protein' },
      { keywords: ['milk', 'ice cream'], reason: 'dairy can aggravate IBS for some people', alternative: 'lactose-free or lower-FODMAP options' },
      { keywords: ['fried', 'greasy', 'pizza', 'burger'], reason: 'high-fat meals can aggravate IBS symptoms', alternative: 'baked or grilled lighter meals' },
    ],
  },
  {
    conditionTokens: ['crohn', 'ibd', 'ulcerative colitis', 'colitis'],
    riskyFoods: [
      { keywords: ['fried', 'greasy', 'buffalo'], reason: 'high-fat or greasy foods are often harder to tolerate during flares', alternative: 'baked, grilled, or softer meals' },
      { keywords: ['popcorn', 'nuts', 'seeds'], reason: 'rougher foods can be difficult during active gut symptoms', alternative: 'softer lower-residue foods' },
      { keywords: ['spicy', 'hot cheeto', 'takis'], reason: 'spicy foods may irritate an inflamed gut', alternative: 'milder seasoned meals' },
    ],
  },
  {
    conditionTokens: ['gerd', 'reflux', 'heartburn'],
    riskyFoods: [
      { keywords: ['coffee', 'espresso'], reason: 'coffee can worsen reflux symptoms', alternative: 'lower-acid or non-caffeinated drinks' },
      { keywords: ['tomato', 'marinara', 'salsa'], reason: 'acidic tomato foods can trigger reflux', alternative: 'less acidic sauces or bowls' },
      { keywords: ['fried', 'greasy', 'pepperoni', 'sausage'], reason: 'high-fat foods can worsen reflux', alternative: 'leaner baked or grilled meals' },
      { keywords: ['chocolate', 'peppermint'], reason: 'common reflux triggers showed up in meals', alternative: 'blander snack options' },
    ],
  },
  {
    conditionTokens: ['celiac', 'gluten'],
    riskyFoods: [
      { keywords: ['bread', 'pasta', 'pizza', 'bagel', 'flour tortilla', 'soy sauce'], reason: 'these foods may contain gluten and are usually best avoided with celiac disease', alternative: 'certified gluten-free alternatives' },
    ],
  },
  {
    conditionTokens: ['lactose'],
    riskyFoods: [
      { keywords: ['milk', 'ice cream', 'alfredo', 'cream sauce'], reason: 'higher-lactose foods can worsen lactose intolerance symptoms', alternative: 'lactose-free dairy or lower-lactose swaps' },
    ],
  },
]

const GENERIC_HEALTHIER_SWAPS: Array<{
  keywords: string[]
  reason: string
  alternative: string
}> = [
  { keywords: ['soda', 'cola', 'energy drink'], reason: 'sugary drinks showed up in meals', alternative: 'water, tea, or lower-sugar drinks' },
  { keywords: ['fried', 'fries', 'fried chicken'], reason: 'fried foods were logged recently', alternative: 'baked or grilled options' },
  { keywords: ['candy', 'donut', 'cake'], reason: 'high-sugar foods were logged recently', alternative: 'fruit or a simpler lower-sugar snack' },
  { keywords: ['pizza', 'burger', 'fast food'], reason: 'more processed higher-fat meals were logged recently', alternative: 'balanced meals with lean protein and simpler sides' },
]

function findConditionFoodFlags(payload: DashboardAiPayload): ConditionFoodFlag[] {
  const condition = normalizeFoodText(payload.profileContext?.condition)
  const entries = payload.weeklyMealEntries ?? []
  const matchedRule = CONDITION_FOOD_RULES.find((rule) => rule.conditionTokens.some((token) => condition.includes(token)))

  if (!matchedRule) return []

  const flags: ConditionFoodFlag[] = []

  for (const entry of entries) {
    const foodsToScan = [entry.meal_name, ...(entry.items ?? [])].map(normalizeFoodText).filter(Boolean)

    for (const riskyFood of matchedRule.riskyFoods) {
      const keyword = riskyFood.keywords.find((token) => foodsToScan.some((food) => food.includes(token)))
      if (!keyword) continue

      flags.push({
        date: entry.date,
        meal_name: entry.meal_name,
        matched_food: keyword,
        reason: riskyFood.reason,
        alternative: riskyFood.alternative,
      })
      break
    }
  }

  return flags
}

function findGenericHealthySwapFlags(payload: DashboardAiPayload): ConditionFoodFlag[] {
  if (normalizeFoodText(payload.profileContext?.condition)) return []

  const entries = payload.weeklyMealEntries ?? []
  const flags: ConditionFoodFlag[] = []

  for (const entry of entries) {
    const foodsToScan = [entry.meal_name, ...(entry.items ?? [])].map(normalizeFoodText).filter(Boolean)

    for (const riskyFood of GENERIC_HEALTHIER_SWAPS) {
      const keyword = riskyFood.keywords.find((token) => foodsToScan.some((food) => food.includes(token)))
      if (!keyword) continue

      flags.push({
        date: entry.date,
        meal_name: entry.meal_name,
        matched_food: keyword,
        reason: riskyFood.reason,
        alternative: riskyFood.alternative,
      })
      break
    }
  }

  return flags
}

function buildAnalytics(payload: DashboardAiPayload) {
  const factors = payload.weeklyFactors ?? []
  const bowelDetails = payload.weeklyBowelDetails ?? []
  const symptomDetails = payload.weeklySymptomDetails ?? []
  const dailyNotes = payload.weeklyDailyNotes ?? []
  const triggerFoods = payload.triggerFoods ?? []
  const weeklyTriggerMeals = payload.weeklyTriggerMeals ?? []
  const weeklyMealEntries = payload.weeklyMealEntries ?? []
  const profileContext = payload.profileContext ?? {}
  const symptomValues = payload.weeklySymptoms.map((x) => x.value)
  const bowelValues = payload.weeklyBowels.map((x) => x.value)
  const mealValues = payload.weeklyMeals.map((x) => x.value)

  const symptomTrend = trendOfSeries(payload.weeklySymptoms)
  const bowelTrend = trendOfSeries(payload.weeklyBowels)
  const mealTrend = trendOfSeries(payload.weeklyMeals)

  const weeklySymptomTotal = sumSeries(payload.weeklySymptoms)
  const weeklyBowelTotal = sumSeries(payload.weeklyBowels)
  const weeklyMealTotal = sumSeries(payload.weeklyMeals)

  const recentSymptomsAvg = recentWindowAvg(payload.weeklySymptoms, 3)
  const recentMealsAvg = recentWindowAvg(payload.weeklyMeals, 3)
  const recentBowelsAvg = recentWindowAvg(payload.weeklyBowels, 3)

  const avgStress = avg(factors.map((f) => f.stress_level))
  const avgSleep = avg(factors.map((f) => f.sleep_hours))
  const avgEnergy = avg(factors.map((f) => f.energy_level))
  const avgHydration = avg(factors.map((f) => f.hydration_level))
  const avgFeeling = avg(factors.map((f) => f.overall_feeling))

  const flareDays = factors.filter((f) => f.flare_day === true).length
  const periodDays = factors.filter((f) => f.period_day === true).length

  const bowelEntries = bowelDetails.flatMap((day) => day.entries)
  const symptomEntries = symptomDetails.flatMap((day) => day.entries)
  const avgBristolType = avg(bowelEntries.map((entry) => entry.bristol_type))
  const avgBowelUrgency = avg(bowelEntries.map((entry) => entry.urgency_level))
  const bloodPresentCount = bowelEntries.filter((entry) => entry.blood_present === true).length
  const mucusPresentCount = bowelEntries.filter((entry) => entry.mucus_present === true).length
  const looseStoolCount = bowelEntries.filter((entry) => typeof entry.bristol_type === 'number' && entry.bristol_type >= 6).length
  const hardStoolCount = bowelEntries.filter((entry) => typeof entry.bristol_type === 'number' && entry.bristol_type <= 2).length
  const bowelNotes = truncateTextList(bowelEntries.map((entry) => entry.notes))
  const symptomNotes = truncateTextList(symptomEntries.map((entry) => entry.notes))
  const dailyLogNotes = truncateTextList(dailyNotes.map((entry) => entry.notes))

  const stressVsSymptoms = correlationHint(
    factors.map((f) => f.stress_level),
    symptomValues,
    'Stress',
    'symptoms'
  )

  const sleepVsSymptoms = correlationHint(
    factors.map((f) => f.sleep_hours),
    symptomValues,
    'Sleep',
    'symptoms'
  )

  const energyVsSymptoms = correlationHint(
    factors.map((f) => f.energy_level),
    symptomValues,
    'Energy',
    'symptoms'
  )

  const hydrationVsSymptoms = correlationHint(
    factors.map((f) => f.hydration_level),
    symptomValues,
    'Hydration',
    'symptoms'
  )

  const bowelsVsSymptoms = correlationHint(
    bowelValues,
    symptomValues,
    'Bowel activity',
    'symptoms'
  )

  const mealsVsSymptoms = correlationHint(
    mealValues,
    symptomValues,
    'Meal volume',
    'symptoms'
  )

  const alignedFactors = arraysAlignedByIndex(factors, symptomValues)

  const avgSleepOnSymptomDays = alignedFactors
    ? averageForMatchingDays(
        factors.map((f) => f.sleep_hours),
        symptomValues,
        (symptom) => symptom > 0
      )
    : null

  const avgSleepOnQuietDays = alignedFactors
    ? averageForMatchingDays(
        factors.map((f) => f.sleep_hours),
        symptomValues,
        (symptom) => symptom === 0
      )
    : null

  const avgStressOnSymptomDays = alignedFactors
    ? averageForMatchingDays(
        factors.map((f) => f.stress_level),
        symptomValues,
        (symptom) => symptom > 0
      )
    : null

  const avgStressOnQuietDays = alignedFactors
    ? averageForMatchingDays(
        factors.map((f) => f.stress_level),
        symptomValues,
        (symptom) => symptom === 0
      )
    : null

  const avgHydrationOnSymptomDays = alignedFactors
    ? averageForMatchingDays(
        factors.map((f) => f.hydration_level),
        symptomValues,
        (symptom) => symptom > 0
      )
    : null

  const avgHydrationOnQuietDays = alignedFactors
    ? averageForMatchingDays(
        factors.map((f) => f.hydration_level),
        symptomValues,
        (symptom) => symptom === 0
      )
    : null

  const flareDaysWithSymptoms = alignedFactors
    ? countBooleanOnSymptomDays(
        factors.map((f) => f.flare_day),
        symptomValues,
        (symptom) => symptom > 0
      )
    : 0

  const periodDaysWithSymptoms = alignedFactors
    ? countBooleanOnSymptomDays(
        factors.map((f) => f.period_day),
        symptomValues,
        (symptom) => symptom > 0
      )
    : 0

  const symptomBowelOverlapDays = countOverlapDays(
    payload.weeklySymptoms,
    payload.weeklyBowels,
    1,
    2
  )

  const symptomRecentChange = changeBetweenWindows(payload.weeklySymptoms, 3)
  const bowelRecentChange = changeBetweenWindows(payload.weeklyBowels, 3)
  const mealRecentChange = changeBetweenWindows(payload.weeklyMeals, 3)
  const recentTriggerMeals = weeklyTriggerMeals.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
  const latestTriggerMeal = recentTriggerMeals[0] ?? null
  const conditionFoodFlags = findConditionFoodFlags(payload)
  const genericFoodFlags = findGenericHealthySwapFlags(payload)
  const recentConditionFoodFlags = conditionFoodFlags.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
  const recentGenericFoodFlags = genericFoodFlags.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)

  return {
    today: {
      date: payload.today,
      mealsToday: payload.mealsToday,
      bowelsToday: payload.bowelsToday,
      symptomsToday: payload.symptomsToday,
      daysSinceSymptom: payload.daysSinceSymptom,
    },
    weekly: {
      symptomTrend,
      bowelTrend,
      mealTrend,
      weeklySymptomTotal,
      weeklyBowelTotal,
      weeklyMealTotal,
      recentSymptomsAvg,
      recentMealsAvg,
      recentBowelsAvg,
      symptomRecentChange,
      bowelRecentChange,
      mealRecentChange,
      maxSymptomsInOneDay: maxSeries(payload.weeklySymptoms),
      maxBowelsInOneDay: maxSeries(payload.weeklyBowels),
      maxMealsInOneDay: maxSeries(payload.weeklyMeals),
      highSymptomDays: countHighDays(payload.weeklySymptoms, 2),
      highBowelDays: countHighDays(payload.weeklyBowels, 3),
      zeroSymptomDays: countZeroDays(payload.weeklySymptoms),
      symptomBowelOverlapDays,
    },
    factors: {
      avgStress,
      avgSleep,
      avgEnergy,
      avgHydration,
      avgFeeling,
      flareDays,
      periodDays,
      flareDaysWithSymptoms,
      periodDaysWithSymptoms,
      avgSleepOnSymptomDays,
      avgSleepOnQuietDays,
      avgStressOnSymptomDays,
      avgStressOnQuietDays,
      avgHydrationOnSymptomDays,
      avgHydrationOnQuietDays,
    },
    bowelDetails: {
      avgBristolType,
      avgBowelUrgency,
      bloodPresentCount,
      mucusPresentCount,
      looseStoolCount,
      hardStoolCount,
      bowelNotes,
      symptomNotes,
      dailyLogNotes,
    },
    triggerFoods,
    profileContext,
    triggerMeals: {
      total: weeklyTriggerMeals.length,
      recent: recentTriggerMeals,
      latest: latestTriggerMeal,
    },
    conditionFoodFlags: {
      total: conditionFoodFlags.length,
      recent: recentConditionFoodFlags,
      latest: recentConditionFoodFlags[0] ?? null,
    },
    genericFoodFlags: {
      total: genericFoodFlags.length,
      recent: recentGenericFoodFlags,
      latest: recentGenericFoodFlags[0] ?? null,
    },
    patternHints: [
      stressVsSymptoms,
      sleepVsSymptoms,
      energyVsSymptoms,
      hydrationVsSymptoms,
      bowelsVsSymptoms,
      mealsVsSymptoms,
    ].filter((x): x is string => Boolean(x)),
    raw: {
      weeklyMeals: payload.weeklyMeals,
      weeklyBowels: payload.weeklyBowels,
      weeklyBowelDetails: payload.weeklyBowelDetails ?? [],
      weeklySymptoms: payload.weeklySymptoms,
      weeklySymptomDetails: payload.weeklySymptomDetails ?? [],
      weeklyFactors: payload.weeklyFactors ?? [],
      weeklyDailyNotes: payload.weeklyDailyNotes ?? [],
      triggerFoods,
      weeklyTriggerMeals,
      weeklyMealEntries,
      profileContext,
    },
  }
}

function buildFallbackDrivers(analytics: ReturnType<typeof buildAnalytics>): string[] {
  const drivers: string[] = []

  if (analytics.weekly.symptomTrend === 'up') {
    drivers.push('symptoms are trending upward')
  }

  if (analytics.weekly.bowelTrend === 'up') {
    drivers.push('bowel activity is trending upward')
  }

  if (analytics.bowelDetails.bloodPresentCount > 0) {
    drivers.push('blood was logged in recent bowel entries')
  }

  if (analytics.bowelDetails.mucusPresentCount > 0) {
    drivers.push('mucus was logged in recent bowel entries')
  }

  if (analytics.bowelDetails.looseStoolCount >= 2) {
    drivers.push('looser Bristol stool patterns are showing up repeatedly')
  }

  if (analytics.bowelDetails.hardStoolCount >= 2) {
    drivers.push('harder Bristol stool patterns are showing up repeatedly')
  }

  if (
    analytics.factors.avgSleepOnSymptomDays !== null &&
    analytics.factors.avgSleepOnQuietDays !== null &&
    analytics.factors.avgSleepOnSymptomDays + 0.5 < analytics.factors.avgSleepOnQuietDays
  ) {
    drivers.push('symptom days are happening with less sleep')
  }

  if (
    analytics.factors.avgStressOnSymptomDays !== null &&
    analytics.factors.avgStressOnQuietDays !== null &&
    analytics.factors.avgStressOnSymptomDays >= analytics.factors.avgStressOnQuietDays + 0.5
  ) {
    drivers.push('symptom days are happening with higher stress')
  }

  if (
    analytics.factors.avgHydrationOnSymptomDays !== null &&
    analytics.factors.avgHydrationOnQuietDays !== null &&
    analytics.factors.avgHydrationOnSymptomDays + 0.5 < analytics.factors.avgHydrationOnQuietDays
  ) {
    drivers.push('symptom days are happening with lower hydration')
  }

  if (analytics.weekly.symptomBowelOverlapDays >= 2) {
    drivers.push('symptoms and bowel spikes are overlapping on multiple days')
  }

  if (analytics.triggerMeals.total > 0) {
    drivers.push('meals matched your trigger-food list this week')
  }

  if (analytics.conditionFoodFlags.total > 0) {
    drivers.push('recent meals included foods that are often less well tolerated for your condition')
  }

  if (analytics.genericFoodFlags.total > 0) {
    drivers.push('recent meals included foods that could be swapped for gentler or healthier options')
  }

  if (analytics.factors.flareDaysWithSymptoms >= 2) {
    drivers.push('symptoms are clustering on flare days')
  }

  if (analytics.factors.periodDaysWithSymptoms >= 2) {
    drivers.push('symptoms are clustering on period days')
  }

  if (drivers.length === 0 && analytics.patternHints.length > 0) {
    drivers.push(analytics.patternHints[0])
  }

  return drivers
}

function fallbackInsight(payload: DashboardAiPayload): DashboardAiResult {
  const analytics = buildAnalytics(payload)
  const windowLabel = describeAnalysisWindow(payload.analysisDays)
  const drivers = buildFallbackDrivers(analytics)
  let insight = ''
  let alert = ''

  if (analytics.conditionFoodFlags.latest) {
    const recent = analytics.conditionFoodFlags.latest
    const daysAgo = Math.max(0, daysBetweenDateKeys(recent.date, payload.today))
    insight = `Recent meals included "${recent.matched_food}" in "${recent.meal_name}" ${daysAgo} day${daysAgo === 1 ? '' : 's'} ago. That food is often best limited with ${analytics.profileContext.condition ?? 'this condition'} because ${recent.reason}.`
  } else if (analytics.genericFoodFlags.latest) {
    const recent = analytics.genericFoodFlags.latest
    const daysAgo = Math.max(0, daysBetweenDateKeys(recent.date, payload.today))
    insight = `Recent meals included "${recent.matched_food}" in "${recent.meal_name}" ${daysAgo} day${daysAgo === 1 ? '' : 's'} ago. ${recent.reason}, so it may be worth trying ${recent.alternative}.`
  } else if (analytics.triggerMeals.latest) {
    const recent = analytics.triggerMeals.latest
    const daysAgo = Math.max(0, daysBetweenDateKeys(recent.date, payload.today))
    insight = `Recent trigger-food exposure: "${recent.meal_name}" matched trigger food "${recent.trigger_food}" ${daysAgo} day${daysAgo === 1 ? '' : 's'} ago. Compare symptom and bowel changes around that day.`
  } else if (drivers.length > 0) {
    insight = `The clearest pattern right now is that ${drivers[0]}.`
  } else if (payload.symptomsToday > 0) {
    insight = `Symptoms were logged today, but the current data from ${windowLabel} does not yet show a strong repeated pattern.`
  } else if (payload.daysSinceSymptom !== null) {
    insight = `You are ${payload.daysSinceSymptom} day${payload.daysSinceSymptom === 1 ? '' : 's'} out from your last symptom log, which is useful for spotting what changes help keep symptoms quieter.`
  } else {
    insight = `Keep logging consistently so the app can separate one-off days from repeated symptom patterns across ${windowLabel}.`
  }

  if (analytics.profileContext.condition || analytics.profileContext.dietaryRestriction) {
    const conditionText = analytics.profileContext.condition ? `condition: ${analytics.profileContext.condition}` : ''
    const restrictionText = analytics.profileContext.dietaryRestriction ? `restriction: ${analytics.profileContext.dietaryRestriction}` : ''
    const combined = [conditionText, restrictionText].filter(Boolean).join(', ')
    if (combined) {
      insight = `${insight} Profile context considered (${combined}).`
    }
  }

  if (analytics.conditionFoodFlags.latest) {
    const recent = analytics.conditionFoodFlags.latest
    alert = `Because "${recent.matched_food}" is often less well tolerated for ${analytics.profileContext.condition ?? 'your condition'}, try ${recent.alternative} next and watch the next 48 to 72 hours.`
  } else if (analytics.genericFoodFlags.latest) {
    const recent = analytics.genericFoodFlags.latest
    alert = `Try swapping "${recent.matched_food}" for ${recent.alternative} in the next few days and compare how meals and symptoms feel.`
  } else if (analytics.triggerMeals.latest && payload.symptomsToday > 0) {
    const recent = analytics.triggerMeals.latest
    alert = `Because "${recent.trigger_food}" was recently logged, try reducing or avoiding it for 2 to 3 days and monitor whether symptoms and bowel activity improve.`
  } else if (payload.symptomsToday >= 2 && analytics.weekly.symptomBowelOverlapDays >= 1) {
    alert = `Today looks more active than usual. Compare today's symptoms with bowel activity, sleep, and stress to see whether this matches your other higher-symptom days.`
  } else if (analytics.weekly.symptomTrend === 'up') {
    alert = `Symptoms are rising across ${windowLabel}. Watch whether the next 2 to 3 days follow the same pattern, especially around sleep, stress, and bowel activity.`
  } else if (analytics.bowelDetails.bloodPresentCount > 0) {
    alert = `Blood was logged in recent bowel entries. Review timing, stool pattern, and associated notes, and follow your clinician's guidance if this is new or worsening.`
  } else if (analytics.bowelDetails.mucusPresentCount > 0) {
    alert = `Mucus was logged in recent bowel entries. Watch whether it clusters with symptoms, urgency, Bristol changes, or specific meals over the next few days.`
  } else if (
    analytics.factors.avgSleepOnSymptomDays !== null &&
    analytics.factors.avgSleepOnQuietDays !== null &&
    analytics.factors.avgSleepOnSymptomDays + 0.5 < analytics.factors.avgSleepOnQuietDays
  ) {
    alert = `Lower-sleep days appear to be worse days. Track whether improving sleep over the next few days changes symptom frequency.`
  } else if (
    analytics.factors.avgStressOnSymptomDays !== null &&
    analytics.factors.avgStressOnQuietDays !== null &&
    analytics.factors.avgStressOnSymptomDays >= analytics.factors.avgStressOnQuietDays + 0.5
  ) {
    alert = `Stress looks higher on symptom days. Watch whether symptoms ease on lower-stress days before treating the pattern as random.`
  } else {
    alert = `Keep logging daily so the app can better connect symptoms with sleep, stress, hydration, bowel changes, flare days, and other repeating context.`
  }

  return {
    insight: trimNicely(insight, 460),
    alert: trimNicely(alert, 260),
  }
}

function sanitizeOutput(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLen)
}

function trimNicely(text: string, maxLen: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLen) return normalized

  const slice = normalized.slice(0, maxLen)
  const sentenceCut = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '))
  if (sentenceCut >= Math.floor(maxLen * 0.6)) {
    return slice.slice(0, sentenceCut + 1).trim()
  }

  const wordCut = slice.lastIndexOf(' ')
  if (wordCut >= Math.floor(maxLen * 0.6)) {
    return `${slice.slice(0, wordCut).trim()}...`
  }

  return `${slice.trimEnd()}...`
}

function buildFinalInsight({
  insightTitle,
  insight,
  likelyDrivers,
}: {
  insightTitle: string
  insight: string
  likelyDrivers: string[]
}): string {
  const MAX_INSIGHT_LEN = 460
  const titlePrefix = insightTitle ? `${insightTitle}: ` : ''
  const titleBudget = titlePrefix.length
  if (titleBudget >= MAX_INSIGHT_LEN) {
    return trimNicely(titlePrefix, MAX_INSIGHT_LEN)
  }

  const normalizedInsight = trimNicely(insight, MAX_INSIGHT_LEN - titleBudget)
  const finalInsight = `${titlePrefix}${normalizedInsight}`.trim()

  if (likelyDrivers.length === 0) {
    return finalInsight
  }

  const driversText = ` Likely drivers: ${likelyDrivers.join(', ')}.`
  if (finalInsight.length + driversText.length <= MAX_INSIGHT_LEN) {
    return `${finalInsight}${driversText}`
  }

  return finalInsight
}

function buildFinalAlert({
  alert,
  watchNext,
}: {
  alert: string
  watchNext: string
}): string {
  const MAX_ALERT_LEN = 260
  const normalizedAlert = trimNicely(alert, MAX_ALERT_LEN)

  if (!watchNext) {
    return normalizedAlert
  }

  const watchNextText = ` Watch next: ${watchNext}`
  if (normalizedAlert.length + watchNextText.length <= MAX_ALERT_LEN) {
    return `${normalizedAlert}${watchNextText}`
  }

  return normalizedAlert
}

function buildSystemPrompt(windowLabel: string): string {
  return [
    'You are an insight engine for a premium gut-health tracking app.',
    'You analyze food-activity volume, symptom logs, bowel logs, and daily wellness factors to produce highly specific, practical dashboard insights.',
    `The current analysis window is ${windowLabel}.`,
    'Your goals:',
    '1. Detect meaningful repeated patterns.',
    '2. Prioritize worsening or clustered trends over simple summaries.',
    '3. Highlight likely contributors such as sleep, stress, hydration, energy, flare days, period days, bowel changes, and shifts in meal volume.',
    '4. Give practical, evidence-based guidance on what to watch next.',
    '5. Use bowel details like Bristol type, mucus, blood presence, urgency, and note text when they provide meaningful signal.',
    '',
    'Rules:',
    '- Be specific and data-grounded.',
    '- Do not give bland summaries or merely restate counts unless they support a conclusion.',
    '- Do not diagnose or claim medical certainty.',
    '- Do not invent unsupported patterns.',
    '- If evidence is limited, use softer language like "may", "could", or "worth watching".',
    '- Prefer the strongest repeated and actionable pattern.',
    '- Write like a smart premium product insight engine, not a chatbot.',
    '- Do not mention being an AI.',
    '- Do not add generic medical disclaimers.',
    '- Keep `insight` at or under 460 characters.',
    '- Keep `alert` at or under 260 characters.',
    '',
    'If trigger-food exposures are present, mention them directly by food name and timing when relevant.',
    'If recent meals include foods that are generally poor fits for the user condition, mention those even when the user has not manually labeled them as triggers.',
    'If no condition is specified, look for generally less healthy meal patterns and suggest a simple healthier alternative.',
    'When a likely trigger-food exposure appears close to symptom activity, provide a concrete next-step suggestion (for example, reduce or avoid temporarily and monitor 48 to 72 hour response).',
    'If condition or dietary restriction context is provided, incorporate it directly into interpretation and recommendations.',
    'If bowel details or notes show blood, mucus, Bristol pattern shifts, urgency changes, or useful context, factor them into the output explicitly.',
  ].join('\n')
}

function buildUserPrompt(windowLabel: string): string {
  return [
    `Analyze this dashboard data from ${windowLabel} and produce the most useful insight for the user.`,
    '',
    'Choose the strongest finding using this ranking:',
    '1. repeated symptom patterns',
    '2. worsening symptom or bowel trends',
    '3. symptom clustering with lower sleep, higher stress, lower hydration, flare days, or period days',
    '4. overlaps between symptoms and higher bowel activity',
    '5. shifts in meal volume that appear to track with symptoms',
    '',
    'Helpful output should:',
    '- explain what changed',
    '- explain what it may be linked to',
    '- explain why it matters now',
    '- tell the user what to watch next',
    '- keep the insight concise (max 460 chars) and alert concise (max 260 chars)',
    '- use bowel-entry details like Bristol type, blood, mucus, urgency, and note text when they strengthen the conclusion',
    '- consider condition-specific foods that are commonly best limited even if the user never marked them as triggers',
    '- if no condition is set, prefer healthier alternative suggestions when meals skew fried, sugary, highly processed, or more irritating',
    '',
    'Avoid generic lines like "keep tracking patterns" unless the data is too weak for a stronger conclusion.',
    'Use the derived analytics first. Use the raw daily arrays only to confirm the pattern.',
  ].join('\n')
}

export async function generateDashboardInsights(
  payload: DashboardAiPayload
): Promise<DashboardAiResult> {
  if (!hasDashboardInsightInputs(payload)) {
    return DASHBOARD_AI_EMPTY_STATE
  }

  if (!process.env.OPENAI_API_KEY) {
    return fallbackInsight(payload)
  }

  const analytics = buildAnalytics(payload)
  const windowLabel = describeAnalysisWindow(payload.analysisDays)
  const model = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini'

  try {
    const response = await client.responses.create({
      model,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: buildSystemPrompt(windowLabel),
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `${buildUserPrompt(windowLabel)}\n\nDATA:\n${JSON.stringify({
                analysisDays: payload.analysisDays,
                today: analytics.today,
                weekly: analytics.weekly,
                factors: analytics.factors,
                bowelDetails: analytics.bowelDetails,
                profileContext: analytics.profileContext,
                triggerFoods: analytics.triggerFoods,
                triggerMeals: analytics.triggerMeals,
                conditionFoodFlags: analytics.conditionFoodFlags,
                genericFoodFlags: analytics.genericFoodFlags,
                patternHints: analytics.patternHints,
                raw: analytics.raw,
              })}`,
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'dashboard_ai_result',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              insight_title: {
                type: 'string',
                description: 'Short title for the strongest pattern. Max 70 characters.',
              },
              insight: {
                type: 'string',
                description:
                  'Main dashboard insight. Explain the strongest pattern, what it may be linked to, and why it matters now. Max 460 characters.',
              },
              alert: {
                type: 'string',
                description:
                  'Most actionable thing the user should pay attention to next. Max 260 characters.',
              },
              likely_drivers: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description:
                  '1 to 3 concise likely drivers or pattern clues taken from the data.',
              },
              watch_next: {
                type: 'string',
                description:
                  'A short note about what the user should monitor over the next 2 to 3 days. Max 140 characters.',
              },
              confidence: {
                type: 'string',
                enum: ['low', 'medium', 'high'],
                description: 'Confidence based on how repeated and supported the pattern is.',
              },
            },
            required: [
              'insight_title',
              'insight',
              'alert',
              'likely_drivers',
              'watch_next',
              'confidence',
            ],
          },
        },
      },
    })

    const text = response.output_text
    if (!text) {
      return fallbackInsight(payload)
    }

    let parsed: DashboardAiStructured | null = null

    try {
      parsed = JSON.parse(text) as DashboardAiStructured
    } catch {
      return fallbackInsight(payload)
    }

    const insightTitle = sanitizeOutput(parsed.insight_title, 70)
    const insight = sanitizeOutput(parsed.insight, 460)
    const alert = sanitizeOutput(parsed.alert, 260)
    const watchNext = sanitizeOutput(parsed.watch_next, 140)
    const likelyDrivers = Array.isArray(parsed.likely_drivers)
      ? parsed.likely_drivers.map((item) => sanitizeOutput(item, 80)).filter(Boolean).slice(0, 3)
      : []

    if (!insight || !alert) {
      return fallbackInsight(payload)
    }

    const finalInsight = buildFinalInsight({
      insightTitle,
      insight,
      likelyDrivers,
    })
    const finalAlert = buildFinalAlert({
      alert,
      watchNext,
    })

    if (!finalInsight || !finalAlert) {
      return fallbackInsight(payload)
    }

    return {
      insight: finalInsight,
      alert: finalAlert,
    }
  } catch (error) {
    console.error('generateDashboardInsights failed:', error)
    return fallbackInsight(payload)
  }
}
