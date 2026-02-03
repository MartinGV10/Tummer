import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const suapabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl) {
    throw new Error('Missing url')
}

if (!suapabasePublishableKey) {
    throw new Error('Missing key')
}

export const supabase = createClient(supabaseUrl, suapabasePublishableKey)