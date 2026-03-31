import 'server-only'
import OpenAI from 'openai'

export type SupportMealPlanContext = {
  today: string
  conditionName: string | null
  dietaryRestriction: string | null
  safeFoods: string[]
  triggerFoods: string[]
  isPeriodDay: boolean
}

export type SupportMealPlanResult = {
  title: string
  summary: string
  meals: Array<{
    name: string
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
    whyItFits: string
  }>
  focusPoints: string[]
}

type SupportMealPlanStructured = {
  title: string
  summary: string
  meals: Array<{
    name: string
    meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
    why_it_fits: string
  }>
  focus_points: string[]
}

type ConditionMealProfile = {
  supportiveFoods: string[]
  mealPatterns: {
    breakfast: string[]
    lunch: string[]
    dinner: string[]
    snack: string[]
  }
  focusPoints: string[]
}

const PERIOD_SUPPORT_PROFILE: ConditionMealProfile = {
  supportiveFoods: [
    'lean beef',
    'turkey',
    'salmon',
    'sardines',
    'lentils',
    'tofu',
    'eggs',
    'spinach',
    'pumpkin seeds',
    'oats',
    'sweet potato',
    'berries',
    'oranges',
    'kiwi',
    'yogurt',
  ],
  mealPatterns: {
    breakfast: [
      'iron-support oatmeal with berries and pumpkin seeds',
      'eggs with sauteed spinach and toast',
      'yogurt bowl with oats, berries, and chia',
    ],
    lunch: [
      'salmon grain bowl with spinach and roasted sweet potato',
      'turkey and lentil soup with cooked vegetables',
      'tofu rice bowl with spinach and citrus fruit',
    ],
    dinner: [
      'baked salmon with potatoes and greens',
      'turkey rice plate with cooked spinach',
      'tofu and quinoa bowl with roasted vegetables',
    ],
    snack: [
      'trail mix with pumpkin seeds and dried fruit',
      'yogurt with berries',
      'banana with nut butter',
    ],
  },
  focusPoints: [
    'Lean toward iron-rich meals and pair them with vitamin C foods when that fits your usual tolerance.',
    'Keep hydration steady and include enough protein so energy stays more stable through the day.',
    'If cramps or nausea make food harder, use smaller gentler meals instead of skipping entirely.',
  ],
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const DEFAULT_PROFILE: ConditionMealProfile = {
  supportiveFoods: [
    'eggs',
    'salmon',
    'chicken',
    'tofu',
    'oats',
    'rice',
    'quinoa',
    'cooked carrots',
    'zucchini',
    'bananas',
    'berries',
    'olive oil',
    'sweet potato',
  ],
  mealPatterns: {
    breakfast: [
      'oatmeal bowl with fruit and seeds',
      'eggs with toast and cooked vegetables',
      'yogurt bowl with berries and oats',
    ],
    lunch: [
      'grain bowl with lean protein and cooked vegetables',
      'simple soup with a side of toast or rice',
      'rice bowl with tofu or chicken and softer vegetables',
    ],
    dinner: [
      'baked fish with rice and cooked vegetables',
      'roasted chicken with potatoes and greens',
      'simple pasta or rice dish with lean protein',
    ],
    snack: [
      'banana with nut butter',
      'yogurt or dairy-free yogurt with berries',
      'crackers with a tolerated protein',
    ],
  },
  focusPoints: [
    'Keep meals balanced with protein, tolerated carbs, and gentler vegetables.',
    'Prefer simple cooking methods like baked, grilled, steamed, or lightly sauteed.',
    'Use your food log to keep building around what feels safest for you.',
  ],
}

const CONDITION_PROFILES: Record<string, ConditionMealProfile> = {
  crohns: {
    supportiveFoods: ['white rice', 'eggs', 'salmon', 'chicken', 'turkey', 'potatoes', 'oatmeal', 'cooked carrots', 'zucchini', 'banana', 'sourdough'],
    mealPatterns: {
      breakfast: ['scrambled eggs with sourdough toast', 'oatmeal with banana and peanut butter', 'lactose-free yogurt with oats and banana'],
      lunch: ['chicken and rice bowl with cooked carrots', 'turkey soup with soft vegetables', 'tuna and potato plate with peeled cucumber'],
      dinner: ['baked salmon with white rice and carrots', 'roasted chicken with mashed potatoes', 'ground turkey pasta with mild seasoning'],
      snack: ['banana with peanut butter', 'rice cakes with turkey', 'applesauce with tolerated yogurt'],
    },
    focusPoints: [
      'Lean on softer, lower-residue meals when your gut feels more reactive.',
      'Keep protein steady to support recovery and energy.',
      'Prefer cooked or peeled produce if raw foods have been harder to tolerate.',
    ],
  },
  ulcerative_colitis: {
    supportiveFoods: ['turkey', 'chicken', 'rice', 'oats', 'banana', 'potatoes', 'eggs', 'cod', 'zucchini', 'green beans', 'lactose-free yogurt'],
    mealPatterns: {
      breakfast: ['oatmeal with banana', 'eggs with toast', 'lactose-free yogurt bowl with berries'],
      lunch: ['turkey and rice bowl with zucchini', 'chicken noodle soup', 'egg salad with potatoes'],
      dinner: ['baked cod with mashed potatoes and green beans', 'grilled chicken with rice and carrots', 'turkey pasta bowl with mild herbs'],
      snack: ['banana', 'toast with peanut butter', 'lactose-free yogurt and berries'],
    },
    focusPoints: [
      'Smaller, simpler meals can be easier to tolerate during more active symptom days.',
      'Favor milder flavors over greasy or highly spicy options.',
      'Use the daily plan as a baseline and adjust fiber level to your current tolerance.',
    ],
  },
  ibs: {
    supportiveFoods: ['rice', 'quinoa', 'eggs', 'chicken', 'tofu', 'lactose-free yogurt', 'berries', 'banana', 'oats', 'spinach', 'carrots', 'zucchini', 'ginger'],
    mealPatterns: {
      breakfast: ['overnight oats with berries', 'eggs with sourdough toast', 'lactose-free yogurt with chia and fruit'],
      lunch: ['grilled chicken quinoa bowl with carrots', 'rice noodle bowl with tofu and spinach', 'turkey rice bowl with cucumber'],
      dinner: ['baked salmon with quinoa and roasted carrots', 'chicken rice stir-fry with zucchini', 'tofu rice bowl with ginger and spinach'],
      snack: ['rice cakes with peanut butter', 'berries with yogurt', 'banana and walnuts'],
    },
    focusPoints: [
      'Build around lower-trigger, simpler combinations and change one thing at a time.',
      'Favor garlic-infused oil, chives, and milder seasonings when onion or garlic are tricky.',
      'Consistent meal timing helps make symptom patterns easier to read.',
    ],
  },
  celiac: {
    supportiveFoods: ['gluten-free oats', 'rice', 'quinoa', 'potatoes', 'chicken', 'salmon', 'eggs', 'corn tortillas', 'spinach', 'berries', 'sweet potato'],
    mealPatterns: {
      breakfast: ['gluten-free oats with berries and seeds', 'eggs with gluten-free toast', 'yogurt bowl with fruit and gluten-free granola'],
      lunch: ['chicken quinoa bowl with spinach', 'corn tortilla fish tacos', 'rice bowl with eggs and greens'],
      dinner: ['salmon with sweet potato and greens', 'chicken rice bowl with cooked vegetables', 'gluten-free pasta with turkey and spinach'],
      snack: ['fruit with nuts', 'gluten-free crackers with hummus', 'yogurt with berries'],
    },
    focusPoints: [
      'Every meal suggestion should stay strictly gluten-free, including sauces and packaged sides.',
      'Use certified gluten-free staples to reduce hidden exposure.',
      'Keep meals balanced so gluten avoidance does not turn into under-eating or repetitive eating.',
    ],
  },
  lactose: {
    supportiveFoods: ['lactose-free yogurt', 'lactose-free milk', 'eggs', 'chicken', 'tofu', 'rice', 'oats', 'berries', 'banana', 'potatoes', 'nuts'],
    mealPatterns: {
      breakfast: ['lactose-free yogurt parfait', 'oatmeal with berries', 'eggs with toast and fruit'],
      lunch: ['turkey wrap with lactose-free cheese', 'rice bowl with tofu and vegetables', 'chicken salad bowl'],
      dinner: ['stir-fry with tofu and rice', 'baked chicken with potatoes', 'salmon bowl with quinoa and greens'],
      snack: ['dairy-free yogurt cup', 'banana with nuts', 'crackers with turkey'],
    },
    focusPoints: [
      'Use lactose-free or dairy-free swaps when that keeps meals easier to tolerate.',
      'Keep protein and calcium intake in mind while reducing regular dairy.',
      'Simple meals make it easier to see whether dairy reduction is helping.',
    ],
  },
  gerd: {
    supportiveFoods: ['oats', 'banana', 'chicken', 'turkey', 'rice', 'sweet potato', 'green beans', 'broccoli', 'almond butter', 'whole grain toast'],
    mealPatterns: {
      breakfast: ['overnight oats with banana', 'toast with almond butter and fruit', 'eggs with oatmeal'],
      lunch: ['turkey and rice bowl', 'grilled chicken wrap with mild fillings', 'baked potato with chicken and greens'],
      dinner: ['baked chicken with rice and broccoli', 'salmon with sweet potato and greens', 'turkey bowl with quinoa and vegetables'],
      snack: ['banana', 'oat bites', 'whole grain crackers with turkey'],
    },
    focusPoints: [
      'Keep meals lighter and lower in fat to reduce reflux load.',
      'Milder seasoning is usually a better default than spicy or acidic additions.',
      'Aim for steadier portions rather than very large meals.',
    ],
  },
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().trim()
}

function sanitizeText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLen)
}

function inferConditionKey(conditionName: string | null, dietaryRestriction: string | null): string | null {
  const condition = normalize(conditionName)
  const restriction = normalize(dietaryRestriction)

  if (condition.includes('crohn')) return 'crohns'
  if (condition.includes('ulcerative') || condition.includes('colitis')) return 'ulcerative_colitis'
  if (condition.includes('ibs') || condition.includes('irritable bowel') || restriction.includes('fodmap')) return 'ibs'
  if (condition.includes('celiac') || restriction.includes('gluten')) return 'celiac'
  if (condition.includes('lactose') || restriction.includes('lactose') || restriction.includes('dairy')) return 'lactose'
  if (condition.includes('gerd') || condition.includes('reflux') || restriction.includes('reflux')) return 'gerd'

  return null
}

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

function rotatePick<T>(items: T[], seed: number, count: number): T[] {
  if (items.length === 0) return []
  const start = seed % items.length
  const rotated = [...items.slice(start), ...items.slice(0, start)]
  return rotated.slice(0, Math.min(count, rotated.length))
}

function uniqueFoods(values: string[]): string[] {
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))]
}

function filterTriggersFromList(values: string[], triggerFoods: string[]): string[] {
  const normalizedTriggers = uniqueFoods(triggerFoods).map((item) => item.toLowerCase())
  if (normalizedTriggers.length === 0) return values

  return values.filter((value) => {
    const normalizedValue = value.toLowerCase()
    return !normalizedTriggers.some((trigger) => trigger && normalizedValue.includes(trigger))
  })
}

function mergeProfiles(base: ConditionMealProfile, addition: ConditionMealProfile): ConditionMealProfile {
  return {
    supportiveFoods: uniqueFoods([...base.supportiveFoods, ...addition.supportiveFoods]),
    mealPatterns: {
      breakfast: [...base.mealPatterns.breakfast, ...addition.mealPatterns.breakfast],
      lunch: [...base.mealPatterns.lunch, ...addition.mealPatterns.lunch],
      dinner: [...base.mealPatterns.dinner, ...addition.mealPatterns.dinner],
      snack: [...base.mealPatterns.snack, ...addition.mealPatterns.snack],
    },
    focusPoints: [...base.focusPoints, ...addition.focusPoints],
  }
}

function pickMealPattern(items: string[], fallbackItems: string[], seed: number): string {
  const source = items.length > 0 ? items : fallbackItems
  return source[seed % source.length]
}

function buildFocusPoints(profile: ConditionMealProfile, isPeriodDay: boolean): string[] {
  if (!isPeriodDay) return profile.focusPoints.slice(0, 3)

  const periodFirst = [
    ...PERIOD_SUPPORT_PROFILE.focusPoints,
    ...profile.focusPoints.filter((item) => !PERIOD_SUPPORT_PROFILE.focusPoints.includes(item)),
  ]

  return periodFirst.slice(0, 3)
}

function buildFallbackMealPlan(context: SupportMealPlanContext): SupportMealPlanResult {
  const conditionKey = inferConditionKey(context.conditionName, context.dietaryRestriction)
  const baseProfile = (conditionKey && CONDITION_PROFILES[conditionKey]) || DEFAULT_PROFILE
  const profile = context.isPeriodDay ? mergeProfiles(baseProfile, PERIOD_SUPPORT_PROFILE) : baseProfile
  const safeFoods = uniqueFoods(context.safeFoods)
  const triggerFoods = uniqueFoods(context.triggerFoods)
  const filteredMealPatterns = {
    breakfast: filterTriggersFromList(profile.mealPatterns.breakfast, triggerFoods),
    lunch: filterTriggersFromList(profile.mealPatterns.lunch, triggerFoods),
    dinner: filterTriggersFromList(profile.mealPatterns.dinner, triggerFoods),
    snack: filterTriggersFromList(profile.mealPatterns.snack, triggerFoods),
  }
  const filteredSupportiveFoods = filterTriggersFromList(profile.supportiveFoods, triggerFoods)
  const safeFoodsWithoutTriggers = filterTriggersFromList(safeFoods, triggerFoods)
  const seed = hashString(
    `${context.today}:${conditionKey ?? 'default'}:${context.isPeriodDay ? 'period' : 'standard'}:${safeFoodsWithoutTriggers.join('|')}:${triggerFoods.join('|')}`
  )

  const safeFoodHighlights = rotatePick(safeFoodsWithoutTriggers, seed, 4)
  const breakfastBase = pickMealPattern(filteredMealPatterns.breakfast, profile.mealPatterns.breakfast, seed)
  const lunchBase = pickMealPattern(filteredMealPatterns.lunch, profile.mealPatterns.lunch, seed + 1)
  const dinnerBase = pickMealPattern(filteredMealPatterns.dinner, profile.mealPatterns.dinner, seed + 2)
  const snackBase = pickMealPattern(filteredMealPatterns.snack, profile.mealPatterns.snack, seed + 3)

  const supportiveFoods = rotatePick(filteredSupportiveFoods.length > 0 ? filteredSupportiveFoods : profile.supportiveFoods, seed + 5, 5)
  const titleCondition = context.conditionName?.trim() || 'your current needs'
  const safeFoodText =
    safeFoodHighlights.length > 0
      ? ` Built around foods you have logged as safe, like ${safeFoodHighlights.join(', ')}.`
      : ''
  const triggerFoodText =
    triggerFoods.length > 0
      ? ` It also avoids foods you have marked as triggers, like ${triggerFoods.slice(0, 3).join(', ')}.`
      : ''
  const periodText = context.isPeriodDay
    ? ' Today also leans toward meals that can help replenish iron, fluids, and steady energy during your period.'
    : ''

  return {
    title: context.isPeriodDay ? `Period-support meal plan for ${titleCondition}` : `Daily meal plan for ${titleCondition}`,
    summary: `A fresh daily plan using gentler, condition-aware meals with enough structure for both symptom support and general nutrition.${periodText}${safeFoodText}${triggerFoodText}`,
    meals: [
      {
        mealType: 'breakfast',
        name: breakfastBase,
        whyItFits: safeFoodHighlights[0]
          ? `Uses a familiar safe-food direction and keeps breakfast simple around ${safeFoodHighlights[0]}${context.isPeriodDay ? ' while adding period-supportive nutrition.' : '.'}`
          : `Keeps breakfast simple and based on generally supportive foods like ${supportiveFoods.slice(0, 2).join(' and ')}${context.isPeriodDay ? ' to help support energy and replenishment.' : '.'}`,
      },
      {
        mealType: 'lunch',
        name: lunchBase,
        whyItFits: safeFoodHighlights[1]
          ? `Leans on your logged tolerances while keeping lunch balanced and easier to repeat consistently${context.isPeriodDay ? ' on a period day' : ''}.`
          : `Balances protein, tolerated carbs, and gentler ingredients for a steadier midday meal${context.isPeriodDay ? ' with extra attention to replenishment-friendly foods' : ''}.`,
      },
      {
        mealType: 'dinner',
        name: dinnerBase,
        whyItFits: safeFoodHighlights[2]
          ? `Keeps dinner grounded in foods similar to what you already tolerate well${context.isPeriodDay ? ' while nudging toward iron- and protein-supportive choices' : ''}.`
          : `Uses milder, condition-aware dinner staples that are often easier to build around${context.isPeriodDay ? ' while supporting recovery from the day' : ''}.`,
      },
      {
        mealType: 'snack',
        name: snackBase,
        whyItFits: safeFoodHighlights[3]
          ? `Adds a simple snack option so you can stay consistent without reaching for a less predictable choice${context.isPeriodDay ? ' when appetite or energy shifts' : ''}.`
          : `Gives you a lighter snack option that fits the same daily pattern${context.isPeriodDay ? ' and helps avoid long gaps without food' : ''}.`,
      },
    ],
    focusPoints: buildFocusPoints(profile, context.isPeriodDay),
  }
}

function buildSystemPrompt(): string {
  return [
    'You generate premium daily meal plans for a gut-health tracking app.',
    'Your output must be practical, food-first, and personalized.',
    'Use the user condition, dietary restriction, and foods they have logged as safe.',
    'Favor meals that are realistic for one day: breakfast, lunch, dinner, and snack.',
    'Use safe foods when they fit naturally, but do not repeat the same exact ingredient in every meal.',
    'Avoid foods the user has logged as trigger foods.',
    'Blend personal safe foods with generally supportive foods for the condition.',
    'If the user is on their period, tilt toward foods that can help replenish iron, fluids, protein, magnesium, and steady energy while staying practical and condition-aware.',
    'Avoid foods that are commonly poor fits for the condition unless the user explicitly marked them safe and the meal still makes sense.',
    'Do not mention being an AI.',
    'Do not diagnose or claim certainty.',
    'Keep the language concise, useful, and product-like.',
  ].join('\n')
}

function buildUserPrompt(context: SupportMealPlanContext): string {
  return [
    `Create a fresh meal plan for ${context.today}.`,
    'Goal:',
    '- Give the user a full day of meal options that can help them stay inside one app for both condition support and nutrition planning.',
    '- Make the plan feel fresh day to day, not static or templated.',
    '- Personalize using safe foods where possible.',
    '- Avoid the user\'s trigger foods.',
    '- If they logged that they are on their period today, prioritize generally supportive period-day foods while still respecting their condition and known food tolerances.',
    '',
    'Requirements:',
    '- Return exactly 4 meals: breakfast, lunch, dinner, and snack.',
    '- Each meal should be a clear, appetizing option, not just ingredient fragments.',
    '- Each meal needs a short explanation of why it fits this user.',
    '- Include 3 focus points for how to use the plan well today.',
    '- Keep the summary short.',
    '',
    `Condition: ${context.conditionName ?? 'None specified'}`,
    `Dietary restriction: ${context.dietaryRestriction ?? 'None specified'}`,
    `Period day today: ${context.isPeriodDay ? 'Yes' : 'No'}`,
    `Safe foods logged by user: ${context.safeFoods.length > 0 ? context.safeFoods.join(', ') : 'None logged yet'}`,
    `Trigger foods logged by user: ${context.triggerFoods.length > 0 ? context.triggerFoods.join(', ') : 'None logged yet'}`,
  ].join('\n')
}

export async function generateSupportMealPlan(
  context: SupportMealPlanContext
): Promise<SupportMealPlanResult> {
  if (!process.env.OPENAI_API_KEY) {
    return buildFallbackMealPlan(context)
  }

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: buildSystemPrompt() }],
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: buildUserPrompt(context) }],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'support_meal_plan',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              title: { type: 'string' },
              summary: { type: 'string' },
              meals: {
                type: 'array',
                minItems: 4,
                maxItems: 4,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    name: { type: 'string' },
                    meal_type: {
                      type: 'string',
                      enum: ['breakfast', 'lunch', 'dinner', 'snack'],
                    },
                    why_it_fits: { type: 'string' },
                  },
                  required: ['name', 'meal_type', 'why_it_fits'],
                },
              },
              focus_points: {
                type: 'array',
                minItems: 3,
                maxItems: 3,
                items: { type: 'string' },
              },
            },
            required: ['title', 'summary', 'meals', 'focus_points'],
          },
        },
      },
    })

    const text = response.output_text
    if (!text) {
      return buildFallbackMealPlan(context)
    }

    const parsed = JSON.parse(text) as SupportMealPlanStructured
    const meals = Array.isArray(parsed.meals)
      ? parsed.meals
          .map((meal) => ({
            name: sanitizeText(meal.name, 120),
            mealType: meal.meal_type,
            whyItFits: sanitizeText(meal.why_it_fits, 200),
          }))
          .filter((meal) => meal.name && meal.whyItFits)
      : []

    const focusPoints = Array.isArray(parsed.focus_points)
      ? parsed.focus_points.map((item) => sanitizeText(item, 140)).filter(Boolean).slice(0, 3)
      : []

    if (meals.length !== 4 || focusPoints.length === 0) {
      return buildFallbackMealPlan(context)
    }

    return {
      title: sanitizeText(parsed.title, 100) || 'Daily meal plan',
      summary: sanitizeText(parsed.summary, 240) || 'A fresh condition-aware meal plan for today.',
      meals,
      focusPoints,
    }
  } catch (error) {
    console.error('generateSupportMealPlan failed:', error)
    return buildFallbackMealPlan(context)
  }
}
