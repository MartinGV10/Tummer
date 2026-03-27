import { NextResponse } from 'next/server'
import type { BillingProfile } from '@/lib/supabaseAdmin'
import { getBillingProfile, supabaseAuth } from '@/lib/supabaseAdmin'

type AuthenticatedBillingUser =
  | {
      userId: string
      profile: BillingProfile
    }
  | {
      response: NextResponse
    }

export async function getAuthenticatedBillingUser(request: Request): Promise<AuthenticatedBillingUser> {
  const authorization = request.headers.get('authorization')

  if (!authorization?.startsWith('Bearer ')) {
    return {
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const accessToken = authorization.slice('Bearer '.length).trim()

  if (!accessToken) {
    return {
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser(accessToken)

  if (authError || !user) {
    return {
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const profile = await getBillingProfile(user.id)

  if (!profile) {
    return {
      response: NextResponse.json({ error: 'Profile not found' }, { status: 404 }),
    }
  }

  return {
    userId: user.id,
    profile: profile as BillingProfile,
  }
}
