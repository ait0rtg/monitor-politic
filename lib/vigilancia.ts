import xml2js from 'xml2js'
import { supabaseAdmin } from './supabase'
import { analitzaDocument } from './openai'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ca-ES,ca;q=0.9,es;q=0.8',
}

// ── Aplica regles fixes sobre la classificació de la IA ────────
function aplicaReglesUrgencia(item: {
  classificacio: string; venciment?: string | null; import_detectat?: number | null; font: string; tipus: string
}) {
  let { classificacio } = item

  if (item.venciment) {
    const dies = Math.floor((new Date(item.venciment).getTime() - Date.now()) / 86400000)
    if (dies >= 0 && dies < 15) classificacio = 'URGENT'
  }
  if ((item.import_detectat || 0) > 50000 && classificacio === 'INFORMATIU') classificacio = 'IMPORTANT'
  if (item.font.includes('Contractant') && classificacio === 'INFORMATIU') classificacio = 'IMPORTANT'
  if (item.tipus === 'PDF' && item.font.includes('Acords') && classificacio === 'INFORMATIU') classificacio = 'IMPORTANT'

  return classificacio
}

// ── Extreu text net d'un HTML ──────────────────────────────────
function extractText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim()
}

// ── Obté URLs ja processades ───────────────────────────────────
async function getUrlsGuardades(): Promise<Set<string>> {
  const { data } = await supabaseAdmin
    .from('documents')
    .select('url_original')
    .limit(10000)
  return new Set((data || []).map((d: { url_original: string }) => d.url_original))
}

// ── Processa un element nou ────────────────────────────────────
async function processaElement(item: {
  url: string; titol: string; font: string; tipus: string
  numero_bpm?: string; area_bpm?: string; nom_interessat?: string
}) {
  // Content fetching
  let contingut = ''
  let confianca: 'ALTA' | 'MITJA' | 'BAIXA' = 'BAIXA'

  try {
    const res = await fetch(item.url, { headers: HEADERS, signal: AbortSignal.timeout(20000) })
    const html = await res.text()
    contingut = extractText(html).substring(0, 6000)
    confianca = contingut.length > 500 ? 'ALTA' : contingut.length > 100 ? 'MITJA' : 'BAIXA'
  } catch { /* continua amb confiança BAIXA */ }

  // Anàlisi IA
  const ia = await analitzaDocument({
    font: item.font, titol: item.titol, tipus: item.tipus, contingut: contingut || item.titol
  })

  // Regles fixes
  const classificacioFinal = aplicaReglesUrgencia({
    classificacio: ia.urgencia || 'INFORMATIU',
    venciment: ia.venciment ? ia.venciment.split('/').reverse().join('-') : null,
    import_detectat: ia.import_detectat,
    font: item.font, tipus: item.tipus
  })

  // Guarda a Supabase
  const { error } = await supabaseAdmin.from('documents').upsert({
    url_original: item.url,
    font: item.font,
    tipus: item.tipus,
    tipus_document: ia.tipus_document,
    titol: item.titol.substring(0, 300),
    contingut_complet: contingut || null,
    resum: ia.resum,
    classificacio: classificacioFinal,
    nivell_confianca: confianca,
    venciment: ia.venciment ? ia.venciment.split('/').reverse().join('-') : null,
    import_detectat: ia.import_detectat || null,
    tema_principal: ia.tema_principal,
    proposta_accio: ia.proposta_accio || null,
    pregunta_ple_suggerida: ia.pregunta_ple_suggerida || null,
    requereix_revisio_manual: confianca === 'BAIXA',
    numero_bpm: item.numero_bpm || null,
    area_bpm: item.area_bpm || null,
    nom_interessat: item.nom_interessat || null,
  }, { onConflict: 'url_original', ignoreDuplicates: true })

  if (error) console.error('Error guardant document:', error)
  return { classificacio: classificacioFinal, resum: ia.resum, titol: item.titol, font: item.font, confianca, url: item.url, venciment: ia.venciment }
}

// ── FONT 1: E-tauler RSS ───────────────────────────────────────
export async function fetchEtauler(urlsGuardades: Set<string>) {
  const nous: { url: string; titol: string; font: string; tipus: string }[] = []
  try {
    const res = await fetch('https://tauler.seu-e.cat/rss?idEns=1704860009', { headers: HEADERS })
    const xml = await res.text()
    const parsed = await xml2js.parseStringPromise(xml)
    const items = parsed?.rss?.channel?.[0]?.item || []
    for (const item of items) {
      const url = item.link?.[0]?.trim()
      const titol = item.title?.[0]?.trim() || 'Sense títol'
      if (url && !urlsGuardades.has(url)) nous.push({ url, titol, font: 'E-tauler Anuncis', tipus: 'edicte' })
    }
  } catch (e) { console.error('Error E-tauler:', e) }
  return nous
}

// ── FONT 2: Contractant API Dades Obertes ─────────────────────
export async function fetchContractant(urlsGuardades: Set<string>) {
  const nous: { url: string; titol: string; font: string; tipus: string }[] = []
  try {
    const url = `https://analisi.transparenciacatalunya.cat/resource/ybgg-dgi6.json?$where=nom_organ_contractacio=%27Ajuntament%20de%20Castell-Platja%20d%27Aro%27&$order=data_publicacio%20DESC&$limit=20`
    const res = await fetch(url, { headers: HEADERS })
    const data = await res.json()
    for (const item of data) {
      const urlDoc = item.url_perfil || item.link || ''
      if (!urlDoc || urlsGuardades.has(urlDoc)) continue
      nous.push({
        url: urlDoc,
        titol: (item.objecte_contracte || item.titol || 'Contracte').substring(0, 200),
        font: 'Perfil Contractant',
        tipus: item.tipus_tramit || 'contracte'
      })
    }
  } catch (e) { console.error('Error Contractant:', e) }
  return nous
}

// ── FONT 3: Acords JGL (scraping directe) ────────────────────
export async function fetchAcordsJGL(urlsGuardades: Set<string>) {
  const nous: { url: string; titol: string; font: string; tipus: string }[] = []
  try {
    const res = await fetch(
      'https://ciutada.platjadaro.com/ajuntament/organitzacio-municipal/junta-de-govern/acords-de-junta-de-govern/',
      { headers: HEADERS }
    )
    const html = await res.text()
    const pdfRegex = /href=["']([^"']*\.pdf[^"']*?)["']/gi
    let match
    while ((match = pdfRegex.exec(html)) !== null) {
      let url = match[1].trim()
      if (url.startsWith('/')) url = 'https://ciutada.platjadaro.com' + url
      if (!url.startsWith('http') || urlsGuardades.has(url)) continue
      nous.push({ url, titol: 'Acords JGL - ' + url.split('/').pop()!, font: 'Acords Junta Govern', tipus: 'PDF' })
    }
  } catch (e) { console.error('Error Acords JGL:', e) }
  return nous
}

// ── FONT 4: BPM Decrets ────────────────────────────────────────
export async function fetchBPMDecrets(urlsGuardades: Set<string>) {
  const nous: { url: string; titol: string; font: string; tipus: string; numero_bpm?: string }[] = []
  try {
    const res = await fetch('https://bpm.platjadaro.cat/OAC/SegExpStandalone.jsp?idioma=ca', { headers: HEADERS })
    const html = await res.text()
    // Cerca links a downloadR (PDFs de decrets)
    const regex = /href=["'](https?:\/\/bpm\.platjadaro\.cat\/OAC\/downloadR\/[a-f0-9-]+)["'][^>]*>([^<]*Veure[^<]*)<\/a>/gi
    const numsRegex = /(\d{4}DECR\d{6})/g
    const nums = [...html.matchAll(numsRegex)].map(m => m[1])
    let match; let idx = 0
    while ((match = regex.exec(html)) !== null) {
      const url = match[1]
      if (urlsGuardades.has(url)) { idx++; continue }
      nous.push({ url, titol: `Decret ${nums[idx] || 'BPM'}`, font: 'Decrets Alcaldia', tipus: 'PDF', numero_bpm: nums[idx] || undefined })
      idx++
    }
  } catch (e) { console.error('Error BPM Decrets:', e) }
  return nous
}

// ── FONT 5: BPM Registre Entrada ──────────────────────────────
export async function fetchBPMRegistre(urlsGuardades: Set<string>) {
  const nous: { url: string; titol: string; font: string; tipus: string; numero_bpm?: string; nom_interessat?: string; area_bpm?: string }[] = []
  try {
    const res = await fetch('https://bpm.platjadaro.cat/OAC/SegExpStandalone.jsp?idioma=ca', { headers: HEADERS })
    const html = await res.text()
    // Extreu files de registre
    const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi
    const linkRegex = /href=["'](https?:\/\/bpm\.platjadaro\.cat\/OAC\/downloadR\/[a-f0-9-]+)["']/i
    const numRegex = /(E\d{13})/
    let row
    while ((row = rowRegex.exec(html)) !== null) {
      const linkMatch = row[0].match(linkRegex)
      const numMatch = row[0].match(numRegex)
      if (!linkMatch) continue
      const url = linkMatch[1]
      if (urlsGuardades.has(url)) continue
      const text = extractText(row[0]).substring(0, 200)
      nous.push({
        url, titol: text || 'Registre entrada', font: 'Registre Entrada', tipus: 'document',
        numero_bpm: numMatch?.[1] || undefined
      })
    }
  } catch (e) { console.error('Error BPM Registre:', e) }
  return nous
}

// ── EXECUCIÓ PRINCIPAL ─────────────────────────────────────────
export async function executaVigilancia(torn: 'mati' | 'tarda' | 'manual') {
  const { data: execucio } = await supabaseAdmin
    .from('execucions').insert({ torn, estat: 'en_curs' }).select().single()

  const urlsGuardades = await getUrlsGuardades()
  const errors: string[] = []
  const processed: Awaited<ReturnType<typeof processaElement>>[] = []

  // Recull de tots els elements nous
  const [etauler, contractant, acords, decrets, registre] = await Promise.allSettled([
    fetchEtauler(urlsGuardades),
    fetchContractant(urlsGuardades),
    fetchAcordsJGL(urlsGuardades),
    fetchBPMDecrets(urlsGuardades),
    fetchBPMRegistre(urlsGuardades),
  ])

  const tous = [
    ...(etauler.status === 'fulfilled' ? etauler.value : (errors.push('E-tauler'), [])),
    ...(contractant.status === 'fulfilled' ? contractant.value : (errors.push('Contractant'), [])),
    ...(acords.status === 'fulfilled' ? acords.value : (errors.push('Acords JGL'), [])),
    ...(decrets.status === 'fulfilled' ? decrets.value : (errors.push('Decrets'), [])),
    ...(registre.status === 'fulfilled' ? registre.value : (errors.push('Registre'), [])),
  ].filter(item => !urlsGuardades.has(item.url))

  console.log(`[Vigilancia] ${tous.length} nous elements detectats`)

  // Processa en lots de 5 per no saturar OpenAI
  for (let i = 0; i < Math.min(tous.length, 15); i++) {
    try {
      const result = await processaElement(tous[i])
      processed.push(result)
      await new Promise(r => setTimeout(r, 500)) // rate limit
    } catch (e) {
      errors.push(`Error processant ${tous[i].url}: ${e}`)
    }
  }

  // Actualitza log
  await supabaseAdmin.from('execucions').update({
    fi: new Date().toISOString(),
    total_detectats: tous.length,
    total_nous: processed.length,
    urgents: processed.filter(d => d.classificacio === 'URGENT').length,
    importants: processed.filter(d => d.classificacio === 'IMPORTANT').length,
    informatius: processed.filter(d => d.classificacio === 'INFORMATIU').length,
    errors: errors,
    estat: 'completat',
  }).eq('id', execucio?.id)

  return { processed, errors, torn }
}
