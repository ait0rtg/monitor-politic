'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { parseISO, getDay } from 'date-fns'

const DAYS = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg']

export default function ActivityHeatmap() {
  const [data, setData] = useState<{ day: number; count: number; hasUrgent: boolean }[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.from('monitoratge')
      .select('data_deteccio,classificacio')
      .gte('data_deteccio', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .then(({ data: rows }) => {
        const map: Record<string, { count: number; hasUrgent: boolean }> = {}
        rows?.forEach(r => {
          const k = `${getDay(parseISO(r.data_deteccio))}`
          if (!map[k]) map[k] = { count: 0, hasUrgent: false }
          map[k].count++
          if (r.classificacio === 'URGENT') map[k].hasUrgent = true
        })
        setData(DAYS.map((_, i) => ({ day: i, count: map[i]?.count || 0, hasUrgent: map[i]?.hasUrgent || false })))
      })
  }, [])

  const max = Math.max(...data.map(d => d.count), 1)

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="font-semibold text-slate-800 mb-1">Activitat per dia de la setmana</h3>
      <p className="text-xs text-slate-400 mb-4">Detecta si el govern publica documents importants en dies de baixa atenció pública</p>
      <div className="flex gap-2">
        {DAYS.map((day, i) => {
          const d = data.find(x => x.day === i)
          const intensity = d ? d.count / max : 0
          return (
            <div key={i} className="flex-1 text-center">
              <div
                title={`${d?.count || 0} documents${d?.hasUrgent ? ' · Inclou URGENTs' : ''}`}
                className="h-16 rounded-md mb-1 relative cursor-pointer transition-transform hover:scale-105"
                style={{ backgroundColor: `rgba(29, 111, 165, ${0.1 + intensity * 0.9})` }}>
                {d?.hasUrgent && <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
              </div>
              <div className="text-xs text-slate-500">{day}</div>
              <div className="text-xs font-medium text-slate-700">{d?.count || 0}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
