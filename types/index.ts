export type Rol = 'admin' | 'usuari' | 'pendent' | 'rebutjat'
export type Classificacio = 'URGENT' | 'IMPORTANT' | 'INFORMATIU'
export type Confianca = 'ALTA' | 'MITJA' | 'BAIXA'
export type EstatSeguiment = 'pendent' | 'en_curs' | 'tancat'
export type EstatDocument = 'nou' | 'revisat' | 'arxivat'
export type EstatCompromis = 'pendent' | 'en_curs' | 'complet' | 'incomplert' | 'abandonat'

export interface Profile {
  id: string
  email: string
  nom: string
  rol: Rol
  idioma: 'ca' | 'es'
  creat_el: string
  aprovat_el?: string
}

export interface Document {
  id: string
  url_original: string
  font: string
  tipus: string
  tipus_document?: string
  titol: string
  contingut_complet?: string
  resum: string
  classificacio: Classificacio
  nivell_confianca: Confianca
  data_deteccio: string
  data_document?: string
  venciment?: string
  import_detectat?: number
  tema_principal?: string
  proposta_accio?: string
  pregunta_ple_suggerida?: string
  requereix_revisio_manual: boolean
  estat_seguiment: EstatSeguiment
  observacions?: string
  estat: EstatDocument
  numero_bpm?: string
  area_bpm?: string
  nom_interessat?: string
  recordatori_30d?: string
  recordatori_90d?: string
  recordatori_180d?: string
}

export interface Compromis {
  id: string
  titol: string
  descripcio?: string
  font_compromis?: string
  data_compromis?: string
  termini_anunciat?: string
  estat: EstatCompromis
  evidencia_url?: string
  evidencia_nota?: string
  tema?: string
  creat_per: string
  creat_el: string
  comentaris?: ComentariCompromis[]
}

export interface ComentariCompromis {
  id: string
  compromis_id: string
  usuari_id: string
  text: string
  creat_el: string
  profile?: Profile
}

export interface Stats {
  total: number
  urgents: number
  importants: number
  pendents: number
  vencen_7dies: number
  ultimes_24h: number
}

export interface AssistentQuery {
  query: string
  idioma?: 'ca' | 'es'
}

export interface AssistentResponse {
  resum_executiu: string
  antecedents: string
  acords_vigents: string
  imports_contractes: string
  vulnerabilitats: string
  preguntes_suggerides: string[]
  documents_font: { titol: string; url: string; data: string }[]
  total_documents_consultats: number
}
