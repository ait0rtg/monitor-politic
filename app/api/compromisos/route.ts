import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autoritzat' }, { status: 401 })

    const body = await req.json()
    const { data, error } = await supabase.from('compromisos').insert({
      titol: body.titol,
      descripcio: body.descripcio || null,
      font_compromis: body.font_compromis || 'manual',
      data_compromis: body.data_compromis,
      termini_anunciat: body.termini_anunciat || null,
      tema: body.tema || null,
      estat: body.estat || 'pendent',
      created_by: user.id,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Error intern' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autoritzat' }, { status: 401 })

    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

    const { error } = await supabase.from('compromisos')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (error) {
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

    const { error } = await supabase.from('compromisos').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error intern' }, { status: 500 })
  }
}
