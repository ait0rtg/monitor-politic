import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const SYSTEM_PROMPT_ANALISI = `Ets l'assistent d'un regidor de l'oposició de Castell-Platja d'Aro (Catalunya).
NORMA FONAMENTAL: Basa't EXCLUSIVAMENT en el text proporcionat. NO afegeixis informació que no aparegui al text.
Si el contingut és insuficient, indica-ho explícitament.
Respon SEMPRE en català.`

export const SYSTEM_PROMPT_ASSISTENT = `Ets un expert en dret administratiu local i política municipal catalana.
Ets l'assistent personal d'un regidor de l'oposició de Castell-Platja d'Aro.
La teva funció és preparar al regidor per a plens, debats i intervencions, donant-li tot el context disponible sobre qualsevol tema municipal.
Respon SEMPRE en català. Sigues precís, concís i políticament útil.`

export function buildAnalisiPrompt(font: string, titol: string, tipus: string, contingut: string): string {
  return `FONT: ${font}
TÍTOL: ${titol}
TIPUS: ${tipus}

TEXT COMPLET:
${contingut}

Respon EXACTAMENT en aquest format:
URGÈNCIA: [URGENT/IMPORTANT/INFORMATIU]
RESUM: [3-4 línies basades exclusivament en el text]
VENCIMENT: [DD/MM/YYYY o No detectat]
IMPORT: [import en euros o No detectat]
TEMA: [urbanisme/contractació/personal/serveis/pressupost/habitatge turístic/altres]
CONFIANÇA: [ALTA/MITJA/BAIXA]
PER A L'OPOSICIÓ: [una frase basada en fets del text]
PROPOSTA ACCIÓ: [opcional]
PREGUNTA PLE: [opcional]
EXPEDIENT: [opcional]`
}

export function buildAssistentPrompt(pregunta: string, context: string): string {
  return `El regidor de l'oposició de Castell-Platja d'Aro fa aquesta consulta de preparació:

PREGUNTA: ${pregunta}

CONTEXT DISPONIBLE (documents de la base de dades):
${context}

Genera un informe de preparació estructurat amb exactament aquestes seccions:

RESUM EXECUTIU: [3-4 línies amb el més important. Llegible en 30 segons.]

ANTECEDENTS I HISTORIAL: [Cronologia de decisions i documents relacionats. Del més antic al més recent.]

ACORDS VIGENTS: [Decisions del govern que segueixen en vigor i que poden ser rellevants.]

IMPORTS I CONTRACTES: [Quantitats de diners, empreses contractades i terminis actius.]

VULNERABILITATS DEL GOVERN: [Punts on el govern pot ser feble o on hi ha inconsistències.]

PREGUNTES SUGGERIDES:
1. [Primera pregunta concreta per al ple]
2. [Segona pregunta]
3. [Tercera pregunta]

DOCUMENTS FONT: [Llista numerada dels documents consultats]`
}

export function parseAnalisiResponse(content: string) {
  const get = (key: string) => {
    const match = content.ma
