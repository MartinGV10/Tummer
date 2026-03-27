import Stripe from 'stripe'

let stripeClient: Stripe | null = null

function getEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }

  return value
}

function getFirstEnv(names: string[]) {
  for (const name of names) {
    const value = process.env[name]

    if (value) {
      return value
    }
  }

  throw new Error(`Missing environment variable. Expected one of: ${names.join(', ')}`)
}

export function getStripe() {
  if (!stripeClient) {
    stripeClient = new Stripe(getEnv('STRIPE_SECRET_KEY'), {
      apiVersion: '2026-03-25.dahlia',
      typescript: true,
    })
  }

  return stripeClient
}

export function getStripeWebhookSecret() {
  return getEnv('STRIPE_WEBHOOK_SECRET')
}

export function getStripePriceId(interval: 'monthly' | 'six_month') {
  return interval === 'monthly'
    ? getFirstEnv([
        'STRIPE_MONTHLY_PRICE_ID',
        'STRIPE_PRICE_MONTHLY',
      ])
    : getFirstEnv([
        'STRIPE_PRICE_SIX_MONTH',
        'STRIPE_SIX_MONTH_PRICE_ID',
      ])
}
