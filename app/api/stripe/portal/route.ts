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
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/settings`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe billing portal error:', error)

    return NextResponse.json(
      { error: 'Unable to create billing portal session' },
      { status: 500 },
    )
  }
}
