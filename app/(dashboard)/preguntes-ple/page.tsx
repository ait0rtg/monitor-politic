import { getAdminClient } from '@/lib/admin'
import PreguntesClient from '@/components/preguntes/PreguntesClient'

export default async function PreguntesPlePage() {
  const admin = getAdminClient()

  const { data: documents } = await admin
    .from('monitoratge')
    .select('id, titol, resum, font, classificacio, data_deteccio, tema_principal')
    .neq('estat_seguiment', 'tancat')
    .order('data_deteccio', { ascending: false })
    .limit(200)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Preguntes pel Ple</h1>
        <p className="text-sm text-slate-500">
          Selecciona documents, genera preguntes amb IA, edita-les i exporta-les
        </p>
      </div>
      <PreguntesClient documents={documents || []} />
    </div>
  )
}
