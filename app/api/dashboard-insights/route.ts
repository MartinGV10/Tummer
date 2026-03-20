import { NextRequest, NextResponse } from 'next/server'
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

  if (!hasDashboardInsightInputs(body)) {
    return NextResponse.json(DASHBOARD_AI_EMPTY_STATE)
  }

  const payloadKey = JSON.stringify(body)
  const cached = cacheMap.get(payloadKey)
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data)
  }

  try {
    const result = await generateDashboardInsights(body)
    cacheMap.set(payloadKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      data: result,
    })
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ insight: 'Could not generate insight right now.', alert: 'Could not generate alert right now.' })
  }
}
