'use client'

import { useState } from 'react'
import { Plus, Trash2, Brain, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { formatData } from '@/lib/utils'

type Compromis = {
  id: string; titol: string; descripcio?: string; font_compromis: string
  data_compromis: string; termini_anunciat?: string; estat: string; tema?: string
  evidencia_compliment?: string; created_at: string
}

const ESTAT_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pendent:     { label: 'Pendent',     color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
  en_curs:     { label: 'En curs',     color: 'bg-blue-100 text-blue-700 border-blue-200',       icon: Clock },
  complet:     { label: 'Complet',     color: 'bg-green-100 text-green-700 border-green-200',    icon: CheckCircle },
  incomplert:  { label: 'Incomplert',  color: 'bg-red-100 text-red-700 border-red-200',          icon: XCircle },
  abandonat:   { label: 'Abandonat',   color: 'bg-slate-100 text-slate-500 border-slate-200',    icon: XCircle },
}

export default function CompromisosClient({
  compromisos: initial, isAdmin
}: {
  compromisos: Compromis[]; isAdmin: boolean
}) {
  const [compromisos, setCompromisos] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [valoracions, setValorations] = useState<Record<string, { percentatge: number; analisi: string }>>({})
  const [valorantId, setValorantId] = useState<string | null>(null)
  const [form, setForm] = useState({
    titol: '', descripcio: '', font_compromis: 'manual',
    data_compromis: new Date().toISOString().split('T')[0],
    termini_anunciat: '', tema: '', estat: 'pendent',
  })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/compromisos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setCompromisos(prev => [data, ...prev])
      setShowForm(false)
      setForm({ titol: '', descripcio: '', font_compromis: 'manual', data_compromis: new Date().toISOString().split('T')[0], termini_anunciat: '', tema: '', estat: 'pendent' })
      toast.success('Compromís creat')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Segur que vols eliminar aquest compromís?')) return
    try {
      const res = await fetch(`/api/compromisos?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error eliminant')
      setCompromisos(prev => prev.filter(c => c.id !== id))
      toast.success('Compromís eliminat')
    } catch {
      toast.error('Error eliminant el compromís')
    }
  }

  async function handleEstat(id: string, nouEstat: string) {
    try {
      await fetch('/api/compromisos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estat: nouEstat }),
      })
      setCompromisos(prev => prev.map(c => c.id === id ? { ...c, estat: nouEstat } : c))
      toast.success('Estat actualitzat')
    } catch {
      toast.error('Error actualitzant l\'estat')
    }
  }

  async function valorarIA(compromis: Compromis) {
    setValorantId(compromis.id)
    try {
      const res = await fetch('/api/compromisos/valorar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compromis }),
      })
      const data = await res.json()
      setValorations(prev => ({ ...prev, [compromis.id]: data }))
    } catch {
      toast.error('Error en la valoració IA')
    } finally {
      setValorantId(null)
    }
  }

  const stats = {
    total: compromisos.length,
    complets: compromisos.filter(c => c.estat === 'complet').length,
    incomplerts: compromisos.filter(c => c.estat === 'incomplert' || c.estat === 'abandonat').length,
    pendents: compromisos.filter(c => c.estat === 'pendent' || c.estat === 'en_curs').length,
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-slate-700' },
          { label: 'Complets', value: stats.complets, color: 'text-green-600' },
          { label: 'Pendents', value: stats.pendents, color: 'text-blue-600' },
          { label: 'Incomplerts', value: stats.incomplerts, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Capçalera */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">{compromisos.length} compromisos registrats</h2>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 text-sm bg-blue-700 hover:bg-blue-800 text-white px-3 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            Nou compromís
          </button>
        )}
      </div>

      {/* Formulari nou compromís */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-blue-200 p-5 space-y-3">
          <h3 className="font-semibold text-slate-800 text-sm">Nou compromís</h3>
          <input required value={form.titol} onChange={e => setForm(p => ({ ...p, titol: e.target.value }))}
            placeholder="Títol del compromís *"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <textarea value={form.descripcio} onChange={e => setForm(p => ({ ...p, descripcio: e.target.value }))}
            placeholder="Descripció (opcional)" rows={2}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Data compromís</label>
              <input type="date" value={form.data_compromis} onChange={e => setForm(p => ({ ...p, data_compromis: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Termini anunciat</label>
              <input type="date" value={form.termini_anunciat} onChange={e => setForm(p => ({ ...p, termini_anunciat: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.font_compromis} onChange={e => setForm(p => ({ ...p, font_compromis: e.target.value }))}
              placeholder="Font (ple, premsa, web...)"
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input value={form.tema} onChange={e => setForm(p => ({ ...p, tema: e.target.value }))}
              placeholder="Tema (urbanisme, serveis...)"
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={loading}
              className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
              {loading ? 'Guardant...' : 'Crear'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
              Cancel·lar
            </button>
          </div>
        </form>
      )}

      {/* Llista */}
      <div className="space-y-3">
        {compromisos.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
            Cap compromís registrat. Afegeix el primer.
          </div>
        ) : (
          compromisos.map(c => {
            const cfg = ESTAT_CONFIG[c.estat] || ESTAT_CONFIG.pendent
            const Icon = cfg.icon
            const valoracio = valoracions[c.id]

            return (
              <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                      {c.tema && (
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{c.tema}</span>
                      )}
                      <span className="text-xs text-slate-400">{formatData(c.data_compromis)}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{c.titol}</p>
                    {c.descripcio && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{c.descripcio}</p>}
                    {c.termini_anunciat && (
                      <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Termini: {formatData(c.termini_anunciat)}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">Font: {c.font_compromis}</p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => valorarIA(c)} disabled={valorantId === c.id}
                      className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Valoració IA">
                      <Brain className={`w-4 h-4 ${valorantId === c.id ? 'animate-pulse' : ''}`} />
                    </button>
                    {isAdmin && (
                      <button onClick={() => handleDelete(c.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Canvi d'estat */}
                <div className="flex gap-1.5 mt-3 flex-wrap">
                  {Object.entries(ESTAT_CONFIG).map(([key, val]) => (
                    <button key={key} onClick={() => handleEstat(c.id, key)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        c.estat === key ? val.color : 'border-slate-200 text-slate-400 hover:border-slate-300'
                      }`}>
                      {val.label}
                    </button>
                  ))}
                </div>

                {/* Valoració IA */}
                {valoracio && (
                  <div className="mt-3 bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-purple-800">Valoració IA:</span>
                      <div className="flex items-center gap-1.5 flex-1">
                        <div className="flex-1 h-2 bg-purple-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${valoracio.percentatge >= 70 ? 'bg-green-500' : valoracio.percentatge >= 40 ? 'bg-orange-400' : 'bg-red-500'}`}
                            style={{ width: `${valoracio.percentatge}%` }}
                          />
                        </div>
                        <span className={`text-sm font-bold ${valoracio.percentatge >= 70 ? 'text-green-600' : valoracio.percentatge >= 40 ? 'text-orange-500' : 'text-red-600'}`}>
                          {valoracio.percentatge}%
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-purple-900 leading-relaxed">{valoracio.analisi}</p>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
