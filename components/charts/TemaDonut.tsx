'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#1d6fa5', '#f97316', '#22c55e', '#8b5cf6', '#ef4444', '#06b6d4', '#f59e0b']
interface Row { tema_principal: string }

export default function TemaDonut({ data }: { data: Row[] }) {
  const counts: Record<string, number> = {}
  data.forEach(r => { if (r.tema_principal) counts[r.tema_principal] = (counts[r.tema_principal] || 0) + 1 })
  const chartData = Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 7).map(([name, value]) => ({ name, value }))

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="font-semibold text-slate-800 mb-4">Distribució per tema</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value">
            {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
