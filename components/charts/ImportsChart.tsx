'use client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, parseISO, startOfMonth } from 'date-fns'
import { ca } from 'date-fns/locale'

interface Row { data_deteccio: string; import_detectat: number }

export default function ImportsChart({ data }: { data: Row[] }) {
  const byMonth: Record<string, number> = {}
  data.forEach(r => {
    const k = format(startOfMonth(parseISO(r.data_deteccio)), 'yyyy-MM')
    byMonth[k] = (byMonth[k] || 0) + r.import_detectat
  })
  const chartData = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([m, t]) => ({ mes: format(parseISO(m + '-01'), 'MMM yy', { locale: ca }), total: Math.round(t) }))

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="font-semibold text-slate-800 mb-4">Evolució d'imports contractats</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${v / 1000}k€` : `${v}€`} />
          <Tooltip formatter={(v: number) => [`${v.toLocaleString('ca-ES')} €`, 'Import']} />
          <Line type="monotone" dataKey="total" stroke="#1d6fa5" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
