'use client'

'use client'

import { useState } from 'react'
import Link from 'next/link'
import classNames from 'classnames'
import { IconArrowRight, IconLeaf, IconMenu2, IconX } from '@tabler/icons-react'

const links = [
  { label: 'Help', href: '/help', variant: 'secondary' as const },
  { label: 'Sign in', href: '/login', variant: 'secondary' as const },
  { label: 'Begin Tracking', href: '/signup', variant: 'primary' as const },
]

export default function Nav() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 border-b border-green-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-3 rounded-full border border-green-200 bg-white px-4 py-2 text-green-950 shadow-sm transition-all hover:-translate-y-0.5 hover:border-green-300 hover:bg-green-50"
        >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-green-500 to-emerald-600 text-white shadow-sm">
              <IconLeaf size={20} />
            </span>
          <span className="min-w-0">
            <span className="block text-lg font-semibold tracking-tight">Tummer</span>
            <span className="hidden text-xs uppercase tracking-[0.22em] text-green-700 sm:block">Digestive health tracking</span>
          </span>
        </Link>

        <button
          type="button"
          aria-label="Toggle menu"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          className="rounded-xl border border-green-300 p-2 text-green-800 transition-all hover:bg-green-50 md:hidden"
        >
          {isMobileMenuOpen ? <IconX size={20} /> : <IconMenu2 size={20} />}
        </button>

        <div className="hidden items-center gap-2 md:flex md:gap-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={classNames(
                'inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition-all md:px-5',
                {
                  'border border-green-200 bg-white text-green-900 shadow-sm hover:-translate-y-0.5 hover:border-green-400 hover:bg-green-50':
                    link.variant === 'secondary',
                  'bg-green-600 text-white shadow-md hover:-translate-y-0.5 hover:bg-green-700':
                    link.variant === 'primary',
                },
              )}
            >
              {link.label}
              {link.variant === 'primary' ? <IconArrowRight size={16} className="ml-2" /> : null}
            </Link>
          ))}
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="border-t border-green-100 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-2">
            {links.map((link) => (
              <Link
                key={`mobile-${link.href}`}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={classNames(
                  'inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition-all',
                  {
                    'border border-green-200 bg-white text-green-900 shadow-sm hover:border-green-400 hover:bg-green-50':
                      link.variant === 'secondary',
                    'bg-green-600 text-white shadow-md hover:bg-green-700':
                      link.variant === 'primary',
                  },
                )}
              >
                {link.label}
                {link.variant === 'primary' ? <IconArrowRight size={16} className="ml-2" /> : null}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
