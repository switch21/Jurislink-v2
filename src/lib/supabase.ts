import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

let _supabase: SupabaseClient | null = null
let _supabaseAuth: SupabaseClient | null = null

/** Service-role client (bypasses RLS). Lazy-init to avoid crash when env vars are missing. */
export function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase
  if (!supabaseUrl || !supabaseServiceKey) return null
  _supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
  return _supabase
}

/** Anon client for client-side operations. */
export function getSupabaseAuth(): SupabaseClient | null {
  if (_supabaseAuth) return _supabaseAuth
  if (!supabaseUrl || !supabaseAnonKey) return null
  _supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  })
  return _supabaseAuth
}

/** Whether Supabase storage is available (env vars present). */
export function isStorageAvailable(): boolean {
  return !!(supabaseUrl && supabaseServiceKey)
}
