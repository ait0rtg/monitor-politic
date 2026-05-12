'use client'

import { useState } from 'react'
import { Sparkles, Download, Plus, Edit2, Check, X, Trash2, FileText } from 'lucide-react'
import { toast } from 'sonner'

type Doc = { id: string; titol: string; resum?: string; font: string; classificacio: string; data_deteccio: string; tema_principal?: string }
type Pregunta = { id: string; tema: string; pregunta: string; argumentari: string; editant?: boolean }

const CLASSIF: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-700', IMPORTANT: 'bg-orange-100 text-orange-700', INFORMATIU: 'bg-green-100 text-green-700'
}

export default function PreguntesClient({ documents }: { documents: Doc[] }) {
  const [seleccionats, setSeleccionats] = useState<Doc[]>([])
  const [preguntes, setPreguntes] = useState<Pregunta[]>([])
  const [loading, setLoading] = useState(false)
  const [cerca, setCerca] = useState('')

  const docsFiltrats = documents.filter(d =>
    !cerca || d.titol?.toLowerCase().includes(cerca.toLowerCase()) || d.tema_principal?.toLowerCase().includes(cerca.toLowerCase())
  )

  function toggleDoc(doc: Doc) {
    setSeleccionats(prev =>
      prev.find(d => d.id === doc.id) ? prev.filter(d => d.id !== doc.id) : [...prev, doc]
    )
  }

  async function generar() {
    if (seleccionats.length === 0) { toast.error('Selecciona almenys un document'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/preguntes-ple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: seleccionats }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPreguntes(prev => [
        ...prev,
        ...(data.preguntes || []).map((p: any) => ({ ...p, id: Date.now().toString() + Math.random() }))
      ])
      toast.success(`${data.preguntes?.length || 0} preguntes generades`)
    } catch (e: any) {
      toast.error(e.message || 'Error generant preguntes')
    } finally {
      setLoading(false)
    }
  }

  function afegirManual() {
    const nova: Pregunta = {
      id: Date.now().toString(),
      tema: 'Nova pregunta',
      pregunta: '',
      argumentari: '',
      editant: true,
    }
    setPreguntes(prev => [nova, ...prev])
  }

  function actualitzar(id: string, camps: Partial<Pregunta>) {
    setPreguntes(prev => prev.map(p => p.id === id ? { ...p, ...camps } : p))
  }

  function eliminar(id: string) {
    setPreguntes(prev => prev.filter(p => p.id !== id))
    toast.success('Pregunta eliminada')
  }

  function exportarTXT() {
    if (preguntes.length === 0) { toast.error('No hi ha preguntes'); return }
    const text = `PREGUNTES PER AL PLE MUNICIPAL\nCastelll-Platja d'Aro — ${new Date().toLocaleDateString('ca-ES')}\n${'═'.repeat(60)}\n\n` +
      preguntes.map((p, i) =>
        `${i + 1}. ${p.tema.toUpperCase()}\n\nPREGUNTA:\n${p.pregunta}\n\nARGUMENTARI:\n${p.argumentari}`
      ).join('\n\n' + '─'.repeat(50) + '\n\n')
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `preguntes-ple-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exportat')
  }

  // Exportar com a HTML que s'obre com Word
  function exportarWord() {
    if (preguntes.length === 0) { toast.error('No hi ha preguntes'); return }
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: Calibri, Arial, sans-serif; max-width: 800px; margin: 40px auto; color: #1a1a1a; }
  h1 { font-size: 18pt; color: #1d3557; border-bottom: 2pt solid #1d3557; padding-bottom: 8px; }
  .meta { font-size: 10pt; color: #666; margin-bottom: 30px; }
  .pregunta { margin-bottom: 30px; page-break-inside: avoid; }
  .num { font-size: 13pt; font-weight: bold; color: #1d3557; margin-bottom: 6px; }
  .tema { font-size: 11pt; font-weight: bold; text-transform: uppercase; margin-bottom: 10px; }
  .label { font-size: 9pt; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
  .text { font-size: 11pt; line-height: 1.6; margin-bottom: 14px; padding-left: 12px; border-left: 3px solid #1d3557; }
  .arg { font-size: 10pt; line-height: 1.6; color: #444; padding-left: 12px; border-left: 3px solid #ddd; }
  hr { border: none; border-top: 1pt solid #ddd; margin: 25px 0; }
</style>
</head>
<body>
<h1>Preguntes per al Ple Municipal</h1>
<div class="meta">Castell-Platja d'Aro · ${new Date().toLocaleDateString('ca-ES')} · ${preguntes.length} preguntes</div>
${preguntes.map((p, i) => `
<div class="pregunta">
  <div class="num">${i + 1}.</div>
  <div class="tema">${p.tema}</div>
  <div class="label">Pregunta</div>
  <div class="text">${p.pregunta}</div>
  <div class="label">Argumentari</div>
  <div class="arg">${p.argumentari}</div>
</div>
${i < preguntes.length - 1 ? '<hr>' : ''}`).join('')}
</body>
</html>`

    const blob = new Blob([html], { type: 'application/msword;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `preguntes-ple-${new Date().toISOString().split('T')[0]}.doc`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exportat com a Word (.doc)')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

      {/* Columna esquerra: documents */}
      <div className="space-y-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-700 text-sm mb-3">
            Selecciona documents ({seleccionats.length} seleccionats)
          </h3>
          <input
            type="text" value={cerca} onChange={e => setCerca(e.target.value)}
            placeholder="Cercar documents..."
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {docsFiltrats.slice(0, 50).map(d => (
              <button key={d.id} onClick={() => toggleDoc(d)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                  seleccionats.find(s => s.id === d.id)
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    seleccionats.find(s => s.id === d.id)
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-slate-300'
                  }`}>
                    {seleccionats.find(s => s.id === d.id) && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 leading-tight truncate">{d.titol}</p>
                    <p className="text-xs text-slate-400">{d.font}</p>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${CLASSIF[d.classificacio] || ''}`}>
                    {d.classificacio?.slice(0, 3)}
                  </span>
                </div>
              </button>
            ))}
          </div>
          <button onClick={generar} disabled={loading || seleccionats.length === 0}
            className="w-full mt-3 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            {loading ? 'Generant...' : `Generar preguntes (${seleccionats.length} docs)`}
          </button>
        </div>
      </div>

      {/* Columna dreta: preguntes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-700 text-sm">
            {preguntes.length} preguntes
          </h3>
          <div className="flex gap-2">
            <button onClick={afegirManual}
              className="flex items-center gap-1 text-xs text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50">
              <Plus className="w-3.5 h-3.5" /> Afegir
            </button>
            <button onClick={exportarTXT} disabled={preguntes.length === 0}
              className="flex items-center gap-1 text-xs text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-40">
              <FileText className="w-3.5 h-3.5" /> TXT
            </button>
            <button onClick={exportarWord} disabled={preguntes.length === 0}
              className="flex items-center gap-1 text-xs bg-blue-700 text-white px-2.5 py-1.5 rounded-lg hover:bg-blue-800 disabled:opacity-40">
              <Download className="w-3.5 h-3.5" /> Word
            </button>
          </div>
        </div>

        {preguntes.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
            <p className="text-slate-400 text-sm">Selecciona documents i prem "Generar preguntes"</p>
            <p className="text-slate-300 text-xs mt-1">O afegeix una pregunta manualment</p>
          </div>
        ) : (
          <div className="space-y-3">
            {preguntes.map((p, i) => (
              <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-4">
                {p.editant ? (
                  <div className="space-y-2">
                    <input value={p.tema} onChange={e => actualitzar(p.id, { tema: e.target.value })}
                      placeholder="Tema"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <textarea value={p.pregunta} onChange={e => actualitzar(p.id, { pregunta: e.target.value })}
                      placeholder="Pregunta formal per al ple..." rows={3}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    <textarea value={p.argumentari} onChange={e => actualitzar(p.id, { argumentari: e.target.value })}
                      placeholder="Argumentari..." rows={2}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    <button onClick={() => actualitzar(p.id, { editant: false })}
                      className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">
                      <Check className="w-3.5 h-3.5" /> Guardar
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-600 w-5">{i + 1}.</span>
                        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{p.tema}</span>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => actualitzar(p.id, { editant: true })}
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => eliminar(p.id)}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-slate-800 leading-relaxed mb-2">{p.pregunta}</p>
                    <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-2">{p.argumentari}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
