'use client'
import React, { useState } from 'react'
import { IconLeaf, IconMenu2, IconX } from '@tabler/icons-react'
import Link from 'next/link'
import { Avatar, DropdownMenu } from '@radix-ui/themes'
import { supabase } from '@/lib/supabaseClient'
import { usePathname } from 'next/navigation'
import { useProfile } from '@/src/context/ProfileContext'

// type Profile = {
//   first_name: string
//   last_name: string
//   username: string
//   reason: string | null
//   avatar_url: string | null
// }

// type UserNavProps = {
//     profile: Profile
// }

// const UserNav: React.FC<UserNavProps> = ({ profile }) => {
const UserNav = () => {
  const { profile } = useProfile()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  if (!profile) {
    return null
  }

  const links = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Track Meals', href: '/trackMeals'},
    { label: 'Log Health', href: '/logHealth'},
    { label: 'Log Foods', href: '/log'},
    { label: 'Support', href: '/support'},
    { label: 'Community', href: '/community'},
  ]

  const isActivePath = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Logout error: ', error)
      return
    }

    window.location.assign('/')
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-green-200 bg-white/95 shadow-lg backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href="/dashboard" className="text-xl md:text-2xl flex items-center gap-2 font-semibold tracking-tight text-green-900">
          Tummer <IconLeaf size={28} />
        </Link>

        <button
          type="button"
          aria-label="Toggle menu"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          className="rounded-xl border border-green-300 p-2 text-green-800 transition-all hover:bg-green-50 md:hidden"
        >
          {isMobileMenuOpen ? <IconX size={20} /> : <IconMenu2 size={20} />}
        </button>

        <ul className="hidden items-center justify-center gap-1 md:flex lg:gap-2">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition-all hover:-translate-y-0.5 ${
                  isActivePath(link.href)
                    ? 'text-white bg-green-600 shadow-sm'
                    : 'text-gray-800 hover:bg-green-50 hover:text-green-900'
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden md:block">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <button className="rounded-full p-0 border-none bg-transparent cursor-pointer focus:outline-none">
                <Avatar
                  size="4"
                  radius="full"
                  src={profile.avatar_url ?? undefined}
                  fallback={profile.first_name[0]}
                  color="green"
                  className="border-2 border-green-600"
                />
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Content>
              <DropdownMenu.Item asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item>Upgrade Plan</DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item>
                <Link href='/help'>Help</Link>
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item
                color="red"
                onSelect={(e) => {
                  e.preventDefault()
                  handleSignOut()
                }}
              >
                Logout
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="border-t border-green-100 bg-white px-4 py-3 md:hidden">
          <ul className="flex flex-col gap-2">
            {links.map((link) => (
              <li key={`mobile-${link.href}`}>
                <Link
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                    isActivePath(link.href)
                      ? 'border border-green-700 bg-green-600 text-white'
                      : 'border border-green-100 text-gray-800 hover:bg-green-50'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/settings"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block rounded-xl border border-green-100 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-green-50"
              >
                Settings
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full rounded-xl border border-red-200 px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Logout
              </button>
            </li>
          </ul>
        </div>
      )}
    </nav>
  )
}

export default UserNav
