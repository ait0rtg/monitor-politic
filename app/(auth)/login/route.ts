import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { email, password } = await req.json()
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return NextResponse.json({ error: 'Credencials incorrectes.' }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
