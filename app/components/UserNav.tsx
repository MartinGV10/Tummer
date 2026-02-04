'use client'
import React from 'react'
import { IconLeaf } from '@tabler/icons-react'
import Link from 'next/link'
import { Avatar, DropdownMenu } from '@radix-ui/themes'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

type Profile = {
  first_name: string
  last_name: string
  username: string
  reason: string | null
  avatar_url: string | null
}

type UserNavProps = {
    profile: Profile
}

const UserNav: React.FC<UserNavProps> = ({ profile }) => {
  const links = [
    { label: 'Track Meals', href: '/trackMeals'},
    { label: 'Track Bowels', href: '/trackBowels'},
    { label: 'Log Foods', href: '/log'},
    { label: 'Support', href: '/support'},
    { label: 'Community', href: '/community'},
  ]

  const router = useRouter()

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Logout error: ', error)
      return
    }

    router.replace('/')
  }

  return (
    <nav className="
        sticky top-0 z-50 flex items-center justify-around p-6 text-l font-medium bg-white shadow-lg after:absolute after:bottom-0 after:left-0 after:h-1 after:w-full after:bg-linear-to-r after:from-green-400 after:via-emerald-400 after:to-green-600
      ">

      <Link href='/dashboard' className='text-2xl flex gap-2 font-medium items-center'>Tummer <IconLeaf size={30}></IconLeaf></Link>

      <ul className='flex items-center justify-center gap-2'>
        {links.map(link => <Link key={link.href} href={link.href} className='
          cursor-pointer hover:text-green-800 transition-all p-3 rounded-2xl text-black
        '>{link.label}</Link>)}

        {/* {classnames({
          'bg-green-600 hover:bg-green-800 text-white': link.href === '/signup',
          'hover:text-green-800': link.href === '/login',
          'p-3 rounded-2xl transition-all text-black': true
        })} */}

        <div>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="rounded-full p-0 border-none bg-transparent cursor-pointer focus:outline-none">
                <Avatar
                  size="4"
                  radius="full"
                  src={profile.avatar_url ?? undefined}
                  fallback={profile.first_name[0]}
                  color="green"
                />
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Content>
              <DropdownMenu.Item>Settings</DropdownMenu.Item>
              <DropdownMenu.Item>Upgrade Plan</DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item>Help</DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item color="red" onSelect={(e) => {
                e.preventDefault()
                handleSignOut()
              }}>
                Logout
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>

      </ul>
    </nav>
  )
}

export default UserNav