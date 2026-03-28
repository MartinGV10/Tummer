import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedBillingUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { generateSupportMealPlan } from '@/src/server/ai/supportMealPlan'

export const dynamic = 'force-dynamic'

type CachedMealPlan = {
  expiresAt: number
  data: Awaited<ReturnType<typeof generateSupportMealPlan>>
}

const cacheMap = new Map<string, CachedMealPlan>()
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

function normalizeDateParam(value: string | null): string | null {
  if (!value) return null
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

function normalizeProfileValue(value: string | null | undefined): string | null {
  const cleaned = (value ?? '').trim()
  if (!cleaned) return null
  const lower = cleaned.toLowerCase()
  if (['none', 'no condition', 'no conditions', 'n/a', 'na'].includes(lower)) return null
  return cleaned
}

export async function GET(req: NextRequest) {
  const authResult = await getAuthenticatedBillingUser(req)

  if ('response' in authResult) {
    return authResult.response
  }

  if (!authResult.profile.is_premium) {
    return NextResponse.json({ error: 'Premium subscription required' }, { status: 403 })
  }

  const today = normalizeDateParam(req.nextUrl.searchParams.get('date')) ?? new Date().toISOString().slice(0, 10)

  const [profileRes, safeFoodsRes] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('condition_id, reason')
      .eq('id', authResult.userId)
      .maybeSingle<{ condition_id: string | null; reason: string | null }>(),
    supabaseAdmin
      .from('user_foods')
      .select('name')
      .eq('user_id', authResult.userId)
      .eq('status', 'safe'),
  ])

  if (profileRes.error) {
    return NextResponse.json({ error: 'Unable to load meal-plan context' }, { status: 500 })
  }

  if (safeFoodsRes.error) {
    return NextResponse.json({ error: 'Unable to load safe foods for meal planning' }, { status: 500 })
  }

  let conditionName: string | null = null
  if (profileRes.data?.condition_id) {
    const conditionRes = await supabaseAdmin
      .from('conditions')
      .select('name')
      .eq('id', profileRes.data.condition_id)
      .maybeSingle<{ name: string | null }>()

    if (!conditionRes.error) {
      conditionName = normalizeProfileValue(conditionRes.data?.name ?? null)
    }
  }

  const safeFoods = (safeFoodsRes.data ?? [])
    .map((row) => (typeof row.name === 'string' ? row.name.trim() : ''))
    .filter(Boolean)
  const dietaryRestriction = normalizeProfileValue(profileRes.data?.reason ?? null)
  const cacheKey = `${authResult.userId}:${today}:${conditionName ?? 'none'}:${dietaryRestriction ?? 'none'}:${safeFoods.join('|')}`
  const cached = cacheMap.get(cacheKey)

  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data)
  }

  try {
    const result = await generateSupportMealPlan({
      today,
      conditionName,
      dietaryRestriction,
      safeFoods,
    })

    cacheMap.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      data: result,
    })

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Unable to generate meal plan' }, { status: 500 })
  }
}
