import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import StatsCards from '@/components/dashboard/StatsCards'
import StatusBar from '@/components/dashboard/StatusBar'
import UrgentsTable from '@/components/dashboard/UrgentsTable'
import VencimentsCalendar from '@/components/dashboard/VencimentsCalendar'
import ImportsChart from '@/components/charts/ImportsChart'
import TemaDonut from '@/components/charts/TemaDonut'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false } }
  )

  const [
    { data: urgents },
    { data: venciments },
    { data: statsRaw },
    { data: importsData },
    { data: temaData },
    { count: totalCount },
  ] = await Promise.all([
    admin.from('monitoratge')
      .select('*')
      .eq('classificacio', 'URGENT')
      .neq('estat_seguiment', 'tancat')
      .order('data_deteccio', { ascending: false })
      .limit(10),
    admin.from('monitoratge')
      .select('id, titol, venciment, classificacio, font, url_original')
      .not('venciment', 'is', null)
      .gte('venciment', new Date().toISOString().split('T')[0])
      .order('venciment', { ascending: true })
      .limit(20),
    admin.from('monitoratge')
      .select('classificacio, estat_seguiment, font, data_deteccio'),
    admin.from('monitoratge')
      .select('import_detectat, data_deteccio')
      .not('import_detectat', 'is', null)
      .order('data_deteccio', { ascending: true })
      .limit(50),
    admin.from('monitoratge')
      .select('tema_principal')
      .not('tema_principal', 'is', null),
    admin.from('monitoratge')
      .select('*', { count: 'exact', head: true }),
  ])

  const ara = new Date()
  const fa7dies = new Date(ara.getTime() - 7 * 86400000)
  const fa90dies = new Date(ara.getTime() - 90 * 86400000)

  const docs = statsRaw || []
  const stats = {
    total_documents: totalCount || 0,
    urgents_setmana: docs.filter(d =>
      d.classificacio === 'URGENT' && new Date(d.data_deteccio) >= fa7dies
    ).length,
    pendents_90dies: docs.filter(d =>
      d.estat_seguiment === 'pendent' && new Date(d.data_deteccio) <= fa90dies
    ).length,
    importants: docs.filter(d => d.classificacio === 'IMPORTANT').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500">Resum de l'activitat municipal de Castell-Platja d'Aro</p>
        </div>
        <a href="/ple"
          className="flex items-center gap-1.5 text-xs font-medium bg-blue-700 text-white px-3 py-2 rounded-lg hover:bg-blue-800 transition-colors">
          📱 Mode Ple
        </a>
      </div>

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
