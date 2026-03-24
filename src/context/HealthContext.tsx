'use client'
import { supabase } from '@/lib/supabaseClient'
import React, { useCallback, useEffect, useRef, useState } from 'react'

export type Daily = {
  id: string
  user_id: string
  log_date: string
  overall_feeling: number | null
  stress_level: number | null
  energy_level: number | null
  sleep_hours: number | null
  hydration_level: number | null
  weight: number | null
  flare_day: boolean | null
  period_day: boolean | null
  medication_changes: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Symptom = {
  id: string
  daily_log_id: string
  symptom_name: string
  severity: number | null
  notes: string | null
  created_at: string
}


export type Bowel = {
  id: string
  daily_log_id: string
  occurred_at: string
  bristol_type: number | null
  urgency_level: number | null
  blood_present: boolean | null
  mucus_present: boolean | null
  notes: string | null
}

type HealthContextType = {
  daily: Daily | null
  symptoms: Symptom[]
  bowels: Bowel[]
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  refreshHealth: (opts?: { logDate?: string | Date }) => Promise<void>
  upsertDaily: (data: {
    logDate?: string | Date
    overall_feeling?: number | null
    stress_level?: number | null
    energy_level?: number | null
    sleep_hours?: number | null
    hydration_level?: number | null
    weight?: number | null
    flare_day?: boolean | null
    period_day?: boolean | null
    medication_changes?: string | null
    notes?: string | null
    created_at?: string
    updated_at?: string
  }) => Promise<Daily | null>
  addSymptom: (data: {
    daily_log_id?: string
    symptom_name: string
    severity?: number | null
    notes?: string | null
  }) => Promise<Symptom | null>
  updateSymptom: (id: string, data: {
    symptom_name: string
    severity?: number | null
    notes?: string | null
  }) => Promise<Symptom | null>
  deleteSymptom: (id: string) => Promise<boolean>
  addBowel: (data: {
    daily_log_id?: string
    occurred_at?: string | Date
    bristol_type?: number | null
    urgency_level?: number | null
    blood_present?: boolean | null
    mucus_present?: boolean | null
    notes?: string | null
  }) => Promise<Bowel | null>
  updateBowel: (id: string, data: {
    occurred_at?: string | Date
    bristol_type?: number | null
    urgency_level?: number | null
    blood_present?: boolean | null
    mucus_present?: boolean | null
    notes?: string | null
  }) => Promise<Bowel | null>
  deleteBowel: (id: string) => Promise<boolean>
}

const HealthContext = React.createContext<HealthContextType | null>(null)

function formatDate(d: string | Date): string {
  if (d instanceof Date) return d.toISOString().slice(0, 10)
  return d.length > 10 ? d.slice(0, 10): d
}

export function HealthProvider({ children } : { children: React.ReactNode }) {
  const [daily, setDaily] = useState<Daily | null>(null)
  const [symptoms, setSymptoms] = useState<Symptom[]>([])
  const [bowels, setBowels] = useState<Bowel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const currentUserIdRef = useRef<string | null>(null)

  const loadInitialData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setIsAuthenticated(false)
        setUserId(null)
        currentUserIdRef.current = null
        setDaily(null)
        setSymptoms([])
        setBowels([])
        return
      }

      setIsAuthenticated(true)
      setUserId(session.user.id)
      currentUserIdRef.current = session.user.id

      await refreshHealthInternal(session.user.id)
    } catch (err) {
      console.error('Unexpected error loading health data:', err)
      setError('An unexpected error occurred while loading your health data')
      setIsAuthenticated(false)
      setUserId(null)
      currentUserIdRef.current = null
      setDaily(null)
      setSymptoms([])
      setBowels([])
    } finally {
      setLoading(false)
    }
  }, []) 

  useEffect(() => {
    loadInitialData()

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        if (currentUserIdRef.current === null) return
        setIsAuthenticated(false)
        setUserId(null)
        currentUserIdRef.current = null
        setDaily(null)
        setSymptoms([])
        setBowels([])
        setError(null)
        setLoading(false)
        return
      }

      if (session.user.id !== currentUserIdRef.current || event === 'USER_UPDATED') {
        void loadInitialData()
      }
    })

    return () => {
      data?.subscription?.unsubscribe()
    }
  }, [loadInitialData])

  const refreshHealthInternal = useCallback(
    async (uid: string, logDate?: string | Date) => {
      const dateStr = formatDate(logDate ?? new Date())
      setError(null)

      // fetch daily stuff
      const { data: dailyRow, error: dailyError } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', uid)
        .eq('log_date', dateStr)
        .maybeSingle()

      if (dailyError && dailyError.code !== 'PGRST116') {
        setError(dailyError.message)
        setDaily(null)
        setSymptoms([])
        setBowels([])
        return
      }

      if (!dailyRow) {
        setDaily(null)
        setSymptoms([])
        setBowels([])
        return
      }

      setDaily(dailyRow as Daily)

      // fetch symptoms
      const { data: symptomRows, error: symptomError } = await supabase
        .from('symptom_entries')
        .select('*')
        .eq('daily_log_id', dailyRow.id)
        .order('created_at', { ascending: false })
      
      if (symptomError) {
        setError(symptomError.message)
        setSymptoms([])
      }
      else {
        setSymptoms((symptomRows || []) as Symptom[])
      }

      const { data: bowelRows, error: bowelError } = await supabase
        .from('bowel_entries')
        .select('*')
        .eq('daily_log_id', dailyRow.id)
        .order('occurred_at', { ascending: false })

      if (bowelError) {
        setError(bowelError.message)
        setBowels([])
      }
      else {
        setBowels((bowelRows || []) as Bowel[])
      }
    },
    []
  )

  const refreshHealth: HealthContextType['refreshHealth'] = useCallback(
    async ({ logDate } = {}) => {
      if (!userId) return
      await refreshHealthInternal(userId, logDate)
    }, [userId, refreshHealthInternal]
  )

  const upsertDaily: HealthContextType['upsertDaily'] = useCallback(
    async ({
      logDate,
      overall_feeling,
      stress_level,
      energy_level,
      sleep_hours,
      hydration_level,
      weight,
      flare_day,
      period_day,
      medication_changes,
      notes,
    }) => {
      if (!userId) {
        setError('User not authenticated')
        return null
      }

      setError(null)
      const dateStr = formatDate(logDate ?? new Date())

      const payload: any = {
        user_id: userId,
        log_date: dateStr,
        overall_feeling,
        stress_level,
        energy_level,
        sleep_hours,
        hydration_level,
        weight,
        flare_day,
        period_day,
        medication_changes,
        notes,
      }

      Object.keys(payload).forEach(
        (key) => payload[key] === undefined && delete payload[key]
      )

      const { data, error } = await supabase
        .from('daily_logs')
        .upsert(payload, { onConflict: 'user_id,log_date' })
        .select('*')
        .single()

      if (error) {
        setError(error.message)
        return null
      }

      setDaily(data as Daily)
      return data as Daily
    }, [userId]
  )

  const addSymptom: HealthContextType['addSymptom'] = useCallback(
    async ({ daily_log_id, symptom_name, severity = null, notes = null }) => {
      if (!daily_log_id && !daily?.id) {
        setError('No daily log selected')
        return null
      }

      setError(null)
      const logId = daily_log_id ?? daily!.id

      const { data, error } = await supabase
        .from('symptom_entries')
        .insert({
          daily_log_id: logId,
          symptom_name,
          severity,
          notes
        })
        .select('*')
        .single()

      if (error) {
        setError(error.message)
        return null
      }

      setSymptoms((prev) => [data as Symptom, ...prev])
      return data as Symptom
    }, [daily]
  )

  const addBowel: HealthContextType['addBowel'] = useCallback(
    async ({
      daily_log_id,
      occurred_at,
      bristol_type = null,
      urgency_level = null,
      blood_present = null,
      mucus_present = null,
      notes = null,
    }) => {
      if (!daily_log_id && !daily?.id) {
        setError('No daily log selected')
        return null
      }

      setError(null)
      const logId = daily_log_id ?? daily!.id

      const payload: any = {
        daily_log_id: logId,
        bristol_type,
        urgency_level,
        blood_present,
        mucus_present,
        notes,
      }

      if (occurred_at instanceof Date) {
        payload.occurred_at = occurred_at.toISOString()
      } else if (typeof occurred_at === 'string') {
        payload.occurred_at = occurred_at
      }

      const { data, error } = await supabase
        .from('bowel_entries')
        .insert(payload)
        .select('*')
        .single()

      if (error) {
        setError(error.message)
        return null
      }

      setBowels((prev) => [data as Bowel, ...prev])
      return data as Bowel
    }, [daily]
  )
  const updateSymptom: HealthContextType['updateSymptom'] = useCallback(
    async (id, { symptom_name, severity = null, notes = null }) => {
      setError(null)

      const { data, error } = await supabase
        .from('symptom_entries')
        .update({
          symptom_name,
          severity,
          notes,
        })
        .eq('id', id)
        .select('*')
        .single()

      if (error) {
        setError(error.message)
        return null
      }

      setSymptoms((prev) => prev.map((s) => (s.id === id ? (data as Symptom) : s)))
      return data as Symptom
    },
    []
  )

  const updateBowel: HealthContextType['updateBowel'] = useCallback(
    async (
      id,
      {
        occurred_at,
        bristol_type = null,
        urgency_level = null,
        blood_present = null,
        mucus_present = null,
        notes = null,
      }
    ) => {
      setError(null)

      const payload: any = {
        bristol_type,
        urgency_level,
        blood_present,
        mucus_present,
        notes,
      }

      if (occurred_at instanceof Date) {
        payload.occurred_at = occurred_at.toISOString()
      } else if (typeof occurred_at === 'string') {
        payload.occurred_at = occurred_at
      } else if (occurred_at === undefined) {
        payload.occurred_at = null
      }

      const { data, error } = await supabase
        .from('bowel_entries')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single()

      if (error) {
        setError(error.message)
        return null
      }

      setBowels((prev) => prev.map((b) => (b.id === id ? (data as Bowel) : b)))
      return data as Bowel
    },
    []
  )

  const deleteSymptom: HealthContextType['deleteSymptom'] = useCallback(
    async (id) => {
      setError(null)
      const { error } = await supabase
        .from('symptom_entries')
        .delete()
        .eq('id', id)

      if (error) {
        setError(error.message)
        return false
      }

      setSymptoms((prev) => prev.filter((s) => s.id !== id))
      return true
    },
    []
  )

  const deleteBowel: HealthContextType['deleteBowel'] = useCallback(
    async (id) => {
      setError(null)
      const { error } = await supabase
        .from('bowel_entries')
        .delete()
        .eq('id', id)

      if (error) {
        setError(error.message)
        return false
      }

      setBowels((prev) => prev.filter((b) => b.id !== id))
      return true
    },
    []
  )

  const value: HealthContextType = {
    daily,
    symptoms,
    bowels,
    loading,
    error,
    isAuthenticated,
    refreshHealth,
    upsertDaily,
    addSymptom,
    addBowel,
    updateSymptom,
    updateBowel,
    deleteSymptom,
    deleteBowel,
  }

  return (
    <HealthContext.Provider value={value}>
      {children}
    </HealthContext.Provider>
  )
}

export function useHealth() {
  const ctx = React.useContext(HealthContext)
  if (!ctx) {
    throw new Error('useHealth must be used within a HealthProvider')
  }
  return ctx
}

export default HealthContext

