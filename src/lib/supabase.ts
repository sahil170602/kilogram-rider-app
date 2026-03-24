import { createClient } from '@supabase/supabase-js'

// 🎯 REPLACE THESE with your actual strings from the Supabase Dashboard
const supabaseUrl = 'https://wohlmirmfcvdoateryzc.supabase.co'
const supabaseKey = 'sb_publishable_hk-ZHS4PhdHoah2KqNQ0PQ_N6Nfcyrx' 

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: window.localStorage
  }
})