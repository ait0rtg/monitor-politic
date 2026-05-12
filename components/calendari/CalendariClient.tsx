'use client'

import { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, FileText, Target, AlertCircle, Calendar } from 'lucide-react'
import { toast } from 'sonner'

const MESOS = ['Gener','Febrer','Març','Abril','Maig','Juny','Juliol','Agost','Setembre','Octubre','Novembre','Desembre']
const DIES_CURT = ['Dl','Dt','Dc','Dj','Dv','Ds','Dg']
const HORES = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2,'0')}:00`)

type Vista = 'mes' | 'setmana' | 'dia'

type EventCal = {
  id: string
  titol: string
  data: Date
  dataFi?: Date
  tipus: 'document' | 'venciment' | 'compromis' | 'propi'
  classificacio?: string
  font?: string
  url?: string
  color: string
  totDia?: boolean
}

type EventProi = {
  id: string; titol: string; descripcio?: string
  data_inici: string; data_fi?: string; tot_dia: boolean; color: string
}

function colorEvent(tipus: string, classif?: string): string {
  if (tipus === 'propi') return 'bg-blue-500 text-white border-blue-600'
  if (tipus === 'compromis') return 'bg-purple-100 text-purple-800 border-purple-300'
  if (tipus === 'venciment') return 'bg-red-100 text-red-800 border-red-300'
  if (classif === 'URGENT') return 'bg-red-100 text-red-800 border-red-300'
  if (classif === 'IMPORTANT') return 'bg-orange-100 text-orange-800 border-orange-300'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

function isSameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
}

function startOfWeek(d: Date): Date {
  const r = new Date(d)
  const day = r.getDay()
  const diff = day === 0 ? -6 : 1 - day
  r.setDate(r.getDate() + diff)
  r.setHours(0, 0, 0, 0)
  return r
}

export default function CalendariClient({
  documents, compromisos, eventsProis: initialProis
}: {
  documents: any[]
  compromisos: any[]
  eventsProis: EventProi[]
}) {
  const avui = new Date()
  const [vista, setVista] = useState<Vista>('mes')
  const [dataActual, setDataActual] = useState(new Date())
  const [diaSeleccionat, setDiaSeleccionat] = useState<Date | null>(null)
  const [eventsProis, setEventsProis] = useState<EventProi[]>(initialProis)
  const [modalNou, setModalNou] = useState<{ data: Date; hora?: number } | null>(null)
  const [formNou, setFormNou] = useState({ titol: '', descripcio: '', hora: '09', minuts: '00', duracio: 60, totDia: false, color: 'blue' })
  const [guardant, setGuardant] = useState(false)

  // Construir llista d'events de totes les fonts
  const events: EventCal[] = useMemo(() => {
    const llista: EventCal[] = []

    documents.forEach(doc => {
      const dataRef = doc.venciment || doc.data_publicacio || doc.data_deteccio
      if (!dataRef) return
      const d = new Date(dataRef)
      if (isNaN(d.getTime())) return

      if (doc.venciment) {
        llista.push({
          id: `venc-${doc.id}`, titol: `⚠ ${doc.titol}`,
          data: new Date(doc.venciment), tipus: 'venciment',
          classificacio: doc.classificacio, font: doc.font,
          url: doc.url_original, color: colorEvent('venciment'),
          totDia: true,
        })
      } else {
        llista.push({
          id: `doc-${doc.id}`, titol: doc.titol,
          data: d, tipus: 'document',
          classificacio: doc.classificacio, font: doc.font,
          url: doc.url_original, color: colorEvent('document', doc.classificacio),
          totDia: true,
        })
      }
    })

    compromisos.forEach(c => {
      const data = c.termini_anunciat
      if (!data) return
      const d = new Date(data)
      if (isNaN(d.getTime())) return
      llista.push({
        id: `comp-${c.id}`, titol: c.titol,
        data: d, tipus: 'compromis',
        color: colorEvent('compromis'), totDia: true,
      })
    })

    eventsProis.forEach(e => {
      const d = new Date(e.data_inici)
      if (isNaN(d.getTime())) return
      llista.push({
        id: `propi-${e.id}`, titol: e.titol,
        data: d,
        dataFi: e.data_fi ? new Date(e.data_fi) : undefined,
        tipus: 'propi', color: colorEvent('propi'),
        totDia: e.tot_dia,
      })
    })

    return llista
  }, [documents, compromisos, eventsProis])

  function eventsDia(dia: Date): EventCal[] {
    return events.filter(e => isSameDay(e.data, dia))
  }

  // ── Navegació ──────────────────────────────────────────────
  function navAnterior() {
    const d = new Date(dataActual)
    if (vista === 'mes') d.setMonth(d.getMonth() - 1)
    else if (vista === 'setmana') d.setDate(d.getDate() - 7)
    else d.setDate(d.getDate() - 1)
    setDataActual(d)
  }

  function navSeguent() {
    const d = new Date(dataActual)
    if (vista === 'mes') d.setMonth(d.getMonth() + 1)
    else if (vista === 'setmana') d.setDate(d.getDate() + 7)
    else d.setDate(d.getDate() + 1)
    setDataActual(d)
  }

  function titolNavegacio(): string {
    if (vista === 'mes') return `${MESOS[dataActual.getMonth()]} ${dataActual.getFullYear()}`
    if (vista === 'setmana') {
      const ini = startOfWeek(dataActual)
      const fi = new Date(ini); fi.setDate(fi.getDate() + 6)
      return `${ini.getDate()} ${MESOS[ini.getMonth()]} — ${fi.getDate()} ${MESOS[fi.getMonth()]} ${fi.getFullYear()}`
    }
    return `${dataActual.getDate()} ${MESOS[dataActual.getMonth()]} ${dataActual.getFullYear()}`
  }

  // ── Crear event ───────────────────────────────────────────
  async function crearEvent() {
    if (!formNou.titol.trim() || !modalNou) return
    setGuardant(true)
    try {
      const dataInici = new Date(modalNou.data)
      if (!formNou.totDia) {
        dataInici.setHours(parseInt(formNou.hora), parseInt(formNou.minuts), 0, 0)
      }
      const dataFi = new Date(dataInici.getTime() + formNou.duracio * 60000)

      const res = await fetch('/api/calendari', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titol: formNou.titol,
          descripcio: formNou.descripcio,
          data_inici: dataInici.toISOString(),
          data_fi: dataFi.toISOString(),
          tot_dia: formNou.totDia,
          color: formNou.color,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setEventsProis(prev => [...prev, data])
      setModalNou(null)
      setFormNou({ titol: '', descripcio: '', hora: '09', minuts: '00', duracio: 60, totDia: false, color: 'blue' })
      toast.success('Event creat')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setGuardant(false)
    }
  }

  async function eliminarEvent(id: string) {
    const realId = id.replace('propi-', '')
    await fetch(`/api/calendari?id=${realId}`, { method: 'DELETE' })
    setEventsProis(prev => prev.filter(e => e.id !== realId))
    toast.success('Event eliminat')
  }

  // ── Vistes ────────────────────────────────────────────────
  function VistaMes() {
    const primer = new Date(dataActual.getFullYear(), dataActual.getMonth(), 1)
    const ultim = new Date(dataActual.getFullYear(), dataActual.getMonth() + 1, 0)
    const dies: (Date | null)[] = []
    let diaSet = primer.getDay(); diaSet = diaSet === 0 ? 6 : diaSet - 1
    for (let i = 0; i < diaSet; i++) dies.push(null)
    for (let d = 1; d <= ultim.getDate(); d++) dies.push(new Date(dataActual.getFullYear(), dataActual.getMonth(), d))
    while (dies.length % 7 !== 0) dies.push(null)

    return (
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7 border-b border-slate-200">
          {DIES_CURT.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-slate-400 bg-slate-50">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 flex-1">
          {dies.map((dia, i) => {
            if (!dia) return <div key={`n${i}`} className="min-h-[100px] border-b border-r border-slate-100 bg-slate-50/30" />
            const evDia = eventsDia(dia)
            const esAv = isSameDay(dia, avui)
            const esSel = diaSeleccionat && isSameDay(dia, diaSeleccionat)
            return (
              <div key={dia.toISOString()}
                onClick={() => setDiaSeleccionat(esSel ? null : dia)}
                className={`min-h-[100px] border-b border-r border-slate-100 p-1 cursor-pointer transition-colors ${esSel ? 'bg-blue-50' : 'hover:bg-slate-50/80'}`}>
                <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${esAv ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>
                  {dia.getDate()}
                </div>
                <div className="space-y-0.5">
                  {evDia.slice(0, 3).map(e => (
                    <div key={e.id} className={`text-xs px-1 py-0.5 rounded border truncate leading-tight ${e.color}`}>
                      {e.titol.slice(0, 18)}
                    </div>
                  ))}
                  {evDia.length > 3 && (
                    <div className="text-xs text-slate-400 px-1">+{evDia.length - 3} més</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  function VistaSetmana() {
    const ini = startOfWeek(dataActual)
    const dies = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ini); d.setDate(d.getDate() + i); return d
    })

    return (
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-8 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div className="py-2 text-xs text-slate-400 text-center bg-slate-50 border-r border-slate-200" />
          {dies.map(d => (
            <div key={d.toISOString()} className={`py-2 text-center border-r border-slate-200 ${isSameDay(d, avui) ? 'bg-blue-50' : 'bg-slate-50'}`}>
              <div className="text-xs text-slate-400">{DIES_CURT[(d.getDay() + 6) % 7]}</div>
              <div className={`text-sm font-semibold mx-auto w-7 h-7 flex items-center justify-center rounded-full ${isSameDay(d, avui) ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>
                {d.getDate()}
              </div>
            </div>
          ))}
        </div>
        <div className="relative">
          {HORES.map((hora, hi) => (
            <div key={hora} className="grid grid-cols-8 border-b border-slate-100 min-h-[56px]">
              <div className="text-xs text-slate-400 px-2 pt-1 border-r border-slate-200 bg-slate-50/50">{hora}</div>
              {dies.map(d => {
                const evHora = events.filter(e =>
                  isSameDay(e.data, d) && !e.totDia && e.data.getHours() === hi
                )
                return (
                  <div key={d.toISOString()}
                    onClick={() => { setModalNou({ data: d, hora: hi }); setFormNou(p => ({ ...p, hora: String(hi).padStart(2,'0') })) }}
                    className={`border-r border-slate-100 p-0.5 cursor-pointer hover:bg-blue-50/50 transition-colors ${isSameDay(d, avui) ? 'bg-blue-50/20' : ''}`}>
                    {evHora.map(e => (
                      <div key={e.id} className={`text-xs px-1 py-0.5 rounded border mb-0.5 truncate ${e.color}`}>
                        {e.titol.slice(0, 14)}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
          {/* Events tot el dia */}
          <div className="grid grid-cols-8 border-b-2 border-slate-200 bg-slate-50/50 min-h-[32px]">
            <div className="text-xs text-slate-400 px-2 pt-1 border-r border-slate-200">Tot dia</div>
            {dies.map(d => {
              const evTotDia = events.filter(e => isSameDay(e.data, d) && e.totDia)
              return (
                <div key={d.toISOString()} className="border-r border-slate-100 p-0.5">
                  {evTotDia.slice(0, 2).map(e => (
                    <div key={e.id} className={`text-xs px-1 py-0.5 rounded border mb-0.5 truncate ${e.color}`}>
                      {e.titol.slice(0, 14)}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  function VistaDia() {
    const evDia = eventsDia(dataActual)

    return (
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-[80px_1fr]">
          {HORES.map((hora, hi) => {
            const evHora = evDia.filter(e => !e.totDia && e.data.getHours() === hi)
            return (
              <div key={hora} className="contents">
                <div className="text-xs text-slate-400 px-2 pt-1 border-r border-b border-slate-200 bg-slate-50 min-h-[64px]">{hora}</div>
                <div
                  onClick={() => { setModalNou({ data: dataActual, hora: hi }); setFormNou(p => ({ ...p, hora: String(hi).padStart(2,'0') })) }}
                  className="border-b border-slate-100 p-1 cursor-pointer hover:bg-blue-50/50 min-h-[64px] transition-colors">
                  {evHora.map(e => (
                    <div key={e.id} className={`text-sm px-2 py-1.5 rounded border mb-1 ${e.color}`}>
                      <p className="font-medium">{e.titol}</p>
                      {e.font && <p className="text-xs opacity-70">{e.font}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden">

      {/* Capçalera */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 flex-shrink-0">
        <button onClick={() => setDataActual(new Date())}
          className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium">
          Avui
        </button>
        <div className="flex items-center gap-1">
          <button onClick={navAnterior} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={navSeguent} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <h2 className="font-semibold text-slate-800 flex-1 text-sm">{titolNavegacio()}</h2>

        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {(['mes','setmana','dia'] as Vista[]).map(v => (
            <button key={v} onClick={() => setVista(v)}
              className={`text-xs px-3 py-1 rounded-md transition-colors capitalize ${vista === v ? 'bg-white shadow-sm font-medium text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
              {v}
            </button>
          ))}
        </div>

        <button onClick={() => setModalNou({ data: dataActual })}
          className="flex items-center gap-1.5 text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800 transition-colors">
          <Plus className="w-3.5 h-3.5" />
          Nou event
        </button>
      </div>

      {/* Vista activa */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden flex flex-col">
          {vista === 'mes' && <VistaMes />}
          {vista === 'setmana' && <VistaSetmana />}
          {vista === 'dia' && <VistaDia />}
        </div>

        {/* Panell lateral — dia seleccionat (vista mes) */}
        {vista === 'mes' && diaSeleccionat && (
          <div className="w-72 border-l border-slate-200 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">
                {diaSeleccionat.getDate()} {MESOS[diaSeleccionat.getMonth()]}
              </h3>
              <div className="flex gap-1">
                <button onClick={() => setModalNou({ data: diaSeleccionat })}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                  <Plus className="w-4 h-4" />
                </button>
                <button onClick={() => setDiaSeleccionat(null)}
                  className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {eventsDia(diaSeleccionat).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Cap event</p>
              ) : (
                eventsDia(diaSeleccionat).map(e => (
                  <div key={e.id} className={`p-2.5 rounded-lg border ${e.color} group`}>
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-xs font-medium leading-snug flex-1">{e.titol}</p>
                      {e.tipus === 'propi' && (
                        <button onClick={() => eliminarEvent(e.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {e.font && <p className="text-xs opacity-60 mt-0.5">{e.font}</p>}
                    {!e.totDia && <p className="text-xs opacity-60">{e.data.getHours().toString().padStart(2,'0')}:{e.data.getMinutes().toString().padStart(2,'0')}h</p>}
                    {e.url && (
                      <a href={e.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs underline opacity-70 hover:opacity-100 block mt-1">
                        Veure document →
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal nou event */}
      {modalNou && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
          style={{ position: 'fixed' }}
          onClick={e => { if (e.target === e.currentTarget) setModalNou(null) }}>
          <div className="bg-white rounded-xl border border-slate-200 p-5 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Nou event</h3>
              <button onClick={() => setModalNou(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                autoFocus
                type="text"
                value={formNou.titol}
                onChange={e => setFormNou(p => ({ ...p, titol: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && crearEvent()}
                placeholder="Títol de l'event"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                value={formNou.descripcio}
                onChange={e => setFormNou(p => ({ ...p, descripcio: e.target.value }))}
                placeholder="Descripció (opcional)"
                rows={2}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="totDia"
                  checked={formNou.totDia}
                  onChange={e => setFormNou(p => ({ ...p, totDia: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor="totDia" className="text-sm text-slate-600">Tot el dia</label>
              </div>
              {!formNou.totDia && (
                <div className="flex gap-2 items-center">
                  <select value={formNou.hora} onChange={e => setFormNou(p => ({ ...p, hora: e.target.value }))}
                    className="border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none">
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={String(i).padStart(2,'0')}>{String(i).padStart(2,'0')}:00</option>
                    ))}
                  </select>
                  <span className="text-slate-400">·</span>
                  <select value={formNou.duracio} onChange={e => setFormNou(p => ({ ...p, duracio: parseInt(e.target.value) }))}
                    className="border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none">
                    <option value={30}>30 min</option>
                    <option value={60}>1h</option>
                    <option value={90}>1h 30min</option>
                    <option value={120}>2h</option>
                    <option value={180}>3h</option>
                  </select>
                </div>
              )}
              <p className="text-xs text-slate-400">
                📅 {modalNou.data.getDate()} {MESOS[modalNou.data.getMonth()]} {modalNou.data.getFullYear()}
              </p>
              <div className="flex gap-2 pt-1">
                <button onClick={crearEvent} disabled={guardant || !formNou.titol.trim()}
                  className="flex-1 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors">
                  {guardant ? 'Guardant...' : 'Crear event'}
                </button>
                <button onClick={() => setModalNou(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50">
                  Cancel·lar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
