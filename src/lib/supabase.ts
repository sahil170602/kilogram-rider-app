import { createClient } from '@supabase/supabase-js'

// 🎯 Add a fallback string so the app doesn't crash if they are missing
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://missing.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'missing-key'

export const supabase = createClient(supabaseUrl, supabaseKey)