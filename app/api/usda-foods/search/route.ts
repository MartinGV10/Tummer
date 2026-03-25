import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type UsdaSearchApiFood = {
  fdcId?: number
  description?: string
  brandName?: string
  servingSize?: number
  servingSizeUnit?: string
  householdServingFullText?: string
  dataType?: string
  foodNutrients?: Array<{
    nutrientId?: number
    nutrientName?: string
    value?: number
  }>
}

type UsdaSearchResponse = {
  foods?: UsdaSearchApiFood[]
}

type CachedResult = {
  expiresAt: number
  data: unknown
}

const CACHE_TTL_MS = 10 * 60_000
const cache = new Map<string, CachedResult>()

function getApiKey(): string | null {
  return process.env.USDA_FOODDATA_CENTRAL_API_KEY || process.env.FOODDATA_CENTRAL_API_KEY || process.env.USDA_API_KEY || null
}

function getNutrientValue(food: UsdaSearchApiFood, nutrientIds: number[], nameIncludes: string[]): number {
  const nutrients = food.foodNutrients ?? []
  const match = nutrients.find((nutrient) => {
    if (typeof nutrient.nutrientId === 'number' && nutrientIds.includes(nutrient.nutrientId)) return true
    const name = nutrient.nutrientName?.toLowerCase() ?? ''
    return nameIncludes.some((token) => name.includes(token))
  })

  return typeof match?.value === 'number' && Number.isFinite(match.value) ? match.value : 0
}

function buildServingDescription(food: UsdaSearchApiFood): string | null {
  const household = food.householdServingFullText?.trim()
  if (household) return household

  if (typeof food.servingSize === 'number' && Number.isFinite(food.servingSize)) {
    const unit = food.servingSizeUnit?.trim()
    return `${food.servingSize}${unit ? ` ${unit}` : ''}`.trim()
  }

  return null
}

export async function GET(req: NextRequest) {
  const apiKey = getApiKey()
  if (!apiKey) {
    return NextResponse.json({ error: 'USDA FoodData Central API key is missing on the server.' }, { status: 500 })
  }

  const query = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const pageSize = Math.min(10, Math.max(1, Number(req.nextUrl.searchParams.get('pageSize') ?? '8') || 8))

  if (query.length < 2) {
    return NextResponse.json({ foods: [] })
  }

  const cacheKey = `${query.toLowerCase()}::${pageSize}`
  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data)
  }

  const upstream = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      pageSize,
    }),
    cache: 'no-store',
  })

  if (!upstream.ok) {
    return NextResponse.json({ error: 'USDA search failed. Please try again.' }, { status: upstream.status })
  }

  const data = (await upstream.json()) as UsdaSearchResponse
  const foods = (data.foods ?? []).map((food) => ({
    fdcId: food.fdcId ?? null,
    description: food.description?.trim() || 'Unnamed food',
    brandName: food.brandName?.trim() || null,
    servingDescription: buildServingDescription(food),
    dataType: food.dataType?.trim() || null,
    calories: getNutrientValue(food, [1008], ['energy']),
    protein: getNutrientValue(food, [1003], ['protein']),
    carbs: getNutrientValue(food, [1005], ['carbohydrate']),
    fat: getNutrientValue(food, [1004], ['total lipid', 'total fat']),
    fiber: getNutrientValue(food, [1079], ['fiber']),
    sugar: getNutrientValue(food, [2000], ['sugar']),
    sodium: getNutrientValue(food, [1093], ['sodium']),
  }))

  const payload = { foods }
  cache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    data: payload,
  })

  return NextResponse.json(payload)
}
