import { AlertTriangle, Clock, Archive, Target, FileText } from 'lucide-react'

interface Stats {
  total_documents?: number
  urgents_setmana?: number
  venciments_7dies?: number
  pendents_90dies?: number
  compromisos_incomplerts?: number
}

export default function StatsCards({ stats }: { stats: Stats | null }) {
  const s = stats || {}
  const cards = [
    { label: 'Total documents', value: s.total_documents ?? 0, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Urgents aquesta setmana', value: s.urgents_setmana ?? 0, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Venciments en 7 dies', value: s.venciments_7dies ?? 0, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Pendents >90 dies', value: s.pendents_90dies ?? 0, icon: Archive, color: 'text-slate-600', bg: 'bg-slate-50' },
    { label: 'Compromisos incomplerts', value: s.compromisos_incomplerts ?? 0, icon: Target, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0`}>
            <c.icon className={`w-5 h-5 ${c.color}`} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{c.value}</div>
            <div className="text-xs text-slate-500 leading-tight">{c.label}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
