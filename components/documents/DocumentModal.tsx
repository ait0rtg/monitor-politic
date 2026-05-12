'use client'
import { useState } from 'react'
import { X, ExternalLink, Sparkles, Archive, FileSearch, Bookmark, BookmarkCheck } from 'lucide-react'
import { formatData, formatImport, colorVenciment, isAdmin } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Document } from '@/types'

const classifVariant = (c?: string) =>
  (c === 'URGENT' ? 'urgent' : c === 'IMPORTANT' ? 'important' : 'informatiu') as 'urgent' | 'important' | 'informatiu'

const ESTATS = [
  { value: 'pendent', label: 'Pendent', color: 'bg-orange-100 text-orange-700' },
  { value: 'en_curs', label: 'En curs', color: 'bg-blue-100 text-blue-700' },
  { value: 'tancat', label: 'Tancat', color: 'bg-green-100 text-green-700' },
]

export default function DocumentModal({ doc, isAdmin: adminProp, onClose }: {
  doc: Document; isAdmin: boolean; onClose: () => void
}) {
  const [observacions, setObservacions] = useState(doc.observacions || '')
  const [saving, setSaving] = useState(false)
  const [resum, setResum] = useState(doc.resum || '')
  const [loadingResum, setLoadingResum] = useState(false)
  const [loadingPDF, setLoadingPDF] = useState(false)
  const [estat, setEstat] = useState<string>(doc.estat_seguiment || 'pendent')
  const [savingEstat, setSavingEstat] = useState(false)
  const [marcat, setMarcat] = useState(false)

  const isPDF = doc.url_original?.includes('/downloadR/') ||
    doc.url_original?.includes('.pdf') ||
    doc.font === 'BPM Decrets' ||
    doc.font === 'Junta de Govern'

  async function processarPDF() {
    setLoadingPDF(true)
    try {
      const res = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: doc.id, url: doc.url_original, titol: doc.titol }),
      })
      const data = await res.json()
      if (data.ok) {
        if (data.ia?.resum) setResum(data.ia.resum)
        toast.success(`PDF processat — ${data.text_length} caràcters extrets`)
      } else {
        toast.error(data.missatge || 'No s\'ha pogut processar el PDF')
      }
    } catch {
      toast.error('Error processant el PDF')
    } finally {
      setLoadingPDF(false)
    }
  }

  async function generarResum() {
    setLoadingResum(true)
    try {
      const res = await fetch('/api/resum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: doc.id, titol: doc.titol, contingut: doc.contingut_complet || doc.resum || '' }),
      })
      const data = await res.json()
      if (data.resum) {
        setResum(data.resum)
        toast.success('Resum generat.')
      } else {
        toast.error('Error generant el resum.')
      }
    } catch {
      toast.error('Error de connexió.')
    } finally {
      setLoadingResum(false)
    }
  }

  async function handleEstat(nouEstat: string) {
    setSavingEstat(true)
    const supabase = createClient()
    const { error } = await supabase.from('monitoratge')
      .update({ estat_seguiment: nouEstat }).eq('id', doc.id)
    setSavingEstat(false)
    if (error) {
      toast.error('Error guardant l\'estat.')
    } else {
      setEstat(nouEstat)
      toast.success('Estat actualitzat.')
    }
  }

  async function save() {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('monitoratge')
      .update({ observacions }).eq('id', doc.id)
    setSaving(false)
    if (error) {
      toast.error('Error guardant.')
    } else {
      toast.success('Observacions guardades.')
    }
  }

  function marcarSeguiment() {
    setMarcat(!marcat)
    toast.success(marcat ? 'Marcador eliminat' : 'Document marcat per seguiment')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Capçalera */}
        <div className="flex items-start justify-between p-6 border-b border-slate-100">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant={classifVariant(doc.classificacio)}>{doc.classificacio}</Badge>
              <span className="text-xs text-slate-400">{doc.font}</span>
              {doc.tema_principal && (
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                  {doc.tema_principal}
                </span>
              )}
            </div>
            <h2 className="text-base font-semibold text-slate-800 leading-snug">{doc.titol}</h2>
            <p className="text-xs text-slate-400 mt-1">Detectat: {formatData(doc.data_deteccio)}</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={marcarSeguiment}
              className={`p-2 rounded-lg transition-colors ${marcat ? 'text-yellow-500 bg-yellow-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
              title={marcat ? 'Treure marcador' : 'Marcar per seguiment'}>
              {marcat ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </button>
            <a href={doc.url_original} target="_blank" rel="noopener noreferrer"
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              <ExternalLink className="w-4 h-4" />
            </a>
            <button onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Contingut scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Info principal */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {doc.import_detectat && (
              <div>
                <span className="text-xs text-slate-400 block mb-0.5">Import</span>
                <span className="font-semibold text-blue-700">{formatImport(doc.import_detectat)}</span>
              </div>
            )}
            {doc.venciment && (
              <div>
                <span className="text-xs text-slate-400 block mb-0.5">Venciment</span>
                <span className={`font-medium ${colorVenciment(doc.venciment)}`}>{formatData(doc.venciment)}</span>
              </div>
            )}
            {doc.recordatori_30d && (
              <div>
                <span className="text-xs text-slate-400 block mb-0.5">Recordatori 30d</span>
                <span className="text-slate-600 text-xs">{formatData(doc.recordatori_30d)}</span>
              </div>
            )}
          </div>

          {/* Rellevància política */}
          {doc.per_a_l_oposicio && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-xs font-medium text-orange-700 mb-1">⚡ Rellevància política</p>
              <p className="text-sm text-orange-900">{doc.per_a_l_oposicio}</p>
            </div>
          )}

          {/* Resum */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Resum</span>
              <div className="flex gap-2">
                {isPDF && (
                  <button onClick={processarPDF} disabled={loadingPDF}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 disabled:opacity-50">
                    <FileSearch className="w-3.5 h-3.5" />
                    {loadingPDF ? 'Processant PDF...' : 'Llegir PDF'}
                  </button>
                )}
                <button onClick={generarResum} disabled={loadingResum}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 disabled:opacity-50">
                  <Sparkles className="w-3.5 h-3.5" />
                  {loadingResum ? 'Generant...' : 'Generar IA'}
                </button>
              </div>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{resum || '(sense resum)'}</p>
          </div>

          {/* Contingut complet si n'hi ha */}
          {doc.contingut_complet && doc.contingut_complet.length > 200 && (
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">
                Text complet del document
              </span>
              <div className="bg-slate-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {doc.contingut_complet.slice(0, 2000)}
                  {doc.contingut_complet.length > 2000 && '...'}
                </p>
              </div>
            </div>
          )}

          {/* Estat seguiment */}
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">Estat seguiment</span>
            <div className="flex gap-2 flex-wrap">
              {ESTATS.map(e => (
                <button key={e.value} onClick={() => handleEstat(e.value)} disabled={savingEstat}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                    estat === e.value ? e.color + ' border-transparent' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}>
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pregunta suggerida */}
          {doc.pregunta_ple_suggerida && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-700 mb-1">💡 Pregunta suggerida per al ple</p>
              <p className="text-sm text-blue-900">{doc.pregunta_ple_suggerida}</p>
            </div>
          )}

          {/* Observacions */}
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">
              Observacions pròpies
            </label>
            <textarea
              value={observacions}
              onChange={e => setObservacions(e.target.value)}
              rows={3}
              placeholder="Afegeix notes, context o recordatoris..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            Tancar
          </button>
          <button onClick={save} disabled={saving}
            className="px-4 py-2 text-sm bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors disabled:opacity-50">
            {saving ? 'Guardant...' : 'Guardar notes'}
          </button>
        </div>
      </div>
    </div>
  )
}
