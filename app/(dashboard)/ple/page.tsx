import { createClient } from '@/lib/supabase/server'
import ModePle from '@/components/dashboard/ModePle'

export default async function PlePage() {
  const supabase = await createClient()

  const { data: documents } = await supabase
    .from('monitoratge')
    .select('id, titol, resum, font, classificacio, data_deteccio, tema_principal, import_detectat, url_original, per_a_l_oposicio, pregunta_ple_suggerida')
    .neq('estat_seguiment', 'tancat')
    .order('classificacio', { ascending: true })
    .order('data_deteccio', { ascending: false })
    .limit(100)

  return <ModePle documents={documents || []} />
}
