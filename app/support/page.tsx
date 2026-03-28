'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { IconLock } from '@tabler/icons-react'
import { useProfile } from '@/src/context/ProfileContext'
import { supabase } from '@/lib/supabaseClient'

type ProfileMetaRow = {
  condition_id: string | null
  reason: string | null
}

type ConditionRow = {
  name: string | null
}

type ConditionGuide = {
  label: string
  summary: string
  causes: string
  approachTitle: string
  dietApproach: string[]
  supplementsToDiscuss: string[]
  sampleMeals: string[]
  substitutions: string[]
}

type SupportMealPlan = {
  title: string
  summary: string
  meals: Array<{
    name: string
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
    whyItFits: string
  }>
  focusPoints: string[]
}

type SubstitutionCard = {
  from: string
  to: string
  reason: string
}

const CONDITION_GUIDES: Record<string, ConditionGuide> = {
  crohns: {
    label: "Crohn's disease",
    summary:
      "Crohn's disease is a chronic inflammatory bowel disease where inflammation can affect any part of the GI tract and may flare over time.",
    causes:
      'The exact cause is not fully known. It is linked to immune dysregulation, genetics, and environmental triggers such as infections, stress, and smoking.',
    approachTitle: 'Condition-Aware Approach',
    dietApproach: [
      'During flares, use lower-residue and easier-to-digest meals to reduce gut irritation.',
      'When stable, reintroduce fiber gradually and monitor personal triggers in your logs.',
      'Prioritize hydration and adequate protein to support recovery and energy.',
    ],
    supplementsToDiscuss: [
      'Vitamin D, B12, iron, and folate if deficiency is suspected or confirmed.',
      'Electrolyte support during diarrhea-heavy periods.',
      'Avoid self-starting supplements without clinician guidance because absorption and interactions vary.',
    ],
    sampleMeals: [
      'Baked salmon, white rice, and cooked carrots.',
      'Scrambled eggs with sourdough toast and peeled cucumber.',
      'Chicken noodle soup with soft vegetables.',
    ],
    substitutions: [
      'Swap raw salads for cooked or peeled vegetables during active symptoms.',
      'Swap high-fat fried foods for baked or grilled proteins.',
      'Swap spicy sauces for mild herb-based seasoning.',
      'Swap tough whole grains for white rice or potatoes during more active symptom days.',
      'Swap large heavy meals for smaller plates spaced more evenly through the day.',
      // 'Swap heavily creamy dishes for broth-based or lighter olive-oil-based meals.',
    ],
  },
  ulcerative_colitis: {
    label: 'Ulcerative colitis',
    summary:
      'Ulcerative colitis is an inflammatory bowel disease that affects the colon and rectum, causing inflammation and ulcers in the lining.',
    causes:
      'Cause is not fully known; likely immune dysregulation plus genetic and environmental factors. Symptom severity and triggers vary by person.',
    approachTitle: 'Condition-Aware Approach',
    dietApproach: [
      'Use smaller, more frequent meals if larger meals worsen urgency or cramping.',
      'Reduce high-fat and highly spicy foods during flares.',
      'Track tolerance for fiber amount and type, then adjust gradually.',
    ],
    supplementsToDiscuss: [
      'Iron and B-vitamins if fatigue or deficiency risk is present.',
      'Calcium and vitamin D if steroid exposure or low intake is a concern.',
      'Discuss probiotics with your clinician, because results are condition- and strain-specific.',
    ],
    sampleMeals: [
      'Turkey and rice bowl with cooked zucchini.',
      'Oatmeal with banana and peanut butter.',
      'Baked cod, mashed potatoes, and steamed green beans.',
    ],
    substitutions: [
      'Swap greasy fast food for lean protein bowls.',
      'Swap high-lactose dairy for lactose-free options if sensitive.',
      'Swap very high-fiber snacks for gentler options during flares.',
      'Swap oversized meals for smaller, more frequent meals if urgency worsens after eating.',
      'Swap raw crunchy vegetables for softer cooked vegetables during more active days.',
      // 'Swap rich takeout meals for simpler rice, potato, or soup-based meals.',
    ],
  },
  ibs: {
    label: 'Irritable bowel syndrome (IBS)',
    summary:
      'IBS is a disorder of gut-brain interaction that can cause abdominal pain, bloating, constipation, diarrhea, or mixed bowel changes.',
    causes:
      'Common drivers include gut sensitivity, motility changes, stress response, and food triggers. There is no single cause for all people.',
    approachTitle: 'Condition-Aware Approach',
    dietApproach: [
      'A guided low FODMAP process may help identify carbohydrate triggers for some IBS users.',
      'Focus on one change at a time so symptom responses are easier to interpret.',
      'Meal timing consistency and stress management often improve symptom control.',
    ],
    supplementsToDiscuss: [
      'Soluble fiber (such as psyllium) can help some IBS patterns.',
      'Peppermint oil may help cramping in some people.',
      'Probiotics may be useful for selected users, but strain choice matters.',
    ],
    sampleMeals: [
      'Grilled chicken, quinoa, and roasted carrots.',
      'Lactose-free yogurt with chia and berries.',
      'Rice noodles with tofu, spinach, and ginger.',
    ],
    substitutions: [
      'Swap onion/garlic bases for garlic-infused oil and chives.',
      'Swap wheat pasta for rice or quinoa pasta.',
      'Swap regular milk for lactose-free milk or fortified almond milk.',
      'Swap large mixed meals for simpler plates with fewer moving parts.',
      'Swap heavily sauced meals for lighter seasoning with herbs, ginger, or infused oils.',
      // 'Swap beans or lentils for eggs, tofu, or lean animal protein if legumes are harder to tolerate.',
    ],
  },
  celiac: {
    label: 'Celiac disease',
    summary:
      'Celiac disease is an autoimmune condition where gluten exposure damages the small intestine in susceptible individuals.',
    causes:
      'It is triggered by gluten in people with a genetic predisposition. Strict lifelong gluten avoidance is the core treatment.',
    approachTitle: 'Condition-Aware Approach',
    dietApproach: [
      'Use strict gluten-free eating, including cross-contamination prevention.',
      'Verify sauces, spices, and packaged foods for hidden gluten ingredients.',
      'Build balanced gluten-free meals with enough fiber, iron, and B-vitamins.',
    ],
    supplementsToDiscuss: [
      'Iron, folate, B12, calcium, and vitamin D if lab work suggests low levels.',
      'A multivitamin may be considered when intake is limited early on.',
      'Confirm supplement labels are gluten-free before use.',
    ],
    sampleMeals: [
      'Gluten-free oats with fruit and seeds.',
      'Chicken, sweet potato, and spinach bowl.',
      'Corn tortillas with fish, cabbage slaw, and lime.',
    ],
    substitutions: [
      'Swap wheat bread for certified gluten-free bread.',
      'Swap soy sauce for tamari labeled gluten-free.',
      'Swap flour tortillas for corn tortillas.',
      'Swap breaded proteins for grilled or baked gluten-free versions.',
      'Swap packaged snacks with unclear labels for clearly certified gluten-free options.',
      // 'Swap shared condiment jars or spreads for dedicated gluten-free ones to reduce cross-contact.',
    ],
  },
  lactose: {
    label: 'Lactose intolerance',
    summary:
      'Lactose intolerance happens when the body does not make enough lactase to digest lactose, leading to gas, bloating, and diarrhea after dairy.',
    causes:
      'It is commonly due to reduced lactase activity with age, but it can also follow gut infections or inflammation.',
    approachTitle: 'Condition-Aware Approach',
    dietApproach: [
      'Limit high-lactose foods and test tolerance in small amounts.',
      'Use lactose-free dairy or low-lactose options when possible.',
      'Ensure calcium and protein intake stays adequate when reducing dairy.',
    ],
    supplementsToDiscuss: [
      'Lactase enzyme products before dairy exposures.',
      'Calcium and vitamin D if dairy intake is significantly reduced.',
      'Review long-term nutrition gaps with your clinician or dietitian.',
    ],
    sampleMeals: [
      'Lactose-free Greek yogurt parfait with fruit and nuts.',
      'Turkey wrap with lactose-free cheese and greens.',
      'Stir-fry with tofu, rice, and sesame oil.',
    ],
    substitutions: [
      'Swap regular milk for lactose-free milk.',
      'Swap ice cream for lactose-free or dairy-free alternatives.',
      'Swap soft cheeses for aged cheeses that are often lower in lactose.',
      'Swap creamy sauces for olive-oil-based or dairy-free sauces.',
      'Swap standard yogurt for lactose-free yogurt or a fortified dairy-free version.',
      // 'Swap milk-heavy desserts for fruit, dark chocolate, or lactose-free alternatives.',
    ],
  },
  gerd: {
    label: 'GERD / acid reflux',
    summary:
      'GERD is chronic acid reflux where stomach contents repeatedly flow back into the esophagus, causing heartburn or regurgitation.',
    causes:
      'Contributors can include lower esophageal sphincter weakness, large meals, late-night eating, obesity, and trigger foods.',
    approachTitle: 'Condition-Aware Approach',
    dietApproach: [
      'Use smaller meals and avoid eating close to bedtime.',
      'Limit known triggers such as high-fat foods, alcohol, peppermint, and acidic foods if they worsen symptoms.',
      'Pair food changes with lifestyle steps like head-of-bed elevation when advised.',
    ],
    supplementsToDiscuss: [
      'Do not replace prescribed reflux medications with supplements without medical guidance.',
      'Some users discuss alginate products or antacids for symptom support.',
      'Review all supplements because some can worsen reflux symptoms.',
    ],
    sampleMeals: [
      'Baked chicken, brown rice, and steamed broccoli.',
      'Overnight oats with banana and almond butter.',
      'Turkey and avocado sandwich on whole grain bread.',
    ],
    substitutions: [
      'Swap tomato-heavy sauces for herb-based olive oil sauces.',
      'Swap spicy meals for mild seasoning.',
      'Swap caffeinated drinks for low-acid or decaf options if needed.',
      'Swap fried or greasy meals for baked, grilled, or roasted options.',
      'Swap large late dinners for lighter earlier evening meals.',
      // 'Swap citrus-heavy snacks for bananas, oats, or other lower-acid choices if tolerated.',
    ],
  },
}

const GENERIC_GUIDE: ConditionGuide = {
  label: 'Digestive condition support',
  summary:
    'Digestive symptoms can come from many different conditions, and each person can respond differently to the same foods or routines.',
  causes:
    'Depending on the condition, causes may include inflammation, immune responses, enzyme deficiencies, motility changes, stress response, or food sensitivities.',
  approachTitle: 'Condition-Aware Approach',
  dietApproach: [
    'Use a structured food and symptom log to identify your own patterns.',
    'Change one variable at a time (single food, portion, or timing) for clearer results.',
    'Use meal consistency, hydration, and sleep routines as your baseline support plan.',
  ],
  supplementsToDiscuss: [
    'Bring your full medication and supplement list to your clinician before adding anything new.',
    'Ask whether any lab-guided nutrient checks are appropriate for your symptoms.',
    'Only trial one supplement at a time and monitor effects.',
  ],
  sampleMeals: [
    'Lean protein + cooked vegetable + tolerated starch bowl.',
    'Simple oatmeal or rice porridge with tolerated toppings.',
    'Soup-based meal with easy-to-digest ingredients.',
  ],
  substitutions: [
    'Swap high-fat fried meals for baked or grilled options.',
    'Swap heavily processed snacks for simpler whole-food options.',
    'Swap large meals for smaller portions spread across the day.',
    'Swap sugary drinks for water or lower-sugar options.',
    'Swap rich creamy meals for simpler bowls, soups, or plates.',
    // 'Swap random eating times for a steadier daily meal rhythm.',
  ],
}

const GUT_HEALTH_DEFAULT_GUIDE: ConditionGuide = {
  label: 'General gut health improvement',
  summary:
    'You have not selected a digestive condition, so this plan focuses on building stronger gut health habits and identifying what helps you feel your best.',
  causes:
    'Gut comfort and digestion can be influenced by meal quality, fiber balance, hydration, sleep, stress, activity, and routine consistency.',
  approachTitle: 'Gut-Health Foundation Plan',
  dietApproach: [
    'Build meals around whole foods: protein, tolerated fiber, and minimally processed carbs.',
    'Increase fiber gradually and pair it with water so digestion can adapt comfortably.',
    'Keep meal timing consistent and avoid large late-night meals when possible.',
  ],
  supplementsToDiscuss: [
    'If needed, discuss a simple probiotic trial with your clinician or dietitian.',
    'Consider whether vitamin D, B12, or iron testing is appropriate based on your intake and symptoms.',
    'Only add one supplement at a time so you can clearly track effects.',
  ],
  sampleMeals: [
    'Greek yogurt (or dairy-free alternative), oats, berries, and chia.',
    'Salmon bowl with quinoa, cooked greens, and olive oil.',
    'Lentil soup with sourdough toast and a side of cooked vegetables.',
  ],
  substitutions: [
    'Swap sugary snacks for fruit plus nuts or seeds.',
    'Swap highly processed meals for simple home-cooked bowls.',
    'Swap low-fiber grains for higher-fiber options you tolerate well.',
    'Swap skipped meals for steadier meals with protein and a tolerated carb.',
    'Swap very large dinners for more balanced intake across the day.',
    'Swap low-variety meals for a wider mix of tolerated whole foods over the week.',
  ],
}

const LOCKED_MEAL_PLAN_PREVIEW = {
  title: 'Starter meal direction',
  summary: 'A simple, non-personalized daily structure to help you stay pointed toward gentler, more balanced meals.',
  meals: [
    { mealType: 'breakfast', name: 'Protein + tolerated carb + simple fruit' },
    { mealType: 'lunch', name: 'Lean protein bowl with a gentler side' },
    { mealType: 'dinner', name: 'Balanced plate with milder ingredients' },
    { mealType: 'snack', name: 'Small snack built around a safer staple' },
  ],
}

function buildSubstitutionCards(substitutions: string[] | undefined, guideLabel: string | undefined): SubstitutionCard[] {
  if (!substitutions || substitutions.length === 0) return []

  return substitutions.map((entry) => {
    const normalized = entry.trim()
    const match = normalized.match(/^swap\s+(.+?)\s+for\s+(.+)$/i)

    if (match) {
      const from = match[1].trim().replace(/\.$/, '')
      const to = match[2].trim().replace(/\.$/, '')
      return {
        from: from.charAt(0).toUpperCase() + from.slice(1),
        to: to.charAt(0).toUpperCase() + to.slice(1),
        reason: `This swap is a smarter default for ${guideLabel ?? 'your current condition focus'} when you want a gentler option without losing structure.`,
      }
    }

    return {
      from: 'Current pattern',
      to: normalized.replace(/\.$/, ''),
      reason: `This fits the current support direction for ${guideLabel ?? 'your condition focus'}.`,
    }
  })
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().trim()
}

function isNoneLike(value: string): boolean {
  if (!value) return true
  return ['none', 'no condition', 'no conditions', 'n/a', 'na'].includes(value)
}

function normalizeProfileInput(value: string | null | undefined): string | null {
  const cleaned = (value ?? '').trim()
  if (!cleaned) return null
  if (isNoneLike(cleaned.toLowerCase())) return null
  return cleaned
}

function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function resolveGuide(conditionName: string | null, dietaryRestriction: string | null): ConditionGuide {
  const cond = normalize(conditionName)
  const restriction = normalize(dietaryRestriction)
  const noConditionSelected = isNoneLike(cond)
  const noRestrictionSelected = isNoneLike(restriction)

  if (noConditionSelected && noRestrictionSelected) return GUT_HEALTH_DEFAULT_GUIDE

  if (cond.includes('crohn')) return CONDITION_GUIDES.crohns
  if (cond.includes('ulcerative') || cond.includes('colitis')) return CONDITION_GUIDES.ulcerative_colitis
  if (cond.includes('celiac')) return CONDITION_GUIDES.celiac
  if (cond.includes('lactose')) return CONDITION_GUIDES.lactose
  if (cond.includes('gerd') || cond.includes('reflux')) return CONDITION_GUIDES.gerd
  if (cond.includes('ibs') || cond.includes('irritable bowel')) return CONDITION_GUIDES.ibs

  if (noConditionSelected) return GUT_HEALTH_DEFAULT_GUIDE

  if (restriction.includes('fodmap')) return CONDITION_GUIDES.ibs
  if (restriction.includes('gluten')) return CONDITION_GUIDES.celiac
  if (restriction.includes('lactose') || restriction.includes('dairy')) return CONDITION_GUIDES.lactose
  if (restriction.includes('reflux') || restriction.includes('gerd')) return CONDITION_GUIDES.gerd

  if (noRestrictionSelected) return GUT_HEALTH_DEFAULT_GUIDE

  return GENERIC_GUIDE
}

const Support = () => {
  const { profile } = useProfile()
  const isPremium = Boolean(profile?.is_premium)

  const [conditionName, setConditionName] = useState<string | null>(null)
  const [dietaryRestriction, setDietaryRestriction] = useState<string | null>(null)
  const [loadingGuide, setLoadingGuide] = useState(true)
  const [guideError, setGuideError] = useState<string | null>(null)
  const [mealPlan, setMealPlan] = useState<SupportMealPlan | null>(null)
  const [mealPlanLoading, setMealPlanLoading] = useState(false)
  const [mealPlanError, setMealPlanError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const loadConditionContext = async () => {
      setLoadingGuide(true)
      setGuideError(null)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (!active) return

      if (userError || !user) {
        setConditionName(null)
        setDietaryRestriction(normalizeProfileInput(profile?.reason ?? null))
        setLoadingGuide(false)
        if (userError) setGuideError(userError.message)
        return
      }

      const profileRes = await supabase
        .from('profiles')
        .select('condition_id, reason')
        .eq('id', user.id)
        .maybeSingle()

      if (!active) return

      if (profileRes.error || !profileRes.data) {
        setConditionName(null)
        setDietaryRestriction(normalizeProfileInput(profile?.reason ?? null))
        setLoadingGuide(false)
        if (profileRes.error) setGuideError(profileRes.error.message)
        return
      }

      const profileMeta = profileRes.data as ProfileMetaRow
      setDietaryRestriction(normalizeProfileInput(profileMeta.reason ?? profile?.reason ?? null))

      if (!profileMeta.condition_id) {
        setConditionName(null)
        setLoadingGuide(false)
        return
      }

      const conditionRes = await supabase
        .from('conditions')
        .select('name')
        .eq('id', profileMeta.condition_id)
        .maybeSingle()

      if (!active) return

      if (conditionRes.error || !conditionRes.data) {
        setConditionName(null)
        setLoadingGuide(false)
        if (conditionRes.error) setGuideError(conditionRes.error.message)
        return
      }

      const condition = conditionRes.data as ConditionRow
      setConditionName(normalizeProfileInput(condition.name ?? null))
      setLoadingGuide(false)
    }

    void loadConditionContext()

    return () => {
      active = false
    }
  }, [profile?.id, profile?.reason])

  const resolvedGuide = useMemo(
    () => resolveGuide(conditionName, dietaryRestriction ?? profile?.reason ?? null),
    [conditionName, dietaryRestriction, profile?.reason]
  )

  const displayCondition = loadingGuide ? '' : conditionName ?? resolvedGuide.label
  const activeGuide = loadingGuide ? null : resolvedGuide
  const substitutionCards = useMemo(
    () => buildSubstitutionCards(activeGuide?.substitutions, displayCondition || activeGuide?.label),
    [activeGuide?.label, activeGuide?.substitutions, displayCondition]
  )

  useEffect(() => {
    let active = true

    const loadMealPlan = async () => {
      if (!isPremium) {
        setMealPlan(null)
        setMealPlanError(null)
        setMealPlanLoading(false)
        return
      }

      setMealPlanLoading(true)
      setMealPlanError(null)

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.access_token) {
          throw new Error('You must be signed in to load your daily meal plan.')
        }

        const todayKey = toDateKey(new Date())

        const response = await fetch(`/api/support-meal-plan?date=${todayKey}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(payload.error ?? 'Could not load your daily meal plan.')
        }

        const data = (await response.json()) as SupportMealPlan
        if (!active) return
        setMealPlan(data)
      } catch (error) {
        if (!active) return
        console.error(error)
        setMealPlanError(error instanceof Error ? error.message : 'Could not load your daily meal plan.')
        setMealPlan(null)
      } finally {
        if (active) {
          setMealPlanLoading(false)
        }
      }
    }

    void loadMealPlan()

    return () => {
      active = false
    }
  }, [isPremium, profile?.id])

  return (
    <div className="p-4 md:p-6 mt-3 md:mt-5 flex flex-col items-center">
      <div className="w-full max-w-6xl flex flex-col md:flex-row md:items-center md:justify-between mb-4 border-b-2 border-b-green-600/70 pb-4 gap-3">
        <div>
          <h1 className="text-3xl font-medium tracking-tight">Support</h1>
          <p className="text-sm text-gray-600 mt-1">Condition education, food guidance, and safer day-to-day options.</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
          <span className="font-medium">Current focus:</span>{' '}
          {loadingGuide ? <span className="inline-block h-4 w-36 animate-pulse rounded bg-green-200/80 align-middle" /> : displayCondition}
        </div>
      </div>

      <div className="w-full max-w-6xl mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <p className="text-sm text-amber-900">
          This page is educational support and does not replace doctors or prescribed treatment. Always consult your clinician before starting
          supplements, changing medications, or making major diet/lifestyle changes.
        </p>
      </div>

      <div className="w-full max-w-6xl mb-5 rounded-2xl border border-green-300 bg-linear-to-r from-green-50 via-white to-emerald-50 p-5 shadow-sm">
        {loadingGuide ? (
          <div className="space-y-3">
            <div className="h-7 w-56 animate-pulse rounded bg-green-200/80" />
            <div className="h-4 w-full animate-pulse rounded bg-green-100" />
            <div className="h-4 w-11/12 animate-pulse rounded bg-green-100" />
            <div className="h-4 w-10/12 animate-pulse rounded bg-green-100" />
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-gray-900">{displayCondition}</h2>
            <p className="mt-2 text-sm text-gray-700">{activeGuide?.summary}</p>
            <p className="mt-2 text-sm text-gray-700">
              <span className="font-medium text-gray-900">What causes it: </span>
              {activeGuide?.causes}
            </p>
          </>
        )}
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 mb-5">
        <section className="md:col-span-2 lg:col-span-7 bg-white border border-green-300 bg-linear-to-br from-white to-green-50/60 p-5 rounded-2xl shadow-sm">
          <h3 className="text-lg font-semibold border-b border-green-200 pb-3">{loadingGuide ? ' ' : activeGuide?.approachTitle}</h3>
          {loadingGuide ? (
            <div className="mt-3 space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-green-100" />
              <div className="h-4 w-11/12 animate-pulse rounded bg-green-100" />
              <div className="h-4 w-10/12 animate-pulse rounded bg-green-100" />
            </div>
          ) : (
            <ul className="mt-3 list-disc pl-5 text-sm text-gray-700 space-y-2">
              {activeGuide?.dietApproach.map((item) => (
                <li key={`approach-${item}`}>{item}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="md:col-span-2 lg:col-span-5 bg-white border border-green-300 bg-linear-to-br from-white to-green-50/60 p-5 rounded-2xl shadow-sm">
          <h3 className="text-lg font-semibold border-b border-green-200 pb-3">Supplements to Discuss</h3>
          {loadingGuide ? (
            <div className="mt-3 space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-green-100" />
              <div className="h-4 w-11/12 animate-pulse rounded bg-green-100" />
              <div className="h-4 w-9/12 animate-pulse rounded bg-green-100" />
            </div>
          ) : (
            <ul className="mt-3 list-disc pl-5 text-sm text-gray-700 space-y-2">
              {activeGuide?.supplementsToDiscuss.map((item) => (
                <li key={`supplement-${item}`}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <section className="bg-white border border-green-300 bg-linear-to-br from-white to-green-50/60 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between border-b border-green-200 pb-3">
            <h3 className="text-lg font-semibold">Daily Meal Plan</h3>
            <span className="rounded-full border border-green-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-green-700">
              {isPremium ? 'Premium' : 'Locked'}
            </span>
          </div>
          {isPremium ? (
            mealPlanLoading ? (
              <div className="mt-4 space-y-3">
                <div className="h-5 w-48 animate-pulse rounded bg-green-100" />
                <div className="h-4 w-full animate-pulse rounded bg-green-100" />
                <div className="h-24 w-full animate-pulse rounded-2xl bg-green-50" />
                <div className="h-24 w-full animate-pulse rounded-2xl bg-green-50" />
              </div>
            ) : mealPlanError ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {mealPlanError}
              </div>
            ) : mealPlan ? (
              <>
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-green-700">{mealPlan.title}</p>
                <p className="mt-2 text-sm leading-6 text-gray-700">{mealPlan.summary}</p>
                <div className="mt-4 space-y-3">
                  {mealPlan.meals.map((meal) => (
                    <div key={`${meal.mealType}-${meal.name}`} className="rounded-2xl border border-green-200 bg-white/80 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-base font-semibold text-gray-900">{meal.name}</p>
                        <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-green-800">
                          {meal.mealType}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-gray-600">{meal.whyItFits}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl border border-green-200 bg-green-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-700">How to use today&apos;s plan</p>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-700">
                    {mealPlan.focusPoints.map((item) => (
                      <li key={`focus-${item}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-gray-600">No meal plan available right now.</p>
            )
          ) : (
            <div className="mt-4 space-y-4">
              {/* <div className="rounded-2xl border border-green-200 bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-green-700">{LOCKED_MEAL_PLAN_PREVIEW.title}</p>
                <p className="mt-2 text-sm leading-6 text-gray-700">{LOCKED_MEAL_PLAN_PREVIEW.summary}</p>
              </div> */}

              <div className="space-y-3">
                {LOCKED_MEAL_PLAN_PREVIEW.meals.map((meal) => (
                  <div key={`${meal.mealType}-${meal.name}`} className="rounded-2xl border border-green-200 bg-white/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-base font-semibold text-gray-900">{meal.name}</p>
                      <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-green-800">
                        {meal.mealType}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      Premium turns this into a daily rotating plan built around your safe foods and condition.
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-dashed border-green-300 bg-green-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-green-800">
                    <IconLock size={18} />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-950">Upgrade for a personalized daily plan</h4>
                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      Premium refreshes meal ideas every day using your condition, dietary notes, and foods you&apos;ve already logged as safe, so you get more specific options instead of general starter guidance.
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
            </div>
          )}
        </section>

        <section className="bg-white border border-green-300 bg-linear-to-br from-white to-green-50/60 p-5 rounded-2xl shadow-sm">
          <div className="border-b border-green-200 pb-3">
            <h3 className="text-lg font-semibold">Smart Substitutions</h3>
            {!loadingGuide ? (
              <p className="mt-2 text-sm text-gray-600">
                Condition-aware swaps for <span className="font-medium text-gray-900">{displayCondition}</span>.
              </p>
            ) : null}
          </div>
          {loadingGuide ? (
            <div className="mt-4 space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-green-100" />
              <div className="h-4 w-11/12 animate-pulse rounded bg-green-100" />
              <div className="h-4 w-8/12 animate-pulse rounded bg-green-100" />
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {substitutionCards.map((swap) => (
                <div key={`${swap.from}-${swap.to}`} className="rounded-2xl border border-green-200 bg-white/80 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Swap from</p>
                      <p className="mt-1 text-base font-semibold text-gray-900">{swap.from}</p>
                    </div>
                    <div className="hidden sm:block self-center text-sm font-semibold text-green-700">to</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-700">Better fit</p>
                      <p className="mt-1 text-base font-semibold text-gray-900">{swap.to}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-gray-600">{swap.reason}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="w-full max-w-6xl rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-red-900">Medical Safety Reminder</h3>
        <p className="mt-2 text-sm text-red-900/90">
          If symptoms worsen, become severe, or include warning signs such as persistent bleeding, severe pain, fever, or dehydration, seek urgent
          medical care.
        </p>
      </div>

      {(loadingGuide || guideError) && (
        <div className="w-full max-w-6xl mt-5">
          {loadingGuide && <p className="text-sm text-gray-600">Loading condition-specific support...</p>}
          {guideError && <p className="text-sm text-red-600">{guideError}</p>}
        </div>
      )}
    </div>
  )
}

export default Support
