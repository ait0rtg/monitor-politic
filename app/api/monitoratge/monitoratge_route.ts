import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { openai, buildAnalisiPrompt, parseAnalisiResponse } from '@/lib/openai'

const FONTS = [
  {
    nom: 'E-tauler Anuncis',
    url: 'https://tauler.seu-e.cat/rss?idEns=1704860009',
    tipus: 'rss',
  },
  {
    nom: 'Perfil Contractant',
    url: "https://analisi.transparenciacatalunya.cat/resource/ybgg-dgi6.json?$where=nom_organ_contractacio=%27Ajuntament%20de%20Castell-Platja%20d%27Aro%27&$order=data_publicacio%20DESC&$limit=10",
    tipus: 'api_json',
  },
  {
    nom: 'Acords Junta Govern',
    url: 'https://ciutada.platjadaro.com/ajuntament/organitzacio-municipal/junta-de-govern/acords-de-junta-de-govern/',
    tipus: 'html',
  },
]

async function fetchRSS(url: string, nom: string) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 Chrome/124.0.0.0' },
    signal: AbortSignal.timeout(20000),
  })
  const text = await res.text()
  const items: any[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let match
  while ((match = itemRegex.exec(text)) !== null) {
    const item = match[1]
    const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)
    const linkMatch = item.match(/<link>(.*?)<\/link>/)
    const descMatch = item.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)
    if (titleMatch && linkMatch) {
      items.push({
        titol: titleMatch[1].trim(),
        url: linkMatch[1].trim(),
        contingut: descMatch ? descMatch[1].replace(/<[^>]+>/g, ' ').trim().substring(0, 3000) : '',
        font: nom,
        tipus: 'edicte',
      })
    }
  }
  return items.slice(0, 5)
}

async function fetchAPIJson(url: string, nom: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
  const data = await res.json()
  if (!Array.isArray(data)) return []
  return data.slice(0, 5).map((item: any) => ({
    titol: item.objecte_contracte || item.titol || 'Contracte',
    url: item.url_perfil || item.enllac || url,
    contingut: JSON.stringify(item).substring(0, 3000),
    font: nom,
    tipus: 'contracte',
    import_detectat: parseFloat(item.valor_estimat_contracte || item.import_adjudicacio || '0') || null,
  }))
}

async function fetchHTML(url: string, nom: string) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 Chrome/124.0.0.0' },
    signal: AbortSignal.timeout(20000),
  })
  const text = await res.text()
  const items: any[] = []
  const pdfRegex = /href=["']([^"']*\.pdf[^"']*?)["']/gi
  let match
  const urlsVistes = new Set<string>()
  while ((match = pdfRegex.exec(text)) !== null) {
    let pdfUrl = match[1]
    if (pdfUrl.startsWith('/')) pdfUrl = 'https://ciutada.platjadaro.com' + pdfUrl
    if (!pdfUrl.startsWith('http') || urlsVistes.has(pdfUrl)) continue
    urlsVistes.add(pdfUrl)
    items.push({
      titol: pdfUrl.split('/').pop() || 'Document JGL',
      url: pdfUrl,
      contingut: '',
      font: nom,
      tipus: 'PDF',
    })
  }
  return items.slice(0, 5)
}

async function analitzaAmbIA(item: any) {
  try {
    let contingut = item.contingut || ''
    if (!contingut && item.url) {
      try {
        const res = await fetch(item.url, {
          headers: { 'User-Agent': 'Mozilla/5.0 Chrome/124.0.0.0' },
          signal: AbortSignal.timeout(15000),
        })
        const text = await res.text()
        contingut = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 5000)
      } catch { contingut = '' }
    }

    const confianca = contingut.length > 200 ? 'ALTA' : contingut.length > 50 ? 'MITJA' : 'BAIXA'
    const prompt = buildAnalisiPrompt(item.font, item.titol, item.tipus, contingut || item.titol)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 500,
      temperature: 0.2,
      messages: [
        { role: 'system', content: 'Ets l\'assistent d\'un regidor de l\'oposicio de Castell-Platja d\'Aro. Basa\'t EXCLUSIVAMENT en el text. Respon en catala.' },
        { role: 'user', content: prompt },
      ],
    })

    const content = completion.choices[0].message.content || ''
    const parsed = parseAnalisiResponse(content)
    return { ...parsed, nivell_confianca: confianca as 'ALTA' | 'MITJA' | 'BAIXA', contingut_complet: contingut }
  } catch (e) {
    return {
      classificacio: 'INFORMATIU' as const,
      nivell_confianca: 'BAIXA' as const,
      resum: 'No s\'ha pogut analitzar.',
      venciment: null,
      import_detectat: null,
      tema_principal: 'altres',
      proposta_accio: null,
      pregunta_ple_suggerida: null,
      per_a_l_oposicio: null,
      contingut_complet: '',
    }
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createAdminClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticat.' }, { status: 401 })

    const { data: existents } = await supabase
      .from('monitoratge')
      .select('url_original')
      .limit(5000)

    const urlsExistents = new Set((existents || []).map((e: any) => e.url_original))

    let totalNous = 0
    const resultats: any[] = []

    for (const font of FONTS) {
      try {
        let items: any[] = []
        if (font.tipus === 'rss') items = await fetchRSS(font.url, font.nom)
        else if (font.tipus === 'api_json') items = await fetchAPIJson(font.url, font.nom)
        else if (font.tipus === 'html') items = await fetchHTML(font.url, font.nom)

        const nous = items.filter(i => !urlsExistents.has(i.url))

        for (const item of nous) {
          const analisi = await analitzaAmbIA(item)

          const recordatori30 = new Date()
          recordatori30.setDate(recordatori30.getDate() + 30)
          const recordatori90 = new Date()
          recordatori90.setDate(recordatori90.getDate() + 90)
          const recordatori180 = new Date()
          recordatori180.setDate(recordatori180.getDate() + 180)

          const { error } = await supabase.from('monitoratge').insert({
            url_original: item.url,
            font: item.font,
            tipus: item.tipus,
            titol: item.titol,
            contingut_complet: analisi.contingut_complet,
            resum: analisi.resum,
            classificacio: analisi.classificacio,
            nivell_confianca: analisi.nivell_confianca,
            venciment: analisi.venciment,
            import_detectat: item.import_detectat || analisi.import_detectat,
            tema_principal: analisi.tema_principal,
            proposta_accio: analisi.proposta_accio,
            pregunta_ple_suggerida: analisi.pregunta_ple_suggerida,
            requereix_revisio_manual: analisi.nivell_confianca === 'BAIXA',
            estat_seguiment: 'pendent',
            estat: 'nou',
            recordatori_30d: recordatori30.toISOString().split('T')[0],
            recordatori_90d: recordatori90.toISOString().split('T')[0],
            recordatori_180d: recordatori180.toISOString().split('T')[0],
          })

          if (!error) {
            totalNous++
            resultats.push({ titol: item.titol, font: item.font, classificacio: analisi.classificacio })
          }
        }
      } catch (e) {
        console.error('Error font', font.nom, e)
      }
    }

    return NextResponse.json({ ok: true, nous: totalNous, resultats })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
