import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // 🎯 CRITICAL: Disable for mobile
    storage: window.localStorage
  },
  global: {
    // 🎯 Use a native fetch headers fix
    headers: { 'x-application-name': 'kilo-rider' }
  }
})