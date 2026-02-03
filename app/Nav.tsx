'use client'
import Link from 'next/link'
import React from 'react'
import classnames from 'classnames'
import { IconLeaf } from '@tabler/icons-react'

const Nav = () => {
  const links = [
    { label: 'Sign in', href: '/login'},
    { label: 'Begin Tracking', href: '/signup'},
    // { label: '', href: ''},
  ]
  return (
    // <nav className='sticky top-0 z-50 flex items-center justify-around p-6 text-l border-b-4 border-green-500 shadow-lg font-medium bg-white'>
    <nav className="
        sticky top-0 z-50 flex items-center justify-around p-6 text-l font-medium bg-white shadow-lg after:absolute after:bottom-0 after:left-0 after:h-1 after:w-full after:bg-linear-to-r after:from-green-400 after:via-emerald-400 after:to-green-600
      ">

      <Link href='/' className='text-2xl flex gap-2 font-medium items-center'>Tummer <IconLeaf size={30}></IconLeaf></Link>
      <ul className='space-x-6'>
        {links.map(link => <Link key={link.href} href={link.href} className={classnames({
          'bg-green-600 hover:bg-green-800 text-white': link.href === '/signup',
          'hover:text-green-800': link.href === '/login',
          'p-3 rounded-2xl transition-all text-black': true
        })}>{link.label}</Link>)}
      </ul>
    </nav>
  )
}

export default Nav