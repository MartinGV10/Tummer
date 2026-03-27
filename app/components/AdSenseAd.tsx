'use client'

import { useEffect, useRef } from 'react'
import Script from 'next/script'

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

type AdSenseAdProps = {
  slot: string
  className?: string
  label?: string
  description?: string
  variant?: 'default' | 'community'
}

const ADSENSE_CLIENT = 'ca-pub-2129630041401316'

export default function AdSenseAd({
  slot,
  className = '',
  label = 'Sponsored',
  description = 'Advertisement',
  variant = 'default',
}: AdSenseAdProps) {
  const adRef = useRef<HTMLModElement | null>(null)

  const wrapperClassName =
    variant === 'community'
      ? 'overflow-hidden rounded-[28px] border border-green-200 bg-white shadow-sm transition-all hover:border-green-300 hover:shadow-md'
      : 'overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm'

  const headerClassName =
    variant === 'community'
      ? 'border-b border-green-100 px-5 py-4 sm:px-6'
      : 'border-b border-amber-100 px-4 py-3'

  const labelClassName =
    variant === 'community'
      ? 'text-[11px] font-semibold uppercase tracking-[0.18em] text-green-700'
      : 'text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700'

  const bodyClassName = variant === 'community' ? 'min-h-[140px] px-5 py-5 sm:px-6' : 'min-h-[150px] px-4 py-4'

  useEffect(() => {
    try {
      const current = adRef.current
      if (!current) return
      if (current.getAttribute('data-adsbygoogle-status')) return

      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (error) {
      console.error('AdSense ad failed to initialize:', error)
    }
  }, [slot])

  return (
    <div className={`${wrapperClassName} ${className}`.trim()}>
      <Script
        id="adsense-script"
        async
        strategy="afterInteractive"
        crossOrigin="anonymous"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      />

      <div className={headerClassName}>
        <p className={labelClassName}>{label}</p>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </div>

      <div className={bodyClassName}>
        <ins
          ref={adRef}
          className="adsbygoogle block min-h-[150px] w-full"
          style={{ display: 'block' }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  )
}
