import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autoritzat' }, { status: 401 })

    const { data } = await supabase
      .from('assessor_sessions')
      .select('id, titol, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(20)

    return NextResponse.json({ sessions: data || [] })
  } catch {
    return NextResponse.json({ error: 'Error intern' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autoritzat' }, { status: 401 })

    const { missatges, titol, sessioId } = await req.json()

    if (sessioId) {
      // Actualitzar sessió existent
      const titolAuto = titol || (missatges[1]?.text?.slice(0, 50) + '...') || 'Conversa'
      const { data } = await supabase
        .from('assessor_sessions')
        .update({
          missatges,
          titol: titolAuto,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessioId)
        .eq('user_id', user.id)
        .select('id')
        .single()
      return NextResponse.json({ sessioId: data?.id })
    } else {
      // Nova sessió
      const titolAuto = missatges[1]?.text?.slice(0, 50) + '...' || 'Nova conversa'
      const { data } = await supabase
        .from('assessor_sessions')
        .insert({
          user_id: user.id,
          missatges,
          titol: titolAuto,
        })
        .select('id')
        .single()
      return NextResponse.json({ sessioId: data?.id })
    }
  } catch {
    return NextResponse.json({ error: 'Error intern' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autoritzat' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

    await supabase.from('assessor_sessions').delete().eq('id', id).eq('user_id', user.id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error intern' }, { status: 500 })
  }
}
