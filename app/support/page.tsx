'use client'

import React, { useEffect, useMemo, useState } from 'react'
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
  ],
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

  const [conditionName, setConditionName] = useState<string | null>(null)
  const [dietaryRestriction, setDietaryRestriction] = useState<string | null>(null)
  const [loadingGuide, setLoadingGuide] = useState(true)
  const [guideError, setGuideError] = useState<string | null>(null)

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
        {!loadingGuide && dietaryRestriction && (
          <p className="mt-2 text-xs text-gray-600">
            Your profile dietary note: <span className="font-medium">{dietaryRestriction}</span>
          </p>
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
          <h3 className="text-lg font-semibold border-b border-green-200 pb-3">Sample Meals</h3>
          {loadingGuide ? (
            <div className="mt-4 space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-green-100" />
              <div className="h-4 w-10/12 animate-pulse rounded bg-green-100" />
              <div className="h-4 w-9/12 animate-pulse rounded bg-green-100" />
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-600 mt-2">Examples only. Personal tolerance varies.</p>
              <ul className="mt-3 list-disc pl-5 text-sm text-gray-700 space-y-2">
                {activeGuide?.sampleMeals.map((meal) => (
                  <li key={`meal-${meal}`}>{meal}</li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="bg-white border border-green-300 bg-linear-to-br from-white to-green-50/60 p-5 rounded-2xl shadow-sm">
          <h3 className="text-lg font-semibold border-b border-green-200 pb-3">Smart Substitutions</h3>
          {loadingGuide ? (
            <div className="mt-4 space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-green-100" />
              <div className="h-4 w-11/12 animate-pulse rounded bg-green-100" />
              <div className="h-4 w-8/12 animate-pulse rounded bg-green-100" />
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-600 mt-2">Use these swaps when a food pattern triggers symptoms.</p>
              <ul className="mt-3 list-disc pl-5 text-sm text-gray-700 space-y-2">
                {activeGuide?.substitutions.map((swap) => (
                  <li key={`swap-${swap}`}>{swap}</li>
                ))}
              </ul>
            </>
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
