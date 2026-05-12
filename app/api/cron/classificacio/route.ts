import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/admin'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function classificaDocument(doc: { id: string; titol: string; resum?: string; font: string; tipus_document?: string }) {
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 200,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: `Classifica aquest document municipal de Castell-Platja d'Aro. Respon NOMÉS JSON.

FONT: ${doc.font}
TIPUS: ${doc.tipus_document || 'N/D'}
TÍTOL: ${doc.titol}
RESUM: ${doc.resum?.slice(0, 500) || '(sense resum)'}

{
  "urgencia": "URGENT" | "IMPORTANT" | "INFORMATIU",
  "tema_principal": "urbanisme" | "contractació" | "personal" | "serveis" | "pressupost" | "registre" | "govern" | "habitatge turístic" | "medi ambient" | "altres",
  "per_a_l_oposicio": "una frase breu sobre rellevància política o null"
}`,
      }],
    })
    return JSON.parse(res.choices[0].message.content || '{}')
  } catch {
    return null
  }
}

export async function GET(req: Request) {
  // Verificar secret
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autoritzat' }, { status: 401 })
  }

  const admin = getAdminClient()

  // Agafar els 20 documents més recents sense tema_principal
  const { data: pendents } = await admin
    .from('monitoratge')
    .select('id, titol, resum, font, tipus_document')
    .is('tema_principal', null)
    .order('data_deteccio', { ascending: false })
    .limit(20)

  if (!pendents || pendents.length === 0) {
    return NextResponse.json({ ok: true, processats: 0, missatge: 'Cap document pendent de classificar' })
  }

  let processats = 0
  let errors = 0

  for (const doc of pendents) {
    const ia = await classificaDocument(doc)
    if (!ia) { errors++; continue }

    const update: any = { tema_principal: ia.tema_principal }
    // Només sobreescriure classificacio si el document era INFORMATIU (no reclassifiquem els urgents manuals)
    if (ia.urgencia) update.classificacio = ia.urgencia
    if (ia.per_a_l_oposicio) update.per_a_l_oposicio = ia.per_a_l_oposicio

    await admin.from('monitoratge').update(update).eq('id', doc.id)
    processats++

    // Pausa per no saturar l'API d'OpenAI
    await new Promise(r => setTimeout(r, 300))
  }

  console.log(`[CLASSIFICACIÓ] ${processats} processats, ${errors} errors de ${pendents.length} pendents`)

  return NextResponse.json({
    ok: true,
    processats,
    errors,
    pendents_restants: pendents.length - processats,
  })
}
