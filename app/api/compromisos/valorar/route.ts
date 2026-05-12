import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autoritzat' }, { status: 401 })

    const { compromis } = await req.json()

    const avui = new Date()
    const dataCompromis = new Date(compromis.data_compromis)
    const termini = compromis.termini_anunciat ? new Date(compromis.termini_anunciat) : null
    const diesTranscorreguts = Math.floor((avui.getTime() - dataCompromis.getTime()) / 86400000)
    const terminiVençut = termini ? avui > termini : false

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 300,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: `Ets un analista polític. Valora el grau de compliment d'aquest compromís municipal.

COMPROMÍS: ${compromis.titol}
DESCRIPCIÓ: ${compromis.descripcio || 'No especificada'}
ESTAT ACTUAL: ${compromis.estat}
DATA COMPROMÍS: ${compromis.data_compromis}
TERMINI ANUNCIAT: ${compromis.termini_anunciat || 'No especificat'}
DIES TRANSCORREGUTS: ${diesTranscorreguts}
TERMINI VENÇUT: ${terminiVençut ? 'Sí' : 'No'}
EVIDÈNCIA DE COMPLIMENT: ${compromis.evidencia_compliment || 'Cap evidència documentada'}

Respon NOMÉS en JSON:
{
  "percentatge": número del 0 al 100 (% de compliment realista),
  "analisi": "2-3 frases explicant la valoració de manera directa i crítica"
}`,
      }],
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')
    return NextResponse.json({
      percentatge: Math.max(0, Math.min(100, result.percentatge || 0)),
      analisi: result.analisi || '',
    })
  } catch (error) {
    console.error('Error valoració:', error)
    return NextResponse.json({ error: 'Error intern' }, { status: 500 })
  }
}
