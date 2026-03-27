import Link from 'next/link'
import {
  IconArrowRight,
  IconCompass,
  IconHeartPause,
  IconLeaf,
  IconNotebook,
  IconStethoscope,
  IconTrendingUp,
  IconUsersGroup,
} from '@tabler/icons-react'
import Nav from './Nav'
import Footer from './Footer'

const featureCards = [
  {
    title: 'Track meals without friction',
    description: 'Log meals, ingredients, and food reactions in a flow that is fast enough to keep up with daily life.',
    icon: IconNotebook,
  },
  {
    title: 'Spot patterns in symptoms',
    description: 'Capture daily health signals like symptoms, bowel changes, hydration, stress, energy, and flare days.',
    icon: IconHeartPause,
  },
  {
    title: 'Turn logs into useful insight',
    description: 'Use your history to notice what tends to help, what tends to trigger symptoms, and what deserves closer attention.',
    icon: IconTrendingUp,
  },
]

const supportCards = [
  {
    title: 'Condition-aware guidance',
    description: 'Explore supportive education shaped around digestive conditions and the realities of symptom management.',
    icon: IconStethoscope,
  },
  {
    title: 'Personalized direction',
    description: 'Build a clearer picture of your own tolerances so your next decision is based on more than guesswork.',
    icon: IconCompass,
  },
  {
    title: 'Community support',
    description: 'Connect with others managing similar conditions and learn from shared questions, experiences, and routines.',
    icon: IconUsersGroup,
  },
]

const plans = [
  {
    name: 'Free',
    price: '$0',
    cadence: '/month',
    description: 'The essentials for building a better daily record.',
    features: ['Meal tracking', 'Health logging', 'Food tolerance notes', 'Daily journal entries'],
    cta: 'Start Free',
    href: '/signup',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$10',
    cadence: '/month',
    description: 'More context and insight for people who want deeper patterns.',
    features: ['Everything in Free', 'Expanded insights', 'Macro tracking', 'Data export tools'],
    cta: 'Choose Pro',
    href: '/signup',
    highlighted: false,
  },
  {
    name: 'Max',
    price: '$50',
    cadence: '/6 months',
    description: 'A longer-term plan for users committed to sustained tracking.',
    features: ['Everything in Pro', 'Discounted long-term pricing', 'Deeper trend visibility', 'Priority email support'],
    cta: 'Choose Max',
    href: '/signup',
    highlighted: true,
  },
]

export default function Home() {
  return (
    <>
      <Nav />
      <div className="bg-[radial-gradient(circle_at_top_left,_rgba(187,247,208,0.7),_transparent_36%),linear-gradient(to_bottom,_#f7fdf8,_#f3f4f6)]">
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-12 pt-8 md:px-6 md:pb-16 md:pt-10">
          <section className="overflow-hidden rounded-[2rem] border border-green-200 bg-white shadow-[0_24px_80px_-40px_rgba(22,101,52,0.45)]">
            <div className="grid grid-cols-1 gap-10 px-6 py-8 md:px-8 md:py-10 xl:grid-cols-[1.15fr_0.85fr] xl:px-12 xl:py-12">
              <div className="flex flex-col justify-center">
                <span className="inline-flex w-fit items-center rounded-full border border-green-200 bg-green-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-green-800">
                  Built for digestive health tracking
                </span>
                <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-gray-950 md:text-5xl xl:text-6xl">
                  Turn meals, symptoms, and daily choices into patterns you can actually use.
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-8 text-gray-600 md:text-lg">
                  Tummer helps you track what you eat, how you feel, and what changes over time so you can make more
                  confident decisions with less guesswork.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center rounded-2xl bg-green-600 px-6 py-3 text-base font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-green-700"
                  >
                    Start for Free
                    <IconArrowRight size={18} className="ml-2" />
                  </Link>
                  <Link
                    href="/help"
                    className="inline-flex items-center justify-center rounded-2xl border border-green-200 bg-white px-6 py-3 text-base font-semibold text-green-800 transition-all hover:-translate-y-0.5 hover:border-green-400 hover:bg-green-50"
                  >
                    See How It Works
                  </Link>
                </div>

                <div className="mt-8 flex flex-wrap gap-3 text-sm text-gray-700">
                  <span className="rounded-full bg-gray-100 px-3 py-1.5">Always free to start</span>
                  <span className="rounded-full bg-gray-100 px-3 py-1.5">No credit card required</span>
                  <span className="rounded-full bg-gray-100 px-3 py-1.5">Designed for real daily use</span>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 rounded-[2rem] bg-linear-to-br from-green-200/70 via-emerald-100/40 to-transparent blur-2xl" />
                <div className="relative rounded-[2rem] border border-green-100 bg-linear-to-br from-green-50 via-white to-emerald-50 p-5 shadow-inner md:p-6">
                  <div className="rounded-[1.5rem] border border-white/80 bg-white/90 p-5 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Today&apos;s snapshot</p>
                        <p className="text-xs text-gray-500">A calmer way to see what changed</p>
                      </div>
                      <div className="rounded-2xl bg-green-600 p-3 text-white shadow-md">
                        <IconLeaf size={22} />
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-green-100 bg-green-50/70 p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Meals logged</p>
                        <p className="mt-2 text-3xl font-semibold text-gray-900">4</p>
                      </div>
                      <div className="rounded-2xl border border-green-100 bg-green-50/70 p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Symptom trend</p>
                        <p className="mt-2 text-3xl font-semibold text-gray-900">Down</p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-green-100 p-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-800">Most tolerated foods</span>
                        <span className="text-green-700">This week</span>
                      </div>
                      <div className="mt-4 space-y-3">
                        <div>
                          <div className="mb-1 flex items-center justify-between text-sm text-gray-600">
                            <span>White rice</span>
                            <span>92%</span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-100">
                            <div className="h-2 w-[92%] rounded-full bg-green-500" />
                          </div>
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between text-sm text-gray-600">
                            <span>Eggs</span>
                            <span>84%</span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-100">
                            <div className="h-2 w-[84%] rounded-full bg-emerald-500" />
                          </div>
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between text-sm text-gray-600">
                            <span>Greek yogurt</span>
                            <span>68%</span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-100">
                            <div className="h-2 w-[68%] rounded-full bg-lime-500" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-950">
                      Small entries add up. The goal is not perfect tracking, just clearer patterns over time.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {featureCards.map((card) => {
              const Icon = card.icon
              return (
                <div key={card.title} className="rounded-3xl border border-green-200 bg-white p-6 shadow-sm">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-700">
                    <Icon size={24} />
                  </div>
                  <h2 className="mt-5 text-xl font-semibold text-gray-900">{card.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-gray-600">{card.description}</p>
                </div>
              )
            })}
          </section>

          <section className="rounded-[2rem] border border-green-200 bg-linear-to-r from-green-100 via-green-50 to-emerald-100 px-6 py-8 shadow-sm md:px-8 md:py-10">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-800">Why it feels different</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-950 md:text-4xl">
                Built for people trying to understand their body, not just collect more data.
              </h2>
              <p className="mt-4 text-base leading-8 text-gray-700">
                Tummer is shaped around the everyday reality of digestive conditions: some days are predictable, some
                are not, and simple logs can become powerful when they stay consistent and easy to revisit.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
              {supportCards.map((card) => {
                const Icon = card.icon
                return (
                  <div key={card.title} className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-600 text-white shadow-md">
                      <Icon size={24} />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-gray-900">{card.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-gray-600">{card.description}</p>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="rounded-[2rem] border border-green-200 bg-white px-6 py-8 shadow-sm md:px-8 md:py-10">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-800">Plans</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">Start simple and upgrade when you need more</h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-gray-600">
                Start with the essentials, then move into deeper insights and longer-term tracking when it makes sense for you.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 xl:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`flex flex-col rounded-3xl border p-6 shadow-sm ${
                    plan.highlighted
                      ? 'border-green-500 bg-linear-to-b from-green-50 to-white shadow-[0_20px_60px_-35px_rgba(22,101,52,0.6)]'
                      : 'border-green-200 bg-gray-50/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-semibold text-gray-900">{plan.name}</h3>
                      <p className="mt-2 text-sm leading-7 text-gray-600">{plan.description}</p>
                    </div>
                    {plan.highlighted && (
                      <span className="rounded-full bg-green-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                        Popular
                      </span>
                    )}
                  </div>

                  <div className="mt-6">
                    <span className="text-4xl font-semibold text-gray-950">{plan.price}</span>
                    <span className="ml-1 text-base text-gray-500">{plan.cadence}</span>
                  </div>

                  <div className="mt-6 space-y-3 text-sm text-gray-700">
                    {plan.features.map((feature) => (
                      <div key={feature} className="rounded-2xl border border-green-100 bg-white px-4 py-3">
                        {feature}
                      </div>
                    ))}
                  </div>

                  <Link
                    href={plan.href}
                    className={`mt-6 inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition-all ${
                      plan.highlighted
                        ? 'bg-green-600 text-white shadow-md hover:-translate-y-0.5 hover:bg-green-700'
                        : 'border border-green-200 bg-white text-green-800 hover:-translate-y-0.5 hover:border-green-400 hover:bg-green-50'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-green-200 bg-gray-950 px-6 py-8 text-white shadow-sm md:px-8 md:py-10">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-300">Ready when you are</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight">Start building a record you can actually learn from.</h2>
                <p className="mt-4 text-sm leading-7 text-gray-300">
                  Whether you are tracking flares, testing meal patterns, or just trying to feel more in control, Tummer
                  gives you a cleaner place to start.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-2xl bg-green-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-green-400"
                >
                  Create an Account
                </Link>
                <Link
                  href="/help"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-white/10"
                >
                  Visit Help
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
      <Footer />
    </>
  )
}
