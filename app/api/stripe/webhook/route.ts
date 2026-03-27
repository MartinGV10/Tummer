import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { isPremiumStatus } from '@/lib/billing'
import { getStripe, getStripeWebhookSecret } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function toIsoDate(timestamp?: number | null) {
  if (!timestamp) {
    return null
  }

  return new Date(timestamp * 1000).toISOString()
}

async function updateProfileByUserId(
  userId: string,
  values: {
    stripe_customer_id?: string | null
    stripe_subscription_id?: string | null
    subscription_status?: string | null
    subscription_price_id?: string | null
    current_period_end?: string | null
    is_premium?: boolean
  },
) {
  const { error } = await supabaseAdmin.from('profiles').update(values).eq('id', userId)

  if (error) {
    throw error
  }
}

async function updateProfileByCustomerId(
  customerId: string,
  values: {
    stripe_customer_id?: string | null
    stripe_subscription_id?: string | null
    subscription_status?: string | null
    subscription_price_id?: string | null
    current_period_end?: string | null
    is_premium?: boolean
  },
) {
  const { error } = await supabaseAdmin.from('profiles').update(values).eq('stripe_customer_id', customerId)

  if (error) {
    throw error
  }
}

function getSubscriptionUserId(subscription: Stripe.Subscription) {
  const metadataUserId = subscription.metadata.user_id

  if (metadataUserId) {
    return metadataUserId
  }

  return null
}

function getSubscriptionUpdate(subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price.id ?? null
  const status = subscription.status
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end ?? subscription.trial_end ?? null

  return {
    stripe_customer_id:
      typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
    stripe_subscription_id: subscription.id,
    subscription_status: status,
    subscription_price_id: priceId,
    current_period_end: toIsoDate(currentPeriodEnd),
    is_premium: isPremiumStatus(status),
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id
  const customerId =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id ?? null
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id ?? null

  if (!userId) {
    return
  }

  await updateProfileByUserId(userId, {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
  })
}

async function handleSubscriptionCreatedOrUpdated(subscription: Stripe.Subscription) {
  const userId = getSubscriptionUserId(subscription)
  const update = getSubscriptionUpdate(subscription)

  if (userId) {
    await updateProfileByUserId(userId, update)
    return
  }

  await updateProfileByCustomerId(update.stripe_customer_id ?? '', update)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = getSubscriptionUserId(subscription)
  const update = {
    stripe_customer_id:
      typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
    stripe_subscription_id: subscription.id,
    subscription_status: subscription.status,
    subscription_price_id: subscription.items.data[0]?.price.id ?? null,
    current_period_end: toIsoDate(
      subscription.items.data[0]?.current_period_end ?? subscription.trial_end ?? null,
    ),
    is_premium: false,
  }

  if (userId) {
    await updateProfileByUserId(userId, update)
    return
  }

  await updateProfileByCustomerId(update.stripe_customer_id ?? '', update)
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId =
    typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id ?? null
  const subscriptionId =
    typeof invoice.parent?.subscription_details?.subscription === 'string'
      ? invoice.parent.subscription_details.subscription
      : invoice.parent?.subscription_details?.subscription?.id ?? null
  const rawPriceId = invoice.lines.data[0]?.pricing?.price_details?.price
  const priceId = typeof rawPriceId === 'string' ? rawPriceId : rawPriceId?.id ?? null

  if (!customerId) {
    return
  }

  await updateProfileByCustomerId(customerId, {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    subscription_status: 'past_due',
    subscription_price_id: priceId,
    current_period_end: toIsoDate(invoice.period_end),
    is_premium: false,
  })
}

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 })
  }

  try {
    const payload = await request.text()
    const stripe = getStripe()
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      getStripeWebhookSecret(),
    )

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionCreatedOrUpdated(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break
      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook error:', error)

    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 400 })
  }
}
