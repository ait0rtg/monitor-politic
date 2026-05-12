import { getAdminClient } from '@/lib/admin'
import AlegacionsClient from '@/components/alegacions/AlegacionsClient'

export default async function AlegacionsPage() {
  const admin = getAdminClient()

  const { data: documents } = await admin
    .from('monitoratge')
    .select('id, titol, resum, font, classificacio, data_deteccio, tema_principal, import_detectat, url_original, per_a_l_oposicio')
    .in('classificacio', ['URGENT', 'IMPORTANT'])
    .neq('estat_seguiment', 'tancat')
    .order('data_deteccio', { ascending: false })
    .limit(150)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Generador d'Al·legacions</h1>
        <p className="text-sm text-slate-500">
          Selecciona un document urgent o important i genera una intervenció, pregunta escrita, al·legació o moció
        </p>
      </div>
      <AlegacionsClient documents={documents || []} />
    </div>
  )
}
