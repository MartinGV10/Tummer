import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedBillingUser } from '@/lib/auth'
import {
  generateDashboardInsights,
  type DashboardAiPayload,
} from '@/src/server/ai/dashboardInsights'
import { DASHBOARD_AI_EMPTY_STATE, hasDashboardInsightInputs } from '@/src/shared/dashboardAi'

export const dynamic = 'force-dynamic'

type RateState = {
  windowStart: number
  count: number
}

type CachedInsight = {
  expiresAt: number
  data: { insight: string; alert: string }
}

const RATE_WINDOW_MS = 60_000
const RATE_MAX_PER_WINDOW = 12
const CACHE_TTL_MS = 15 * 60_000
const rateMap = new Map<string, RateState>()
const cacheMap = new Map<string, CachedInsight>()

function clampSeries<T>(series: T[] | undefined, maxItems: number): T[] {
  return Array.isArray(series) ? series.slice(-maxItems) : []
}

function clampDashboardAiPayload(
  payload: DashboardAiPayload,
  analysisDays: number,
): DashboardAiPayload {
  return {
    ...payload,
    analysisDays,
    weeklyMeals: clampSeries(payload.weeklyMeals, analysisDays),
    weeklyBowels: clampSeries(payload.weeklyBowels, analysisDays),
    weeklyBowelDetails: clampSeries(payload.weeklyBowelDetails, analysisDays),
    weeklySymptoms: clampSeries(payload.weeklySymptoms, analysisDays),
    weeklySymptomDetails: clampSeries(payload.weeklySymptomDetails, analysisDays),
    weeklyFactors: clampSeries(payload.weeklyFactors, analysisDays),
    weeklyDailyNotes: clampSeries(payload.weeklyDailyNotes, analysisDays),
    weeklyTriggerMeals: clampSeries(payload.weeklyTriggerMeals, analysisDays * 10),
    weeklyMealEntries: clampSeries(payload.weeklyMealEntries, analysisDays * 12),
  }
}

function getClientKey(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || req.headers.get('x-real-ip') || 'unknown'
}

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const existing = rateMap.get(key)
  if (!existing) {
    rateMap.set(key, { windowStart: now, count: 1 })
    return false
  }

  if (now - existing.windowStart > RATE_WINDOW_MS) {
    rateMap.set(key, { windowStart: now, count: 1 })
    return false
  }

  existing.count += 1
  rateMap.set(key, existing)
  return existing.count > RATE_MAX_PER_WINDOW
}

export async function POST(req: NextRequest) {
  const authResult = await getAuthenticatedBillingUser(req)

  if ('response' in authResult) {
    return authResult.response
  }

  const clientKey = getClientKey(req)
  if (isRateLimited(clientKey)) {
    return NextResponse.json({ error: 'Too many insight requests. Please wait a minute and retry.' }, { status: 429 })
  }

  let body: DashboardAiPayload
  try {
    body = (await req.json()) as DashboardAiPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body || !Array.isArray(body.weeklyMeals) || !Array.isArray(body.weeklyBowels) || !Array.isArray(body.weeklySymptoms)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const analysisDays = authResult.profile.is_premium ? 14 : 7
  const gatedBody = clampDashboardAiPayload(body, analysisDays)

  if (!hasDashboardInsightInputs(gatedBody)) {
    return NextResponse.json(DASHBOARD_AI_EMPTY_STATE)
  }

  const payloadKey = JSON.stringify({
    userId: authResult.userId,
    isPremium: authResult.profile.is_premium,
    payload: gatedBody,
  })
  const cached = cacheMap.get(payloadKey)
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data)
  }

  try {
    const result = await generateDashboardInsights(gatedBody)
    cacheMap.set(payloadKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      data: result,
    })
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ insight: 'Could not generate insight right now.', alert: 'Could not generate alert right now.' })
  }
}
