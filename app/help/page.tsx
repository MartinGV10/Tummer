import Link from 'next/link'
import type { Metadata } from 'next'
import { IconExternalLink, IconFileText, IconLifebuoy, IconMail, IconShieldCheck } from '@tabler/icons-react'
import Footer from '../Footer'
import HelpPageNav from '../components/HelpPageNav'

export const metadata: Metadata = {
  title: 'Help | Tummer',
  description: 'Contact support and access Terms of Service and Privacy Policy information for Tummer.',
}

const helpCards = [
  {
    title: 'Email Support',
    description: 'Get help with account issues, bugs, password trouble, or general questions.',
    body: 'If something is not working the way you expect, send a support email with a short description of the issue and any helpful screenshots or details.',
    href: 'mailto:martinganen10@gmail.com',
    cta: 'Email Support',
    badge: 'Support',
    icon: IconMail,
    external: true,
  },
  {
    title: 'Terms of Service',
    description: 'Review the main rules, disclaimers, and usage terms for Tummer.',
    body: 'This page explains the terms that apply when using the app, including general service rules and health-related disclaimers.',
    href: '/terms',
    cta: 'View Terms',
    badge: 'Legal',
    icon: IconFileText,
    external: false,
  },
  {
    title: 'Privacy Policy',
    description: 'Understand how account, health, and community data are handled.',
    body: 'This page explains what information Tummer collects, how it is used, and how sensitive health-related information is treated.',
    href: '/privacy',
    cta: 'View Privacy',
    badge: 'Privacy',
    icon: IconShieldCheck,
    external: false,
  },
]

export default function HelpPage() {
  return (
    <>
      <HelpPageNav />
      <div className="min-h-screen bg-gray-100 px-4 py-10 md:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <section className="rounded-3xl border border-green-100 bg-linear-to-r from-green-50 via-white to-emerald-50 p-6 shadow-sm md:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-green-600 p-3 text-white shadow-md">
                <IconLifebuoy size={28} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-700">Help</p>
                <h1 className="mt-2 text-3xl font-medium tracking-tight text-gray-900">Help and Support</h1>
                <p className="mt-2 max-w-3xl text-sm text-gray-600">
                  Find support contact options and quick links to the legal pages that explain how Tummer works and
                  handles your information.
                </p>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {helpCards.map((card) => {
              const Icon = card.icon

              return (
                <section key={card.title} className="rounded-3xl border border-green-200 bg-white p-6 shadow-sm md:p-7">
                  <div className="border-b border-green-100 pb-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-green-50 p-3 text-green-700">
                        <Icon size={22} />
                      </div>
                      <div>
                        <span className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-800">
                          {card.badge}
                        </span>
                        <h2 className="mt-2 text-xl font-semibold text-gray-900">{card.title}</h2>
                        <p className="mt-1 text-sm text-gray-600">{card.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex h-[calc(100%-8rem)] flex-col justify-between gap-4">
                    <p className="text-sm text-gray-600">{card.body}</p>

                    {card.external ? (
                      <a
                        href={card.href}
                        className="inline-flex items-center justify-center rounded-xl border border-green-200 bg-white px-5 py-2.5 text-sm font-medium text-green-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-green-400 hover:bg-green-50"
                      >
                        {card.cta}
                        <IconExternalLink size={16} className="ml-2" />
                      </a>
                    ) : (
                      <Link
                        href={card.href}
                        className="inline-flex items-center justify-center rounded-xl border border-green-200 bg-white px-5 py-2.5 text-sm font-medium text-green-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-green-400 hover:bg-green-50"
                      >
                        {card.cta}
                      </Link>
                    )}
                  </div>
                </section>
              )
            })}
          </div>

          <section className="rounded-3xl border border-green-200 bg-white p-6 shadow-sm md:p-7">
            <h2 className="text-xl font-semibold text-gray-900">Before you email support</h2>
            <p className="mt-2 text-sm text-gray-600">
              Including a little context can help us figure things out faster.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-green-100 bg-green-50/50 px-4 py-4 text-sm text-gray-700">
                Mention the page or feature where the issue happened.
              </div>
              <div className="rounded-2xl border border-green-100 bg-green-50/50 px-4 py-4 text-sm text-gray-700">
                Describe what you expected to happen and what happened instead.
              </div>
              <div className="rounded-2xl border border-green-100 bg-green-50/50 px-4 py-4 text-sm text-gray-700">
                Include screenshots or timing details if they help explain the issue.
              </div>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </>
  )
}
