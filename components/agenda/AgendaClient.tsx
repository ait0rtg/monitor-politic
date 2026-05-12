'use client'

import { useState } from 'react'
import { Calendar, Plus, Trash2, Zap, ChevronDown, ChevronUp, Download } from 'lucide-react'
import { toast } from 'sonner'
import { formatData } from '@/lib/utils'

type Doc = {
  id: string; titol: string; resum?: string; font: string
  classificacio: string; data_deteccio: string; tema_principal?: string
  import_detectat?: number; url_original: string; per_a_l_oposicio?: string
}
type Compromis = { id: string; titol: string; termini_anunciat?: string; estat: string; tema?: string }
type PuntPle = { id: string; text: string; docs: Doc[]; notes: string }

const CLASSIF_DOT: Record<string, string> = {
  URGENT: 'bg-red-500', IMPORTANT: 'bg-orange-400', INFORMATIU: 'bg-green-500'
}

export default function AgendaClient({ documents, compromisos }: { documents: Doc[]; compromisos: Compromis[] }) {
  const [dataPle, setDataPle] = useState('')
  const [punts, setPunts] = useState<PuntPle[]>([])
  const [nouPunt, setNouPunt] = useState('')
  const [puntObert, setPuntObert] = useState<string | null>(null)
  const [loadingIA, setLoadingIA] = useState(false)
  const [preparacio, setPreparacio] = useState('')

  function afegirPunt() {
    if (!nouPunt.trim()) return
    const id = Date.now().toString()
    setPunts(prev => [...prev, { id, text: nouPunt.trim(), docs: [], notes: '' }])
    setNouPunt('')
    setPuntObert(id)
  }

  function eliminarPunt(id: string) {
    setPunts(prev => prev.filter(p => p.id !== id))
  }

  function vincularDoc(puntId: string, doc: Doc) {
    setPunts(prev => prev.map(p => {
      if (p.id !== puntId) return p
      if (p.docs.find(d => d.id === doc.id)) return p
      return { ...p, docs: [...p.docs, doc] }
    }))
  }

  function desvincularDoc(puntId: string, docId: string) {
    setPunts(prev => prev.map(p =>
      p.id === puntId ? { ...p, docs: p.docs.filter(d => d.id !== docId) } : p
    ))
  }

  function actualitzarNotes(puntId: string, notes: string) {
    setPunts(prev => prev.map(p => p.id === puntId ? { ...p, notes } : p))
  }

  // Recomanar documents automàticament per un punt
  function recomanarDocs(puntId: string, textPunt: string) {
    const q = textPunt.toLowerCase()
    const recomanats = documents
      .filter(d =>
        d.titol?.toLowerCase().includes(q.split(' ')[0]) ||
        d.tema_principal?.toLowerCase().includes(q.split(' ')[0]) ||
        d.resum?.toLowerCase().includes(q.split(' ')[0])
      )
      .slice(0, 3)

    if (recomanats.length === 0) {
      toast.info('Cap document relacionat trobat')
      return
    }

    recomanats.forEach(d => vincularDoc(puntId, d))
    toast.success(`${recomanats.length} documents vinculats automàticament`)
  }

  async function generarPreparacio() {
    if (punts.length === 0) return
    setLoadingIA(true)
    setPreparacio('')

    try {
      const res = await fetch('/api/assistent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consulta: `Prepara'm per al ple del ${dataPle || 'proper ple'}. Punts de l'ordre del dia: ${punts.map(p => p.text).join(', ')}`,
          idioma: 'ca',
        }),
      })
      const data = await res.json()
      if (data.resum_executiu) {
        setPreparacio(data.resum_executiu + '\n\n' + (data.vulnerabilitats || '') + '\n\n' + (data.preguntes_suggerides?.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n') || ''))
      }
    } catch {
      toast.error('Error generant la preparació')
    } finally {
      setLoadingIA(false)
    }
  }

  function exportarAgenda() {
    let text = `AGENDA PLE MUNICIPAL — ${dataPle || 'Data pendent'}\n${'═'.repeat(50)}\n\n`
    punts.forEach((p, i) => {
      text += `${i + 1}. ${p.text.toUpperCase()}\n`
      if (p.docs.length > 0) {
        text += `   Documents relacionats:\n`
        p.docs.forEach(d => { text += `   • ${d.titol} (${d.font})\n` })
      }
      if (p.notes) text += `   Notes: ${p.notes}\n`
      text += '\n'
    })
    if (compromisos.length > 0) {
      text += `COMPROMISOS PENDENTS A REVISAR\n${'─'.repeat(40)}\n`
      compromisos.forEach(c => { text += `• ${c.titol} — termini: ${c.termini_anunciat || 'N/D'}\n` })
    }
    if (preparacio) {
      text += `\nPREPARACIÓ IA\n${'─'.repeat(40)}\n${preparacio}`
    }

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ple-${dataPle || 'agenda'}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Agenda exportada')
  }

  const docsUrgents = documents.filter(d => d.classificacio === 'URGENT').slice(0, 5)
  const docsImportants = documents.filter(d => d.classificacio === 'IMPORTANT').slice(0, 5)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

      {/* Columna esquerra: ordre del dia */}
      <div className="lg:col-span-2 space-y-4">

        {/* Data del ple */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Calendar className="w-4 h-4 text-slate-400" />
              <label className="text-sm font-medium text-slate-600">Data del ple:</label>
              <input
                type="date"
                value={dataPle}
                onChange={e => setDataPle(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              {punts.length > 0 && (
                <>
                  <button onClick={generarPreparacio} disabled={loadingIA}
                    className="flex items-center gap-1.5 text-xs bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg disabled:opacity-50">
                    <Zap className="w-3.5 h-3.5" />
                    {loadingIA ? 'Preparant...' : 'Preparació IA'}
                  </button>
                  <button onClick={exportarAgenda}
                    className="flex items-center gap-1.5 text-xs text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">
                    <Download className="w-3.5 h-3.5" />
                    Exportar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Afegir punt */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Ordre del dia</h3>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={nouPunt}
              onChange={e => setNouPunt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && afegirPunt()}
              placeholder="Afegir punt de l'ordre del dia..."
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={afegirPunt}
              className="px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Llista de punts */}
          {punts.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">
              Afegeix els punts de l'ordre del dia del ple
            </p>
          ) : (
            <div className="space-y-2">
              {punts.map((punt, i) => (
                <div key={punt.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50"
                    onClick={() => setPuntObert(puntObert === punt.id ? null : punt.id)}
                  >
                    <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium text-slate-700">{punt.text}</span>
                    <div className="flex items-center gap-2">
                      {punt.docs.length > 0 && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {punt.docs.length} docs
                        </span>
                      )}
                      <button onClick={e => { e.stopPropagation(); eliminarPunt(punt.id) }}
                        className="p-1 text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {puntObert === punt.id
                        ? <ChevronUp className="w-4 h-4 text-slate-400" />
                        : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {puntObert === punt.id && (
                    <div className="px-4 pb-4 border-t border-slate-100 bg-slate-50/50 space-y-3 pt-3">
                      {/* Documents vinculats */}
                      {punt.docs.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-500">Documents vinculats:</p>
                          {punt.docs.map(d => (
                            <div key={d.id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${CLASSIF_DOT[d.classificacio] || 'bg-slate-300'}`} />
                              <span className="text-xs text-slate-700 flex-1 truncate">{d.titol}</span>
                              <button onClick={() => desvincularDoc(punt.id, d.id)}
                                className="text-slate-300 hover:text-red-400 flex-shrink-0">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Botó vincular automàticament */}
                      <button
                        onClick={() => recomanarDocs(punt.id, punt.text)}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        Vincular documents relacionats automàticament
                      </button>

                      {/* Notes */}
                      <textarea
                        value={punt.notes}
                        onChange={e => actualitzarNotes(punt.id, e.target.value)}
                        placeholder="Notes per a aquest punt..."
                        rows={2}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preparació IA */}
        {preparacio && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <h3 className="font-semibold text-blue-900 text-sm flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4" />
              Preparació per al ple
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{preparacio}</p>
          </div>
        )}
      </div>

      {/* Columna dreta: alertes i documents */}
      <div className="space-y-4">

        {/* Compromisos pendents */}
        {compromisos.length > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-purple-800 mb-3">
              Compromisos a revisar ({compromisos.length})
            </h3>
            <div className="space-y-2">
              {compromisos.slice(0, 5).map(c => (
                <div key={c.id} className="text-xs">
                  <p className="font-medium text-purple-900 leading-tight">{c.titol}</p>
                  {c.termini_anunciat && (
                    <p className="text-purple-600 mt-0.5">Termini: {formatData(c.termini_anunciat)}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents urgents */}
        {docsUrgents.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-red-800 mb-3">
              🔴 Documents urgents
            </h3>
            <div className="space-y-2">
              {docsUrgents.map(d => (
                <button key={d.id}
                  onClick={() => {
                    const puntActiu = puntObert || punts[0]?.id
                    if (puntActiu) vincularDoc(puntActiu, d)
                    else toast.info('Primer crea un punt de l\'ordre del dia')
                  }}
                  className="w-full text-left p-2 bg-white border border-red-100 rounded-lg hover:border-red-300 transition-colors">
                  <p className="text-xs font-medium text-slate-700 leading-tight line-clamp-2">{d.titol}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{d.font}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Documents importants */}
        {docsImportants.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-orange-800 mb-3">
              🟠 Documents importants
            </h3>
            <div className="space-y-2">
              {docsImportants.map(d => (
                <button key={d.id}
                  onClick={() => {
                    const puntActiu = puntObert || punts[0]?.id
                    if (puntActiu) vincularDoc(puntActiu, d)
                    else toast.info('Primer crea un punt de l\'ordre del dia')
                  }}
                  className="w-full text-left p-2 bg-white border border-orange-100 rounded-lg hover:border-orange-300 transition-colors">
                  <p className="text-xs font-medium text-slate-700 leading-tight line-clamp-2">{d.titol}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{d.font}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
