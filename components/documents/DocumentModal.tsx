'use client'
import { useState } from 'react'
import { X, ExternalLink } from 'lucide-react'
import { formatData, formatImport, colorVenciment } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Document } from '@/types'

const classifVariant = (c?: string) =>
  (c === 'URGENT' ? 'urgent' : c === 'IMPORTANT' ? 'important' : 'informatiu') as 'urgent' | 'important' | 'informatiu'

export default function DocumentModal({ doc, isAdmin, onClose }: {
  doc: Document; isAdmin: boolean; onClose: () => void
}) {
  const [observacions, setObservacions] = useState(doc.observacions || '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('monitoratge').update({ observacions }).eq('id', doc.id)
    setSaving(false)
    if (error) toast.error('Error guardant les observacions.')
    else toast.success('Observacions guardades.')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between p-6 border-b border-slate-100">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={classifVariant(doc.classificacio)}>{doc.classificacio}</Badge>
              <span className="text-xs text-slate-400">{doc.font}</span>
            </div>
            <h2 className="font-semibold text-slate-800 leading-snug">{doc.titol}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {doc.resum && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Resum IA</h4>
              <p className="text-sm text-slate-700 leading-relaxed">{doc.resum}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-0.5">Data detecció</div>
              <div className="font-medium">{formatData(doc.data_deteccio)}</div>
            </div>
            {doc.venciment && (
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-0.5">Venciment</div>
                <div className={`font-medium ${colorVenciment(doc.venciment)}`}>{formatData(doc.venciment)}</div>
              </div>
            )}
            {doc.import_detectat && (
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-0.5">Import</div>
                <div className="font-medium">{formatImport(doc.import_detectat)}</div>
              </div>
            )}
            {doc.tema_principal && (
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-0.5">Tema</div>
                <div className="font-medium capitalize">{doc.tema_principal}</div>
              </div>
            )}
          </div>

          {doc.proposta_accio && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <div className="text-xs font-semibold text-blue-600 mb-1">Proposta d'acció</div>
              <p className="text-sm text-blue-900">{doc.proposta_accio}</p>
            </div>
          )}

          {doc.pregunta_ple_suggerida && (
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
              <div className="text-xs font-semibold text-purple-600 mb-1">Pregunta de ple suggerida</div>
              <p className="text-sm text-purple-900">{doc.pregunta_ple_suggerida}</p>
            </div>
          )}

          {/* Observacions — editable per TOTS els usuaris */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Observacions{' '}
              <span className="text-green-600 font-normal normal-case">(editable per tots els usuaris)</span>
            </h4>
            <textarea
              value={observacions}
              onChange={e => setObservacions(e.target.value)}
              rows={3}
              placeholder="Afegeix notes, seguiment o qualsevol observació..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <button onClick={save} disabled={saving}
              className="mt-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? 'Guardant...' : 'Guardar observacions'}
            </button>
          </div>

          <a href={doc.url_original} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
            <ExternalLink className="w-4 h-4" />
            Veure document original
          </a>
        </div>
      </div>
    </div>
  )
}
