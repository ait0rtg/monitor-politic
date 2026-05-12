import { createClient } from '@supabase/supabase-js'

/**
 * Client admin de Supabase — bypassa RLS completament.
 * Usar NOMÉS en Server Components i API Routes de confiança.
 * Mai en Client Components.
 */
export function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false } }
  )
}
