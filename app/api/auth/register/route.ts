import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { nom, email, password } = await req.json()

  if (!nom || !email || !password) {
    return NextResponse.json({ error: 'Falten camps obligatoris.' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nom },
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      return NextResponse.json({ error: 'Aquest email ja esta registrat.' }, { status: 409 })
    }
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  const { error: profileError } = await supabase
    .from('usuaris')
    .insert({
      id: authData.user.id,
      email,
      nom,
      role: 'user',
      aprovat: false,
    })

  if (profileError) {
    return NextResponse.json({ error: 'Error creant el perfil.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
