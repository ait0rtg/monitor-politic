'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'

interface SyncStatus {
  font: string
  estat: 'ok' | 'error' | 'desconegut'
  nous_docs: number
  created_at: string | null
}

const FONTS_ESPERADES = ['E-Tauler', 'Perfil Contractant', 'Junta de Govern', 'BPM Decrets']

function minutsDesde(data: string | null): number {
  if (!data) return Infinity
  return Math.floor((Date.now() - new Date(data).getTime()) / 60000)
}

function formatTemps(minuts: number): string {
  if (minuts === Infinity) return 'mai'
  if (minuts < 60) return `fa ${minuts}m`
  if (minuts < 1440) return `fa ${Math.floor(minuts / 60)}h`
  return `fa ${Math.floor(minuts / 1440)}d`
}

function semaforo(estat: string, minuts: number): 'verd' | 'taronja' | 'vermell' {
  if (estat === 'error') return 'vermell'
  if (minuts > 2880) return 'vermell'
  if (minuts > 1440) return 'taronja'
  return 'verd'
}

const DOT = { verd: 'bg-green-500', taronja: 'bg-orange-400', vermell: 'bg-red-500' }
const TXT = { verd: 'text-green-700', taronja: 'text-orange-600', vermell: 'text-red-600' }

export default function StatusBar() {
  const [statuses, setStatuses] = useState<SyncStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncLog, setSyncLog] = useState<string[]>([])
  const [showLog, setShowLog] = useState(false)

  async function load() {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('darrera_sync')
        .select('font, estat, nous_docs, created_at')
      const mapa: Record<string, SyncStatus> = {}
      data?.forEach(row => { mapa[row.font] = row })
      setStatuses(
        FONTS_ESPERADES.map(font => mapa[font] || { font, estat: 'desconegut', nous_docs: 0, created_at: null })
      )
    } finally {
      setLoading(false)
    }
  }

  async function syncManual() {
    setSyncing(true)
    setSyncLog([])
    try {
      const res = await fetch('/api/scrapers', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        toast.error(`Error: ${data.error || 'Error desconegut'}`)
        setSyncLog([data.error || 'Error desconegut'])
        return
      }

      setSyncLog(data.log || [])

      if (data.nous > 0) {
        toast.success(`${data.nous} nous documents importats`)
        setShowLog(false)
      } else if (data.errors > 0) {
        toast.error(`Errors en ${data.errors} fonts. Mira el log.`)
        setShowLog(true)
      } else {
        toast.info('Cap document nou (ja existien o fonts sense canvis)')
        setShowLog(true)
      }

      await load()
    } catch (e: any) {
      toast.error(`Error de connexió: ${e.message}`)
      setSyncLog([e.message])
      setShowLog(true)
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return null

  const totVermells = statuses.filter(s => semaforo(s.estat, minutsDesde(s.created_at)) === 'vermell').length
  const totOk = statuses.filter(s => s.estat === 'ok').length

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-700">Estat de les fonts</h3>
          {totVermells > 0 && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
              {totVermells} amb error
            </span>
          )}
          {totVermells === 0 && totOk > 0 && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              Tot correcte
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {syncLog.length > 0 && (
            <button
              onClick={() => setShowLog(!showLog)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
            >
              Log
              {showLog ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
          <button
            onClick={syncManual}
            disabled={syncing}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronitzant...' : 'Sincronitzar'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statuses.map(s => {
          const minuts = minutsDesde(s.created_at)
          const color = semaforo(s.estat, minuts)
          return (
            <div key={s.font} className="flex items-start gap-2">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${DOT[color]}`} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-700 leading-tight truncate">{s.font}</p>
                <p className={`text-xs ${TXT[color]}`}>
                  {s.estat === 'error' ? 'Error' : formatTemps(minuts)}
                </p>
                {s.nous_docs > 0 && <p className="text-xs text-slate-400">{s.nous_docs} nous</p>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Log de diagnòstic */}
      {showLog && syncLog.length > 0 && (
        <div className="mt-3 bg-slate-900 rounded-lg p-3 text-xs font-mono space-y-0.5 max-h-32 overflow-y-auto">
          {syncLog.map((line, i) => (
            <div key={i} className={
              line.includes('FALLIDA') || line.includes('error') ? 'text-red-400' :
              line.includes('nous') || line.includes('OK') ? 'text-green-400' :
              'text-slate-300'
            }>
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
