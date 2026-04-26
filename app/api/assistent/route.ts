import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai, SYSTEM_PROMPT_ASSISTENT, buildAssistentPrompt } from '@/lib/openai'

export async function POST(req: Request) {
  const { pregunta, idioma = 'ca' } = await req.json()

  if (!pregunta?.trim()) {
    return NextResponse.json({ error: 'La pregunta és obligatòria.' }, { status: 400 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticat.' }, { status: 401 })

  // Search relevant documents using full-text search
  const { data: documents } = await supabase
    .from('monitoratge')
    .select('titol, resum, font, data_deteccio, url_original, import_detectat, venciment, tema_principal, classificacio')
    .textSearch('fts', pregunta.split(' ').join(' | '), { config: 'simple' })
    .limit(20)

  const { data: expedients } = await supabase
    .from('expedients_bpm')
    .select('numero, titol, contingut, assumpte, data, font, url_document, tema')
    .textSearch('fts', pregunta.split(' ').join(' | '), { config: 'simple' })
    .limit(15)

  // Build context string
  const contextDocs = (documents || []).map(d =>
    `[${d.font} — ${d.data_deteccio?.split('T')[0]}]\nTítol: ${d.titol}\nResum: ${d.resum || 'Sense resum'}\nImport: ${d.import_detectat ? d.import_detectat + '€' : 'No detectat'}\nVenciment: ${d.venciment || 'Cap'}\nURL: ${d.url_original}`
  ).join('\n\n---\n\n')

  const contextBPM = (expedients || []).map(e =>
    `[BPM ${e.font} — ${e.data}]\nNúm: ${e.numero}\nAssumpte: ${e.assumpte || ''}\nContingut: ${e.contingut || ''}\nURL: ${e.url_document || ''}`
  ).join('\n\n---\n\n')

  const context = [contextDocs, contextBPM].filter(Boolean).join('\n\n=== BPM ===\n\n')

  if (!context.trim()) {
    return NextResponse.json({
      resum_executiu: 'No s\'han trobat documents relacionats amb aquesta consulta a la base de dades.',
      antecedents: 'Cap document trobat.',
      acords_vigents: 'Cap acord trobat.',
      imports_contractes: 'Cap import detectat.',
      vulnerabilitats: 'No es pot analitzar sense context.',
      preguntes_suggerides: ['Comprova si el tema existeix a les fonts monitoritzades.'],
      documents_font: [],
    })
  }

  const systemPrompt = idioma === 'es'
    ? SYSTEM_PROMPT_ASSISTENT.replace('en català', 'en castellà')
    : SYSTEM_PROMPT_ASSISTENT

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 2000,
    temperature: 0.2,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: buildAssistentPrompt(pregunta, context) },
    ],
  })

  const content = completion.choices[0].message.content || ''

  // Parse structured response
  const sections = parseAssistentResponse(content)

  const allDocs = [
    ...(documents || []).map(d => ({ titol: d.titol, url: d.url_original })),
    ...(expedients || []).map(e => ({ titol: `${e.numero} — ${e.assumpte || e.titol}`, url: e.url_document || '' })),
  ]

  return NextResponse.json({ ...sections, documents_font: allDocs.slice(0, 15) })
}

function parseAssistentResponse(content: string) {
  const extract = (from: string, to?: string) => {
    const pattern = to
      ? new RegExp(`${from}:\\s*([\\s\\S]+?)(?=${to}:|$)`)
      : new RegExp(`${from}:\\s*([\\s\\S]+?)$`)
    return content.match(pattern)?.[1]?.trim() || ''
  }

  const preguntesMatch = content.match(/PREGUNTES SUGGERIDES:\s*([\s\S]+?)(?=DOCUMENTS FONT:|$)/)
  const preguntesText = preguntesMatch?.[1] || ''
  const preguntes = preguntesText
    .split('\n')
    .filter(l => l.match(/^\d+\./))
    .map(l => l.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean)

  return {
    resum_executiu: extract('RESUM EXECUTIU', 'ANTECEDENTS'),
    antecedents: extract('ANTECEDENTS I HISTORIAL', 'ACORDS VIGENTS'),
    acords_vigents: extract('ACORDS VIGENTS', 'IMPORTS'),
    imports_contractes: extract('IMPORTS I CONTRACTES', 'VULNERABILITATS'),
    vulnerabilitats: extract('VULNERABILITATS DEL GOVERN', 'PREGUNTES'),
    preguntes_suggerides: preguntes.length ? preguntes : ['Cap pregunta generada.'],
  }
}
