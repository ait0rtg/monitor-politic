import { getAdminClient } from '@/lib/admin'
import MemoriaClient from '@/components/memoria/MemoriaClient'

export default async function MemoriaPage() {
  const admin = getAdminClient()

  const [{ data: documents }, { data: compromisos }] = await Promise.all([
    admin.from('monitoratge')
      .select('id, titol, resum, font, classificacio, data_deteccio, tema_principal, import_detectat, url_original')
      .order('data_deteccio', { ascending: false })
      .limit(300),
    admin.from('compromisos')
      .select('id, titol, descripcio, data_compromis, termini_anunciat, estat, tema')
      .order('data_compromis', { ascending: false }),
  ])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Memòria Política</h1>
        <p className="text-sm text-slate-500">
          Cerca un tema i veu tota la seva cronologia: documents, decrets, contractes i compromisos
        </p>
      </div>
      <MemoriaClient documents={documents || []} compromisos={compromisos || []} />
    </div>
  )
}
