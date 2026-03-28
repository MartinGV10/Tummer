'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { IconDownload, IconLoader2 } from '@tabler/icons-react'
import { supabase } from '@/lib/supabaseClient'

type MonthlyReportButtonProps = {
  className?: string
  label?: ReactNode
}

export default function MonthlyReportButton({
  className = '',
  label = 'Download Monthly PDF',
}: MonthlyReportButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDownload() {
    try {
      setIsDownloading(true)
      setError(null)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('You must be signed in to download reports.')
      }

      const response = await fetch('/api/reports/monthly', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error ?? 'Could not generate the monthly report.')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `tummer-monthly-report-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(url)
    } catch (downloadError) {
      console.error(downloadError)
      setError(downloadError instanceof Error ? downloadError.message : 'Could not download the report.')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className={`flex flex-col items-start gap-2 ${className}`.trim()}>
      <button
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        className="inline-flex items-center justify-center rounded-full border border-green-200 bg-white px-4 py-2.5 text-sm font-semibold text-green-900 shadow-sm transition-all hover:-translate-y-0.5 hover:border-green-400 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isDownloading ? <IconLoader2 size={16} className="mr-2 animate-spin" /> : <IconDownload size={16} className="mr-2" />}
        {label}
      </button>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  )
}
