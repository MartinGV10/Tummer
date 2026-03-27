import Link from 'next/link'
import { IconCircleCheck, IconLeaf } from '@tabler/icons-react'

export default function BillingSuccessPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(187,247,208,0.7),_transparent_36%),linear-gradient(to_bottom,_#f7fdf8,_#f3f4f6)] px-4 py-10 md:px-6">
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-green-200 bg-white p-8 shadow-[0_24px_80px_-40px_rgba(22,101,52,0.45)]">
        <div className="flex items-center gap-3 text-green-700">
          <div className="rounded-2xl bg-green-100 p-3">
            <IconCircleCheck size={24} />
          </div>
          <div className="rounded-2xl bg-green-600 p-3 text-white">
            <IconLeaf size={24} />
          </div>
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-gray-950">
          Subscription started
        </h1>
        <p className="mt-3 text-base leading-8 text-gray-600">
          Your checkout is complete. Tummer will update your billing status as soon as Stripe finishes the webhook sync.
        </p>

        <div className="mt-6 rounded-2xl border border-green-100 bg-green-50/70 p-4 text-sm text-gray-700">
          If premium access does not appear immediately, give the webhook a moment and then refresh your settings page.
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/settings"
            className="inline-flex items-center justify-center rounded-2xl bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-green-700"
          >
            Back to Settings
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-2xl border border-green-200 bg-white px-6 py-3 text-sm font-semibold text-green-800 transition-all hover:-translate-y-0.5 hover:border-green-400 hover:bg-green-50"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
