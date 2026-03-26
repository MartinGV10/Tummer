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
}

const ADSENSE_CLIENT = 'ca-pub-2129630041401316'

export default function AdSenseAd({
  slot,
  className = '',
  label = 'Sponsored',
}: AdSenseAdProps) {
  const adRef = useRef<HTMLModElement | null>(null)

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
    <div className={`overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm ${className}`.trim()}>
      <Script
        id="adsense-script"
        async
        strategy="afterInteractive"
        crossOrigin="anonymous"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      />

      <div className="border-b border-amber-100 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">{label}</p>
        <p className="mt-1 text-sm text-gray-600">Advertisement</p>
      </div>

      <div className="min-h-[150px] px-4 py-4">
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
