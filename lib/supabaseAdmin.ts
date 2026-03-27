import { createClient } from '@supabase/supabase-js'
import type { Profile } from '@/src/context/ProfileContext'

function getEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }

  return value
}

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL')
const supabasePublishableKey = getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
const supabaseServiceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

export const supabaseAuth = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

export type BillingProfile = Pick<
  Profile,
  | 'id'
  | 'stripe_customer_id'
  | 'stripe_subscription_id'
  | 'subscription_status'
  | 'subscription_price_id'
  | 'current_period_end'
  | 'is_premium'
>

export async function getBillingProfile(userId: string) {
  const { data: baseProfile, error: baseError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle<{ id: string }>()

  if (baseError) {
    throw baseError
  }

  if (!baseProfile) {
    return null
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select(
      'id, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_price_id, current_period_end, is_premium'
    )
    .eq('id', userId)
    .maybeSingle<BillingProfile>()

  if (error) {
    const message = `${error.message} ${error.details ?? ''}`.toLowerCase()
    const missingStripeColumn =
      message.includes('stripe_customer_id') ||
      message.includes('stripe_subscription_id') ||
      message.includes('subscription_status') ||
      message.includes('subscription_price_id') ||
      message.includes('current_period_end') ||
      message.includes('is_premium') ||
      message.includes('schema cache')

    if (missingStripeColumn) {
      return {
        id: baseProfile.id,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        subscription_status: null,
        subscription_price_id: null,
        current_period_end: null,
        is_premium: false,
      } satisfies BillingProfile
    }

    throw error
  }

  return data
}
