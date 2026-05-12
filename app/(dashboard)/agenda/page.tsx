import { createClient } from '@/lib/supabase/server'
import AgendaClient from '@/components/agenda/AgendaClient'

export default async function AgendaPage() {
  const supabase = await createClient()

  // Documents de les properes setmanes (per vincular amb el ple)
  const { data: documents } = await supabase
    .from('monitoratge')
    .select('id, titol, resum, font, classificacio, data_deteccio, tema_principal, import_detectat, url_original, per_a_l_oposicio')
    .neq('estat_seguiment', 'tancat')
    .order('data_deteccio', { ascending: false })
    .limit(100)

  // Compromisos pendents
  const { data: compromisos } = await supabase
    .from('compromisos')
    .select('id, titol, termini_anunciat, estat, tema')
    .in('estat', ['pendent', 'en_curs'])
    .not('termini_anunciat', 'is', null)
    .order('termini_anunciat', { ascending: true })
    .limit(20)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Agenda de Plens</h1>
        <p className="text-sm text-slate-500">
          Planifica la teva preparació. Vincula documents rellevants als punts de l'ordre del dia.
        </p>
      </div>
      <AgendaClient documents={documents || []} compromisos={compromisos || []} />
    </div>
  )
}
