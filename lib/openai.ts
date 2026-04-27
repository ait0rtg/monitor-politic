import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const SYSTEM_PROMPT_ANALISI = `Ets l'assistent d'un regidor de l'oposicio de Castell-Platja d'Aro (Catalunya).
NORMA FONAMENTAL: Basa't EXCLUSIVAMENT en el text proporcionat.
Respon SEMPRE en catala.`

export const SYSTEM_PROMPT_ASSISTENT = `Ets un expert en dret administratiu local i politica municipal catalana.
Ets l'assistent personal d'un regidor de l'oposicio de Castell-Platja d'Aro.
La teva funcio es preparar al regidor per a plens, debats i intervencions.
Respon SEMPRE en catala. Sigues precis, concis i politicament util.`

export function buildAnalisiPrompt(font: string, titol: string, tipus: string, contingut: string): string {
  return 'FONT: ' + font + '\nTITOL: ' + titol + '\nTIPUS: ' + tipus + '\n\nTEXT COMPLET:\n' + contingut + '\n\nRespon EXACTAMENT en aquest format:\nURGENCIA: [URGENT/IMPORTANT/INFORMATIU]\nRESUM: [3-4 linies basades exclusivament en el text]\nVENCIMENT: [DD/MM/YYYY o No detectat]\nIMPORT: [import en euros o No detectat]\nTEMA: [urbanisme/contractacio/personal/serveis/pressupost/altres]\nCONFIANCA: [ALTA/MITJA/BAIXA]\nPER A LOPOSICIO: [una frase basada en fets del text]\nPROPOSTA ACCIO: [opcional]\nPREGUNTA PLE: [opcional]'
}

export function buildAssistentPrompt(pregunta: string, context: string): string {
  return 'El regidor de l\'oposicio de Castell-Platja d\'Aro fa aquesta consulta:\n\nPREGUNTA: ' + pregunta + '\n\nCONTEXT (documents de la base de dades):\n' + context + '\n\nGenera un informe amb aquestes seccions exactes:\nRESUM EXECUTIU: [3-4 linies]\nANTECEDENTS I HISTORIAL: [cronologia]\nACORDS VIGENTS: [decisions vigents]\nIMPORTS I CONTRACTES: [quantitats i empreses]\nVULNERABILITATS DEL GOVERN: [punts febles]\nPREGUNTES SUGGERIDES:\n1. [primera pregunta]\n2. [segona pregunta]\n3. [tercera pregunta]\nDOCUMENTS FONT: [llista numerada]'
}

export function parseAnalisiResponse(content: string) {
  const get = (key: string) => {
    const pattern = new RegExp(key + ':\\s*([^\\n]+)')
    const m = pattern.exec(content)
    return m ? m[1].trim() : null
  }

  const urgencia = get('URGENCIA')
  const classificacio = urgencia && urgencia.includes('URGENT') ? 'URGENT'
    : urgencia && urgencia.includes('IMPORTANT') ? 'IMPORTANT' : 'INFORMATIU'

  const confianca = get('CONFIANCA')
  const vencimentStr = get('VENCIMENT')
  const importStr = get('IMPORT')

  let venciment: string | null = null
  if (vencimentStr && vencimentStr !== 'No detectat') {
    const vm = /\d{2}\/\d{2}\/\d{4}/.exec(vencimentStr)
    venciment = vm ? vm[0] : null
  }

  let importDetectat: number | null = null
  if (importStr && importStr !== 'No detectat') {
    const parsed = parseFloat(importStr.replace(/[^\d.]/g, ''))
    if (!isNaN(parsed)) importDetectat = parsed
  }

  const resumM = /RESUM:\s*([\s\S]+?)(?=VENCIMENT:|$)/.exec(content)
  const resum = resumM ? resumM[1].trim() : ''

  const perM = /PER A LOPOSICIO:\s*([^\n]+)/.exec(content)
  const proM = /PROPOSTA ACCIO:\s*([^\n]+)/.exec(content)
  const preM = /PREGUNTA PLE:\s*([^\n]+)/.exec(content)

  return {
    classificacio: classificacio as 'URGENT' | 'IMPORTANT' | 'INFORMATIU',
    nivell_confianca: (['ALTA', 'MITJA', 'BAIXA'].includes(confianca || '') ? confianca : 'BAIXA') as 'ALTA' | 'MITJA' | 'BAIXA',
    resum,
    venciment: venciment ? (venciment.split('/')[2] + '-' + venciment.split('/')[1] + '-' + venciment.split('/')[0]) : null,
    import_detectat: importDetectat,
    tema_principal: get('TEMA'),
    proposta_accio: proM ? proM[1].trim() : null,
    pregunta_ple_suggerida: preM ? preM[1].trim() : null,
    per_a_l_oposicio: perM ? perM[1].trim() : null,
  }
}
