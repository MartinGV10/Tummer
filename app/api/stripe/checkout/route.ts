import { NextResponse } from 'next/server'
import { getAuthenticatedBillingUser } from '@/lib/auth'
import { getStripe, getStripePriceId } from '@/lib/stripe'

type CheckoutRequestBody = {
  plan?: 'monthly' | 'six_month'
}

export async function POST(request: Request) {
  try {
    const authResult = await getAuthenticatedBillingUser(request)

    if ('response' in authResult) {
      return authResult.response
    }

    const body = (await request.json()) as CheckoutRequestBody
    const plan = body.plan

    if (plan !== 'monthly' && plan !== 'six_month') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const stripe = getStripe()
    const priceId = getStripePriceId(plan)
    const origin = request.headers.get('origin') ?? new URL(request.url).origin

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/settings`,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      client_reference_id: authResult.userId,
      customer: authResult.profile.stripe_customer_id ?? undefined,
      allow_promotion_codes: true,
      metadata: {
        user_id: authResult.userId,
        plan,
      },
      subscription_data: {
        metadata: {
          user_id: authResult.userId,
          plan,
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout session error:', {
      message: error instanceof Error ? error.message : 'Unknown server error',
      type: typeof error === 'object' && error !== null && 'type' in error ? String((error as { type?: unknown }).type) : undefined,
      code: typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code) : undefined,
      param: typeof error === 'object' && error !== null && 'param' in error ? String((error as { param?: unknown }).param) : undefined,
    })

    const details =
      error instanceof Error
        ? error.message
        : 'Unknown server error'

    return NextResponse.json(
      {
        error: 'Unable to create checkout session',
        details:
          process.env.NODE_ENV === 'development'
            ? details
            : undefined,
      },
      { status: 500 },
    )
  }
}
