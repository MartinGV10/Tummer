'use client'
import Link from 'next/link'
import React from 'react'

const Nav = () => {
  const links = [
    { label: 'Begin Tracking', href: '/signup'},
    // { label: '', href: ''},
  ]
  return (
    <nav className='sticky top-0 z-50 flex items-center justify-around p-6 bg-green-500 text-white font-bold text-xl'>
      <Link href='/' className='text-2xl'>Tummer</Link>
      <ul className=''>
        {links.map(link => <Link key={link.href} href={link.href} className='bg-green-700 hover:bg-green-800 p-3 rounded-2xl'>{link.label}</Link>)}
      </ul>
    </nav>
  )
}

export default Nav