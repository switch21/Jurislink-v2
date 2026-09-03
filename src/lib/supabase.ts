import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

let _supabase: SupabaseClient | null = null

/** Service-role client (bypasses RLS). Lazy-init to avoid crash when env vars are missing.
 *  NOTE: This module must only be imported server-side. It uses SUPABASE_SERVICE_ROLE_KEY.
 */
export function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase
  if (!supabaseUrl || !supabaseServiceKey) return null
  _supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
  return _supabase
}

/** Whether Supabase storage is available (env vars present). */
export function isStorageAvailable(): boolean {
  return !!(supabaseUrl && supabaseServiceKey)
}
