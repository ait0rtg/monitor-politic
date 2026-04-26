import { createClient } from '@/lib/supabase/server'
import StatsCards from '@/components/dashboard/StatsCards'
import VencimentsCalendar from '@/components/dashboard/VencimentsCalendar'
import UrgentsTable from '@/components/dashboard/UrgentsTable'
import ActivityHeatmap from '@/components/charts/ActivityHeatmap'
import ImportsChart from '@/components/charts/ImportsChart'
import TemaDonut from '@/components/charts/TemaDonut'

export default async function DashboardPage() {
  const supabase = createClient()

  const [
    { data: urgents },
    { data: venciments },
    { data: stats },
    { data: importsData },
    { data: temaData },
  ] = await Promise.all([
    supabase.from('monitoratge')
      .select('*')
      .eq('classificacio', 'URGENT')
      .eq('estat_seguiment', 'pendent')
      .order('data_deteccio', { ascending: false })
      .limit(10),
    supabase.from('monitoratge')
      .select('id, titol, venciment, classificacio, font, url_original')
      .not('venciment', 'is', null)
      .gte('venciment', new Date().toISOString().split('T')[0])
      .order('venciment', { ascending: true })
      .limit(20),
    supabase.rpc('get_dashboard_stats'),
    supabase.from('monitoratge')
      .select('data_deteccio, import_detectat')
      .not('import_detectat', 'is', null),
    supabase.from('monitoratge')
      .select('tema_principal')
      .not('tema_principal', 'is', null),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Castelll-Platja d'Aro — visió general</p>
      </div>

      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VencimentsCalendar venciments={venciments || []} />
        <UrgentsTable urgents={urgents || []} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ImportsChart data={importsData || []} />
        </div>
        <TemaDonut data={temaData || []} />
      </div>

      <ActivityHeatmap />
    </div>
  )
}
