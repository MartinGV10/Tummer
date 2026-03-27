export const PREMIUM_STATUSES = new Set([
  'active',
  'trialing',
])

export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'paused'
  | 'trialing'
  | 'unpaid'
  | null

export function isPremiumStatus(status: string | null | undefined) {
  if (!status) {
    return false
  }

  return PREMIUM_STATUSES.has(status)
}
