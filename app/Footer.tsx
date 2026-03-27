import Link from 'next/link'
import { IconBrandGithub, IconBrandLinkedin, IconLeaf, IconMail } from '@tabler/icons-react'

const productLinks = [
  { label: 'Sign up', href: '/signup' },
  { label: 'Log in', href: '/login' },
  { label: 'Help', href: '/help' },
]

const legalLinks = [
  { label: 'Terms', href: '/terms' },
  { label: 'Privacy', href: '/privacy' },
]

const socialLinks = [
  { label: 'GitHub', href: 'https://github.com/MartinGV10', icon: IconBrandGithub },
  { label: 'LinkedIn', href: 'https://linkedin.com/in/martin-ganen/', icon: IconBrandLinkedin },
  { label: 'Email', href: 'mailto:martinganen10@gmail.com', icon: IconMail },
]

export default function Footer() {
  return (
    <footer className="border-t border-green-200 bg-[radial-gradient(circle_at_top_left,_rgba(187,247,208,0.4),_transparent_30%),linear-gradient(to_bottom,_#f7fdf8,_#eff6f1)]">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6 md:py-12">
        <div className="rounded-[2rem] border border-green-200 bg-white/85 p-6 shadow-sm backdrop-blur-sm md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-green-950">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white shadow-sm">
                  <IconLeaf size={20} />
                </span>
                <span>
                  <span className="block text-lg font-semibold tracking-tight">Tummer</span>
                  <span className="block text-xs uppercase tracking-[0.22em] text-green-700">Built for real daily tracking</span>
                </span>
              </div>

              <p className="mt-5 max-w-md text-sm leading-7 text-gray-600">
                A calmer place to log meals, symptoms, and health patterns so small daily entries can turn into useful insight over time.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-2xl bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-green-700"
                >
                  Begin Tracking
                </Link>
                <Link
                  href="/help"
                  className="inline-flex items-center justify-center rounded-2xl border border-green-200 bg-white px-5 py-3 text-sm font-semibold text-green-800 transition-all hover:-translate-y-0.5 hover:border-green-400 hover:bg-green-50"
                >
                  Get Support
                </Link>
              </div>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-1">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-green-700">Explore</h2>
                <div className="mt-4 flex flex-col gap-3">
                  {productLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-sm text-gray-700 transition-all hover:text-green-700"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-green-700">Legal</h2>
                <div className="mt-4 flex flex-col gap-3">
                  {legalLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-sm text-gray-700 transition-all hover:text-green-700"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-green-700">Creator</h2>
              <p className="mt-4 text-sm leading-7 text-gray-600">
                Made by a Crohn&apos;s patient with a focus on making health tracking feel more supportive and less overwhelming.
              </p>

              <div className="mt-5 flex items-center gap-3">
                {socialLinks.map((link) => {
                  const Icon = link.icon

                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={link.label}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-green-200 bg-white text-green-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-green-400 hover:bg-green-50"
                    >
                      <Icon size={20} />
                    </a>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-2 border-t border-green-100 pt-6 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">
            <p>Made by a Crohn&apos;s patient.</p>
            <p>&copy; Tummer {new Date().getFullYear()}</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
