'use client'

import { useMemo, useState } from 'react'
import { Callout } from '@radix-ui/themes'
import { IconCreditCard, IconInfoCircle, IconLoader2, IconSparkles } from '@tabler/icons-react'
import { supabase } from '@/lib/supabaseClient'
import { isPremiumStatus } from '@/lib/billing'
import type { Profile } from '@/src/context/ProfileContext'

type BillingSectionProps = {
  profile: Pick<
    Profile,
    | 'subscription_status'
    | 'subscription_price_id'
    | 'current_period_end'
    | 'is_premium'
    | 'stripe_customer_id'
  >
}

type BillingAction = 'monthly' | 'six_month' | 'portal' | null

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session?.access_token ?? null
}

async function startBillingFlow(
  endpoint: '/api/stripe/checkout' | '/api/stripe/portal',
  body?: Record<string, string>,
) {
  const accessToken = await getAccessToken()

  if (!accessToken) {
    throw new Error('You must be signed in to manage billing.')
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const payload = (await response.json()) as { error?: string; details?: string; url?: string }

  if (!response.ok || !payload.url) {
    throw new Error(
      payload.details
        ? `${payload.error ?? 'Billing request failed.'} ${payload.details}`
        : payload.error ?? 'Billing request failed.',
    )
  }

  window.location.assign(payload.url)
}

function formatPeriodEnd(value: string | null) {
  if (!value) {
    return 'No renewal date available yet.'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'No renewal date available yet.'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export default function BillingSection({ profile }: BillingSectionProps) {
  const [activeAction, setActiveAction] = useState<BillingAction>(null)
  const [message, setMessage] = useState<string | null>(null)

  const statusLabel = useMemo(() => {
    if (!profile.subscription_status) {
      return 'Free plan'
    }

    return profile.subscription_status.replaceAll('_', ' ')
  }, [profile.subscription_status])

  const nextBillingDate = useMemo(
    () => formatPeriodEnd(profile.current_period_end),
    [profile.current_period_end],
  )

  const canManageBilling = Boolean(profile.stripe_customer_id)
  const premiumNow = profile.is_premium || isPremiumStatus(profile.subscription_status)

  async function handleCheckout(plan: 'monthly' | 'six_month') {
    try {
      setActiveAction(plan)
      setMessage(null)
      await startBillingFlow('/api/stripe/checkout', { plan })
    } catch (error) {
      console.error(error)
      setMessage(
        error instanceof Error ? error.message : 'We could not start checkout right now.',
      )
    } finally {
      setActiveAction(null)
    }
  }

  async function handlePortal() {
    try {
      setActiveAction('portal')
      setMessage(null)
      await startBillingFlow('/api/stripe/portal')
    } catch (error) {
      console.error(error)
      setMessage(
        error instanceof Error ? error.message : 'We could not open billing management right now.',
      )
    } finally {
      setActiveAction(null)
    }
  }

  return (
    <section className="rounded-3xl border border-green-200 bg-white p-6 shadow-sm md:col-span-2 md:p-7">
      <div className="flex flex-col gap-2 border-b border-green-100 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Billing</h2>
          <p className="text-sm text-gray-600">
            Start a subscription in Stripe Checkout and manage it later in the Billing Portal.
          </p>
        </div>
        <div className="rounded-xl bg-green-50 px-3 py-2 text-xs text-green-800">
          {premiumNow ? 'Premium access enabled' : 'Currently on free access'}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-green-100 bg-linear-to-br from-green-50 via-white to-emerald-50 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-green-600 p-3 text-white shadow-sm">
              <IconSparkles size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Tummer Premium</p>
              <p className="text-sm text-gray-600">
                Unlock paid access and keep billing managed entirely through Stripe.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleCheckout('monthly')}
              disabled={activeAction !== null}
              className="inline-flex items-center justify-center rounded-2xl bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {activeAction === 'monthly' ? <IconLoader2 className="mr-2 animate-spin" size={18} /> : null}
              Upgrade Monthly
            </button>

            <button
              type="button"
              onClick={() => handleCheckout('six_month')}
              disabled={activeAction !== null}
              className="inline-flex items-center justify-center rounded-2xl border border-green-200 bg-white px-5 py-3 text-sm font-semibold text-green-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-green-400 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {activeAction === 'six_month' ? <IconLoader2 className="mr-2 animate-spin" size={18} /> : null}
              Upgrade 6 Months
            </button>
          </div>

          <button
            type="button"
            onClick={handlePortal}
            disabled={activeAction !== null || !canManageBilling}
            className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-gray-200 bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activeAction === 'portal' ? <IconLoader2 className="mr-2 animate-spin" size={18} /> : <IconCreditCard className="mr-2" size={18} />}
            Manage Billing
          </button>

          {!canManageBilling ? (
            <p className="mt-3 text-xs text-gray-500">
              Billing management becomes available after your first completed checkout.
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-green-100 bg-gray-50/80 p-5">
          <p className="text-sm font-semibold text-gray-900">Subscription status</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-gray-500">Status</dt>
              <dd className="font-medium capitalize text-gray-900">{statusLabel}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-gray-500">Premium</dt>
              <dd className="font-medium text-gray-900">{premiumNow ? 'Yes' : 'No'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-gray-500">Price ID</dt>
              <dd className="max-w-[12rem] truncate font-medium text-gray-900">
                {profile.subscription_price_id ?? 'Not set'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-gray-500">Current period end</dt>
              <dd className="text-right font-medium text-gray-900">{nextBillingDate}</dd>
            </div>
          </dl>
        </div>
      </div>

      {message ? (
        <div className="mt-5">
          <Callout.Root color="red">
            <Callout.Icon>
              <IconInfoCircle />
            </Callout.Icon>
            <Callout.Text>{message}</Callout.Text>
          </Callout.Root>
        </div>
      ) : null}
    </section>
  )
}
