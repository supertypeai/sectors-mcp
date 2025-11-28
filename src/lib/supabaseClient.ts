import { createClient } from '@supabase/supabase-js'

export function createSupabaseClient(env: any) {
  const supabaseUrl = env.SUPABASE_URL || ''
  const supabaseAnonKey = env.SUPABASE_ANON_KEY || ''
  
  return createClient(supabaseUrl, supabaseAnonKey)
}