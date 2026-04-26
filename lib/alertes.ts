import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
})

// ── Envia email de resum a TOTS els usuaris aprovats ───────────
export async function enviaEmailResum(params: {
  destinataris: string[]
  torn: 'mati' | 'tarda'
  documents: Array<{
    titol: string; font: string; resum: string; classificacio: string
    url_original: string; nivell_confianca: string; venciment?: string
  }>
}) {
  const { destinataris, torn, documents } = params
  const data = new Date().toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  const tornText = torn === 'mati' ? 'Matí' : 'Tarda'

  const urgents = documents.filter(d => d.classificacio === 'URGENT')
  const importants = documents.filter(d => d.classificacio === 'IMPORTANT')
  const informatius = documents.filter(d => d.classificacio === 'INFORMATIU')

  const renderGroup = (docs: typeof documents, color: string, emoji: string, label: string) => {
    if (!docs.length) return ''
    return `
    <h3 style="color:${color};border-bottom:2px solid ${color};padding-bottom:4px">${emoji} ${label} (${docs.length})</h3>
    ${docs.map(d => `
    <div style="border-left:4px solid ${color};padding:12px 16px;margin:12px 0;background:#fafafa;border-radius:0 8px 8px 0">
      <strong style="font-size:15px">${d.titol}</strong><br>
      <span style="color:#666;font-size:13px">${d.font} · Fiabilitat: ${d.nivell_confianca}</span>
      ${d.venciment ? `<br><span style="color:#c0392b;font-weight:bold">⏰ Venciment: ${d.venciment}</span>` : ''}
      <p style="margin:8px 0;line-height:1.5">${d.resum}</p>
      <a href="${d.url_original}" style="color:#185FA5;text-decoration:none;font-size:13px">→ Veure document original</a>
    </div>`).join('')}`
  }

  const html = `
  <!DOCTYPE html><html><head><meta charset="utf-8"></head>
  <body style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:20px;color:#333">
    <div style="background:#0C447C;padding:20px;border-radius:8px;margin-bottom:24px">
      <h1 style="color:white;margin:0;font-size:22px">📋 Monitor Polític Municipal</h1>
      <p style="color:#B5D4F4;margin:4px 0 0">${data} · ${tornText} · ${documents.length} novetats · Castell-Platja d'Aro</p>
    </div>
    ${renderGroup(urgents, '#c0392b', '🔴', 'URGENT')}
    ${renderGroup(importants, '#e67e22', '🟡', 'IMPORTANT')}
    ${renderGroup(informatius, '#27ae60', '🟢', 'INFORMATIU')}
    <div style="margin-top:32px;padding:12px;background:#f0f0f0;border-radius:8px;font-size:12px;color:#666;text-align:center">
      Monitor Polític Municipal · Ajuntament de Castell-Platja d'Aro
    </div>
  </body></html>`

  await transporter.sendMail({
    from: `"Monitor Polític" <${process.env.EMAIL_USER}>`,
    to: destinataris.join(','),
    subject: `Monitor Polític ${data} — ${tornText} — ${documents.length} novetats`,
    html,
  })
}

// ── Alerta de nou usuari pendent (a admin) ─────────────────────
export async function alertaUsuariPendent(params: { nom: string; email: string }) {
  await transporter.sendMail({
    from: `"Monitor Polític" <${process.env.EMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL!,
    subject: `Nou usuari pendent de validació: ${params.nom}`,
    html: `<p>L'usuari <strong>${params.nom}</strong> (${params.email}) s'ha registrat i espera aprovació.</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/usuaris">Accedir al panell d'admin</a></p>`,
  })
}

// ── Telegram: resum agrupat i alertes individuals (ADMIN ONLY) ──
export async function enviaTelegram(missatge: string) {
  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_ADMIN_CHAT_ID,
      text: missatge,
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
    }),
  })
}

export function buildMissatgeTelegram(params: {
  torn: string
  documents: Array<{
    titol: string; font: string; resum: string; classificacio: string
    url_original: string; nivell_confianca: string; venciment?: string
  }>
}): string {
  const { torn, documents } = params
  const esc = (t: string) => t.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&')
  const data = new Date().toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  const urgents = documents.filter(d => d.classificacio === 'URGENT')
  const importants = documents.filter(d => d.classificacio === 'IMPORTANT')
  const informatius = documents.filter(d => d.classificacio === 'INFORMATIU')

  const conf = (c: string) => c === 'ALTA' ? '✅' : c === 'MITJA' ? '⚠️' : '❌'
  const fmtDoc = (d: typeof documents[0]) =>
    `• *${esc(d.titol.substring(0, 65))}* ${conf(d.nivell_confianca)}\n_${esc(d.font)}_\n${esc(d.resum.substring(0, 160))}${d.venciment ? `\n⏰ Venciment: ${esc(d.venciment)}` : ''}\n${d.url_original}`

  let msg = `📋 *MONITOR POLÍTIC — ${esc(data.toUpperCase())}*\n`
  msg += `_${documents.length} novetats · ${torn} · Castell\\-Platja d'Aro_\n\n`

  if (urgents.length) {
    msg += `🔴 *URGENT \\(${urgents.length}\\)*\n━━━━━━━━━━━━━━\n`
    msg += urgents.map(fmtDoc).join('\n\n') + '\n\n'
  }
  if (importants.length) {
    msg += `🟡 *IMPORTANT \\(${importants.length}\\)*\n━━━━━━━━━━━━━━\n`
    msg += importants.map(fmtDoc).join('\n\n') + '\n\n'
  }
  if (informatius.length) {
    msg += `🟢 *INFORMATIU \\(${informatius.length}\\)*\n━━━━━━━━━━━━━━\n`
    msg += informatius.map(fmtDoc).join('\n\n') + '\n\n'
  }
  msg += `_✅ ALTA · ⚠️ MITJA · ❌ BAIXA_`
  return msg.substring(0, 4000)
}
