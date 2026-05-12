import { getAdminClient } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'
import CalendariClient from '@/components/calendari/CalendariClient'

export default async function CalendariPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = getAdminClient()

  const [
    { data: documents },
    { data: compromisos },
    { data: eventsProis },
  ] = await Promise.all([
    admin.from('monitoratge')
      .select('id, titol, font, classificacio, data_publicacio, venciment, data_deteccio, url_original, tema_principal')
      .neq('estat_seguiment', 'tancat')
      .order('data_deteccio', { ascending: false })
      .limit(500),
    admin.from('compromisos')
      .select('id, titol, termini_anunciat, estat, tema')
      .in('estat', ['pendent', 'en_curs']),
    user ? supabase.from('calendari_events')
      .select('*')
      .eq('user_id', user.id)
      .order('data_inici', { ascending: true }) : Promise.resolve({ data: [] }),
  ])

  return (
    <div className="h-[calc(100vh-80px)]">
      <CalendariClient
        documents={documents || []}
        compromisos={compromisos || []}
        eventsProis={eventsProis || []}
      />
    </div>
  )
}
