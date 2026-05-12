import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function getAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false } }
  )
}

// Extreu text d'un PDF via URL sense llibreries externes
// Usa l'API de files d'OpenAI per processar el contingut
async function extractTextFromPDF(url: string): Promise<string> {
  try {
    // Descarregar el PDF
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MonitorPolitic/1.0' },
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const buffer = await res.arrayBuffer()
    const bytes = new Uint8Array(buffer)

    // Extracció bàsica de text pla dels PDFs (sense librerires)
    // Buscar strings llegibles entre els bytes del PDF
    const decoder = new TextDecoder('utf-8', { fatal: false })
    const raw = decoder.decode(bytes)

    // Extreure text entre parenèsis (format PDF estàndard)
    const textMatches = raw.match(/\(([^)]{3,200})\)/g) || []
    const text = textMatches
      .map(m => m.slice(1, -1))
      .filter(t => /[a-zA-ZàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞŸa-zA-Z]/.test(t))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4000)

    return text || ''
  } catch (e: any) {
    console.error('Error extraient PDF:', e.message)
    return ''
  }
}

async function analitzaTextAmbIA(titol: string, text: string): Promise<any> {
  if (!text || text.length < 50) return null

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 500,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: `Analitza aquest document municipal de Castell-Platja d'Aro i respon NOMÉS en JSON:

TÍTOL: ${titol}
TEXT: ${text.slice(0, 3000)}

{
  "urgencia": "URGENT" | "IMPORTANT" | "INFORMATIU",
  "resum": "2-3 línies del contingut real del document",
  "import_detectat": number o null,
  "venciment": "YYYY-MM-DD o null",
  "tema_principal": "urbanisme"|"contractació"|"personal"|"serveis"|"pressupost"|"registre"|"govern"|"altres",
  "per_a_l_oposicio": "rellevància política basada en el contingut"
}`,
      }],
    })
    return JSON.parse(res.choices[0].message.content || '{}')
  } catch {
    return null
  }
}

// POST /api/pdf — processa un document per URL
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autoritzat' }, { status: 401 })

    const { id, url, titol } = await req.json()
    if (!id || !url) return NextResponse.json({ error: 'Falten id i url' }, { status: 400 })

    const text = await extractTextFromPDF(url)
    if (!text) return NextResponse.json({ ok: false, missatge: 'No s\'ha pogut extreure text' })

    const ia = await analitzaTextAmbIA(titol, text)
    const admin = getAdminSupabase()

    const update: any = {
      contingut_complet: text.slice(0, 8000),
      pdf_processat: true,
    }
    if (ia?.resum) update.resum = ia.resum
    if (ia?.urgencia) update.classificacio = ia.urgencia
    if (ia?.import_detectat) update.import_detectat = ia.import_detectat
    if (ia?.venciment) update.venciment = ia.venciment
    if (ia?.tema_principal) update.tema_principal = ia.tema_principal
    if (ia?.per_a_l_oposicio) update.per_a_l_oposicio = ia.per_a_l_oposicio

    await admin.from('monitoratge').update(update).eq('id', id)

    return NextResponse.json({ ok: true, text_length: text.length, ia })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET /api/pdf/batch — processa tots els PDFs no processats
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autoritzat' }, { status: 401 })
  }

  const admin = getAdminSupabase()

  const { data: pendents } = await admin
    .from('monitoratge')
    .select('id, titol, url_original, font')
    .eq('pdf_processat', false)
    .in('font', ['BPM Decrets', 'Junta de Govern'])
    .limit(20)

  if (!pendents?.length) return NextResponse.json({ ok: true, processats: 0 })

  let processats = 0
  for (const doc of pendents) {
    if (!doc.url_original?.includes('.pdf') &&
        !doc.url_original?.includes('/downloadR/') &&
        !doc.url_original?.includes('ACTA')) {
      await admin.from('monitoratge').update({ pdf_processat: true }).eq('id', doc.id)
      continue
    }

    const text = await extractTextFromPDF(doc.url_original)
    if (text && text.length > 100) {
      const ia = await analitzaTextAmbIA(doc.titol, text)
      const update: any = { contingut_complet: text.slice(0, 8000), pdf_processat: true }
      if (ia?.resum) update.resum = ia.resum
      if (ia?.urgencia) update.classificacio = ia.urgencia
      if (ia?.import_detectat) update.import_detectat = ia.import_detectat
      if (ia?.tema_principal) update.tema_principal = ia.tema_principal
      if (ia?.per_a_l_oposicio) update.per_a_l_oposicio = ia.per_a_l_oposicio
      await admin.from('monitoratge').update(update).eq('id', doc.id)
      processats++
    } else {
      await admin.from('monitoratge').update({ pdf_processat: true }).eq('id', doc.id)
    }

    // Pausa per no saturar
    await new Promise(r => setTimeout(r, 500))
  }

  return NextResponse.json({ ok: true, processats, total: pendents.length })
}
