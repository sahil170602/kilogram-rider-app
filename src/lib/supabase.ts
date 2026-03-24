// apps/rider-app/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 🎯 Add this check! If it's missing, the app will stay black.
if (!supabaseUrl || !supabaseKey) {
  console.error("SUPABASE CREDENTIALS MISSING!");
}

export const supabase = createClient(supabaseUrl, supabaseKey)