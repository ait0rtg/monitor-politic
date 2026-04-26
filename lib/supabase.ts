import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Client-side (browser)
export const supabase = createClientComponentClient()

// Server-side (RSC, API routes)
export const createServerClient = () =>
  createServerComponentClient({ cookies })

// Service role (bypass RLS — only for cron/server jobs)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
