import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminSupabase } from '@supabase/supabase-js'

function getAdminClient() {
  return createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false } }
  )
}

function extractTag(xml: string, tag: string): string {
  const cdataMatch = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`))
  if (cdataMatch) return cdataMatch[1].trim()
  const plainMatch = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))
  if (plainMatch) return plainMatch[1].trim()
  return ''
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autoritzat' }, { status: 401 })

    const adminSupabase = getAdminClient()
    const log: string[] = []
    let nous = 0
    let actualitzats = 0
    let errors = 0

    // ── E-Tauler RSS ──────────────────────────────────────
    try {
      log.push('Iniciant E-Tauler RSS...')
      const res = await fetch(
        'https://tauler.seu-e.cat/api/rss?ens=1704860009&locale=ca&page=1',
        { headers: { 'User-Agent': 'MonitorPolitic/1.0' }, signal: AbortSignal.timeout(20000) }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const xml = await res.text()
      const regex = /<item>([\s\S]*?)<\/item>/g
      let match
      let count = 0

      while ((match = regex.exec(xml)) !== null) {
        const content = match[1]
        const titol = extractTag(content, 'title').trim()
        const url_original = (extractTag(content, 'link') || extractTag(content, 'guid')).trim()
        const dataStr = extractTag(content, 'pubDate')
        const descripcio = extractTag(content, 'description').replace(/<[^>]*>/g, '').trim()

        if (!url_original || !titol) continue
        count++

        const { error, data } = await adminSupabase.from('monitoratge')
          .upsert({
            titol: titol.slice(0, 300),
            resum: descripcio.slice(0, 500),
            font: 'E-Tauler',
            tipus_document: 'ANUNCI',
            classificacio: 'INFORMATIU',
            url_original,
            data_deteccio: new Date().toISOString(),
            data_publicacio: dataStr ? new Date(dataStr).toISOString() : new Date().toISOString(),
          }, { onConflict: 'url_original', ignoreDuplicates: false })
          .select('id')
          .single()

        if (error) {
          if (error.code === '23505') actualitzats++  // duplicate → ja existia
          else { errors++; log.push(`E-Tauler error: ${error.message}`) }
        } else {
          nous++
        }
      }
      log.push(`E-Tauler: ${count} items, ${nous} nous, ${actualitzats} ja existien`)
    } catch (e: any) {
      errors++
      log.push(`E-Tauler FALLIDA: ${e.message}`)
    }

    // ── Perfil Contractant ─────────────────────────────────
    let contractantNous = 0
    try {
      log.push('Iniciant Perfil Contractant...')
      const url = 'https://analisi.transparenciacatalunya.cat/resource/ybgg-dgi6.json?codi_ine=17034&$limit=30&$order=data_adjudicacio DESC'
      const res = await fetch(url, {
        headers: { 'User-Agent': 'MonitorPolitic/1.0' },
        signal: AbortSignal.timeout(20000)
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (!Array.isArray(data)) throw new Error('Resposta inesperada')

      for (const item of data) {
        const titol = (item.descripcio_contracte || item.objecte_contracte || 'Contracte').slice(0, 300)
        const importVal = parseFloat(item.import_adjudicacio || item.pressupost_licitacio || '0') || null
        const urlDoc = item.url_publicacio || `https://contractaciopublica.cat/ca/inici`
        const classificacio = importVal && importVal > 50000 ? 'URGENT'
          : importVal && importVal > 10000 ? 'IMPORTANT' : 'INFORMATIU'

        const { error } = await adminSupabase.from('monitoratge')
          .upsert({
            titol: titol.trim(),
            resum: `Empresa: ${item.nom_adjudicatari || 'pendent'} | Import: ${importVal ? importVal.toLocaleString('ca-ES') + '€' : 'pendent'}`,
            font: 'Perfil Contractant',
            tipus_document: 'CONTRACTE',
            classificacio,
            import_detectat: importVal,
            url_original: urlDoc,
            data_deteccio: new Date().toISOString(),
            data_publicacio: item.data_adjudicacio ? new Date(item.data_adjudicacio).toISOString() : new Date().toISOString(),
            tema_principal: 'contractació',
          }, { onConflict: 'url_original', ignoreDuplicates: true })

        if (!error) contractantNous++
      }
      log.push(`Contractant: ${contractantNous} processats`)
      nous += contractantNous
    } catch (e: any) {
      errors++
      log.push(`Contractant FALLIDA: ${e.message}`)
    }

    // ── Junta de Govern ────────────────────────────────────
    let juntaNous = 0
    try {
      log.push('Iniciant Junta de Govern...')
      const res = await fetch(
        'https://ciutada.platjadaro.com/wp-json/wp/v2/media?search=ACTA-JGL&per_page=20&mime_type=application/pdf&orderby=date&order=desc',
        { headers: { 'User-Agent': 'MonitorPolitic/1.0' }, signal: AbortSignal.timeout(20000) }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const items = await res.json()
      if (!Array.isArray(items)) throw new Error('Resposta inesperada')

      for (const item of items) {
        if (!item.source_url) continue
        const { error } = await adminSupabase.from('monitoratge')
          .upsert({
            titol: (item.title?.rendered || 'Acta JGL').replace(/&#(\d+);/g, '').trim().slice(0, 300),
            resum: `Acta de la Junta de Govern Local. Data: ${new Date(item.date).toLocaleDateString('ca-ES')}`,
            font: 'Junta de Govern',
            tipus_document: 'ACORD',
            classificacio: 'IMPORTANT',
            url_original: item.source_url,
            data_deteccio: new Date().toISOString(),
            data_publicacio: new Date(item.date).toISOString(),
            tema_principal: 'govern',
          }, { onConflict: 'url_original', ignoreDuplicates: true })

        if (!error) juntaNous++
      }
      log.push(`Junta Govern: ${juntaNous} processats`)
      nous += juntaNous
    } catch (e: any) {
      errors++
      log.push(`Junta Govern FALLIDA: ${e.message}`)
    }

    // ── BPM Decrets ────────────────────────────────────────
    let bpmNous = 0
    try {
      log.push('Iniciant BPM Decrets...')
      const any = new Date().getFullYear()
      const mes = String(new Date().getMonth() + 1).padStart(2, '0')
      const res = await fetch(
        `https://bpm.platjadaro.cat/OAC/exp/decrets/${any}/${mes}`,
        { headers: { 'User-Agent': 'MonitorPolitic/1.0' }, signal: AbortSignal.timeout(20000) }
      )

      if (res.ok) {
        const html = await res.text()
        const regex = /href="(\/OAC\/downloadR\/[a-f0-9-]{36})"[^>]*>([^<]+)</gi
        let match
        while ((match = regex.exec(html)) !== null) {
          const urlPath = match[1]
          const titol = match[2].trim().slice(0, 300)
          const urlDoc = `https://bpm.platjadaro.cat${urlPath}`
          if (!titol || titol.length < 3) continue

          const { error } = await adminSupabase.from('monitoratge')
            .upsert({
              titol,
              resum: `Decret d'Alcaldia: ${titol}`,
              font: 'BPM Decrets',
              tipus_document: 'DECRET',
              classificacio: 'INFORMATIU',
              url_original: urlDoc,
              data_deteccio: new Date().toISOString(),
              data_publicacio: new Date().toISOString(),
            }, { onConflict: 'url_original', ignoreDuplicates: true })

          if (!error) bpmNous++
        }
        log.push(`BPM Decrets: ${bpmNous} processats`)
        nous += bpmNous
      } else {
        log.push(`BPM Decrets: HTTP ${res.status} (pot ser normal si no hi ha decrets aquest mes)`)
      }
    } catch (e: any) {
      log.push(`BPM Decrets FALLIDA: ${e.message}`)
    }

    // ── Registrar sync al log ──────────────────────────────
    await adminSupabase.from('sync_log').insert({
      font: 'Manual',
      estat: errors > 0 ? 'error' : 'ok',
      nous_docs: nous,
      missatge: log.join(' | ')
    })

    return NextResponse.json({
      ok: true,
      nous,
      actualitzats,
      errors,
      log,
    })
  } catch (error: any) {
    console.error('Error scrapers:', error)
    return NextResponse.json({ error: error.message || 'Error intern' }, { status: 500 })
  }
}
