import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autoritzat' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    if (q.length < 3) return NextResponse.json({ documents: [] })

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data } = await admin
      .from('monitoratge')
      .select('id, titol, font, classificacio, resum, tema_principal')
      .or(`titol.ilike.%${q}%,resum.ilike.%${q}%,tema_principal.ilike.%${q}%`)
      .order('data_deteccio', { ascending: false })
      .limit(10)

    return NextResponse.json({ documents: data || [] })
  } catch (error) {
    return NextResponse.json({ error: 'Error intern' }, { status: 500 })
  }
}
