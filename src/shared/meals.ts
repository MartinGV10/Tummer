export type MealItem = {
  id: string
  meal_id: string
  user_id: string
  position: number
  food_name: string
  brand_name: string | null
  serving_description: string | null
  quantity: number
  unit: string | null
  fdc_id: number | null
  data_type: string | null
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  sugar_g: number
  sodium_mg: number
  created_at: string
  updated_at: string
}

export type MealItemInput = {
  position?: number
  food_name: string
  brand_name?: string | null
  serving_description?: string | null
  quantity?: number
  unit?: string | null
  fdc_id?: number | null
  data_type?: string | null
  calories?: number
  protein_g?: number
  carbs_g?: number
  fat_g?: number
  fiber_g?: number
  sugar_g?: number
  sodium_mg?: number
}

export type MealMacroTotals = {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  sugar_g: number
  sodium_mg: number
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

export function normalizeMealItemInput(item: MealItemInput, index = 0): Required<MealItemInput> {
  return {
    position: Number.isInteger(item.position) ? Number(item.position) : index,
    food_name: item.food_name.trim(),
    brand_name: item.brand_name?.trim() || null,
    serving_description: item.serving_description?.trim() || null,
    quantity: Math.max(0.01, toFiniteNumber(item.quantity, 1)),
    unit: item.unit?.trim() || null,
    fdc_id: item.fdc_id == null ? null : Math.trunc(toFiniteNumber(item.fdc_id)),
    data_type: item.data_type?.trim() || null,
    calories: toFiniteNumber(item.calories, 0),
    protein_g: toFiniteNumber(item.protein_g, 0),
    carbs_g: toFiniteNumber(item.carbs_g, 0),
    fat_g: toFiniteNumber(item.fat_g, 0),
    fiber_g: toFiniteNumber(item.fiber_g, 0),
    sugar_g: toFiniteNumber(item.sugar_g, 0),
    sodium_mg: toFiniteNumber(item.sodium_mg, 0),
  }
}

export function sumMealMacros(items: Array<Pick<MealItemInput, 'calories' | 'protein_g' | 'carbs_g' | 'fat_g' | 'fiber_g' | 'sugar_g' | 'sodium_mg'>>): MealMacroTotals {
  return items.reduce<MealMacroTotals>(
    (totals, item) => ({
      calories: totals.calories + toFiniteNumber(item.calories, 0),
      protein_g: totals.protein_g + toFiniteNumber(item.protein_g, 0),
      carbs_g: totals.carbs_g + toFiniteNumber(item.carbs_g, 0),
      fat_g: totals.fat_g + toFiniteNumber(item.fat_g, 0),
      fiber_g: totals.fiber_g + toFiniteNumber(item.fiber_g, 0),
      sugar_g: totals.sugar_g + toFiniteNumber(item.sugar_g, 0),
      sodium_mg: totals.sodium_mg + toFiniteNumber(item.sodium_mg, 0),
    }),
    {
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 0,
    }
  )
}

export function buildMealName(mealName: string | null | undefined, items: Array<Pick<MealItemInput, 'food_name'>>): string {
  const explicitName = mealName?.trim()
  if (explicitName) return explicitName

  const names = items
    .map((item) => item.food_name.trim())
    .filter(Boolean)

  if (names.length === 0) return 'Untitled meal'
  if (names.length <= 3) return names.join(', ')
  return `${names.slice(0, 3).join(', ')} +${names.length - 3} more`
}

export function getMealSearchText(mealName: string, items: Array<Pick<MealItemInput, 'food_name'>>): string {
  const values = [mealName.trim(), ...items.map((item) => item.food_name.trim()).filter(Boolean)]
  return values.filter(Boolean).join(' ')
}

export function formatMacroValue(value: number, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value)
}
