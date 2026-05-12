import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/utils'
import AdminClient from '@/components/admin/AdminClient'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdmin(user?.email)) redirect('/dashboard')

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false } }
  )

  const [
    { data: usuaris },
    { count: totalDocs },
    { count: urgents },
    { count: compromisos },
    { data: syncLogs },
  ] = await Promise.all([
    admin.from('usuaris').select('*').order('created_at', { ascending: false }),
    admin.from('monitoratge').select('*', { count: 'exact', head: true }),
    admin.from('monitoratge').select('*', { count: 'exact', head: true }).eq('classificacio', 'URGENT').neq('estat_seguiment', 'tancat'),
    admin.from('compromisos').select('*', { count: 'exact', head: true }).in('estat', ['pendent', 'incomplert']),
    admin.from('sync_log').select('*').order('created_at', { ascending: false }).limit(20),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Administració</h1>
        <p className="text-sm text-slate-500">Configuració del sistema, usuaris i estat general</p>
      </div>
      <AdminClient
        usuaris={usuaris || []}
        stats={{
          totalDocs: totalDocs || 0,
          urgents: urgents || 0,
          compromisos: compromisos || 0,
        }}
        syncLogs={syncLogs || []}
      />
    </div>
  )
}
