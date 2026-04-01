import { NextResponse } from 'next/server'
import { getAuthenticatedBillingUser } from '@/lib/auth'
import { getStripe } from '@/lib/stripe'

export async function POST(request: Request) {
  try {
    const authResult = await getAuthenticatedBillingUser(request)

    if ('response' in authResult) {
      return authResult.response
    }

    const customerId = authResult.profile.stripe_customer_id

    if (!customerId) {
      return NextResponse.json(
        { error: 'No Stripe customer found for this account' },
        { status: 400 },
      )
    }

    const stripe = getStripe()
    const origin = request.headers.get('origin') ?? new URL(request.url).origin

    try {
      await stripe.customers.retrieve(customerId)
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: unknown }).code)
          : undefined

      if (code === 'resource_missing') {
        return NextResponse.json(
          {
            error:
              'Your saved billing profile could not be found in Stripe. Start a new checkout session to reconnect billing.',
          },
          { status: 400 },
        )
      }

      throw error
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/settings`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe billing portal error:', {
      message: error instanceof Error ? error.message : 'Unknown server error',
      type: typeof error === 'object' && error !== null && 'type' in error ? String((error as { type?: unknown }).type) : undefined,
      code: typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code) : undefined,
      param: typeof error === 'object' && error !== null && 'param' in error ? String((error as { param?: unknown }).param) : undefined,
    })

    return NextResponse.json(
      {
        error: 'Unable to create billing portal session',
        details:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.message
              : 'Unknown server error'
            : undefined,
      },
      { status: 500 },
    )
  }
}
