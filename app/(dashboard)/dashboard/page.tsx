import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/admin'
import StatsCards from '@/components/dashboard/StatsCards'
import StatusBar from '@/components/dashboard/StatusBar'
import UrgentsTable from '@/components/dashboard/UrgentsTable'
import VencimentsCalendar from '@/components/dashboard/VencimentsCalendar'
import ImportsChart from '@/components/charts/ImportsChart'
import TemaDonut from '@/components/charts/TemaDonut'
import DashboardAlertes from '@/components/dashboard/DashboardAlertes'
import { cookies } from 'next/headers'

async function getLastVisit(): Promise<Date> {
  const cookieStore = await cookies()
  const val = cookieStore.get('last_visit')?.value
  return val ? new Date(val) : new Date(Date.now() - 7 * 86400000)
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = getAdminClient()
  const lastVisit = await getLastVisit()

  const ara = new Date()
  const fa7dies = new Date(ara.getTime() - 7 * 86400000)

  const [
    { data: urgents },
    { data: venciments },
    { data: statsRaw },
    { data: importsData },
    { data: temaData },
    { count: totalCount },
    { data: nousDesdeDarreraVisita },
    { data: compromisosPendents },
  ] = await Promise.all([
    admin.from('monitoratge')
      .select('*')
      .eq('classificacio', 'URGENT')
      .neq('estat_seguiment', 'tancat')
      .order('data_deteccio', { ascending: false })
      .limit(8),
    admin.from('monitoratge')
      .select('id, titol, venciment, classificacio, font, url_original')
      .not('venciment', 'is', null)
      .gte('venciment', ara.toISOString().split('T')[0])
      .order('venciment', { ascending: true })
      .limit(15),
    admin.from('monitoratge')
      .select('classificacio, estat_seguiment, data_deteccio'),
    admin.from('monitoratge')
      .select('import_detectat, data_deteccio')
      .not('import_detectat', 'is', null)
      .order('data_deteccio', { ascending: true })
      .limit(60),
    admin.from('monitoratge')
      .select('tema_principal')
      .not('tema_principal', 'is', null),
    admin.from('monitoratge')
      .select('*', { count: 'exact', head: true }),
    admin.from('monitoratge')
      .select('id, titol, font, classificacio, data_deteccio, url_original')
      .gt('data_deteccio', lastVisit.toISOString())
      .order('data_deteccio', { ascending: false })
      .limit(50),
    admin.from('compromisos')
      .select('id, titol, termini_anunciat, estat')
      .in('estat', ['pendent', 'en_curs'])
      .not('termini_anunciat', 'is', null)
      .lte('termini_anunciat', new Date(ara.getTime() + 30 * 86400000).toISOString().split('T')[0])
      .order('termini_anunciat', { ascending: true })
      .limit(5),
  ])

  const docs = statsRaw || []
  const stats = {
    total_documents: totalCount || 0,
    urgents_setmana: docs.filter(d =>
      d.classificacio === 'URGENT' && new Date(d.data_deteccio) >= fa7dies
    ).length,
    importants: docs.filter(d => d.classificacio === 'IMPORTANT').length,
    pendents_90dies: docs.filter(d =>
      d.estat_seguiment === 'pendent' &&
      new Date(d.data_deteccio) < new Date(ara.getTime() - 90 * 86400000)
    ).length,
    nous_depuis_visita: nousDesdeDarreraVisita?.length || 0,
  }

  const nousUrgents = (nousDesdeDarreraVisita || []).filter(d => d.classificacio === 'URGENT')
  const nousImportants = (nousDesdeDarreraVisita || []).filter(d => d.classificacio === 'IMPORTANT')

  return (
    <div className="space-y-5">

      {/* Capçalera contextual */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500">
            {stats.nous_depuis_visita > 0
              ? `${stats.nous_depuis_visita} documents nous des de la teva última visita`
              : "Cap novetat des de la teva última visita"}
          </p>
        </div>
        <a href="/ple"
          className="flex items-center gap-1.5 text-xs font-medium bg-blue-700 text-white px-3 py-2 rounded-lg hover:bg-blue-800 transition-colors">
          📱 Mode Ple
        </a>
      </div>

      {/* Zona d'alertes — visible només quan hi ha alguna cosa */}
      <DashboardAlertes
        nousUrgents={nousUrgents}
        nousImportants={nousImportants}
        compromisosPendents={compromisosPendents || []}
        lastVisit={lastVisit.toISOString()}
      />

      <StatsCards stats={stats} />
      <StatusBar />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ImportsChart data={importsData || []} />
        <TemaDonut data={temaData || []} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <UrgentsTable urgents={urgents || []} />
        <VencimentsCalendar venciments={venciments || []} />
      </div>
    </div>
  )
}
