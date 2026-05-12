'use client'

import { useState } from 'react'
import { AlertTriangle, Info, Target, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { formatData } from '@/lib/utils'

type DocNou = { id: string; titol: string; font: string; classificacio: string; data_deteccio: string; url_original: string }
type Compromis = { id: string; titol: string; termini_anunciat?: string; estat: string }

export default function DashboardAlertes({
  nousUrgents, nousImportants, compromisosPendents, lastVisit
}: {
  nousUrgents: DocNou[]
  nousImportants: DocNou[]
  compromisosPendents: Compromis[]
  lastVisit: string
}) {
  const [expandUrgents, setExpandUrgents] = useState(true)
  const [expandImportants, setExpandImportants] = useState(false)
  const [expandCompromisos, setExpandCompromisos] = useState(false)

  const totalAlertes = nousUrgents.length + compromisosPendents.length

  // Si no hi ha res rellevant, no mostrar res
  if (nousUrgents.length === 0 && nousImportants.length === 0 && compromisosPendents.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
        <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
        <p className="text-sm text-green-800">
          Tot en ordre — cap novetat urgent des de {formatData(lastVisit)}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">

      {/* Urgents nous */}
      {nousUrgents.length > 0 && (
        <div className="border border-red-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setExpandUrgents(!expandUrgents)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 hover:bg-red-100 transition-colors text-left"
          >
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span className="flex-1 text-sm font-semibold text-red-800">
              {nousUrgents.length} document{nousUrgents.length > 1 ? 's' : ''} URGENT{nousUrgents.length > 1 ? 'S' : ''} nou{nousUrgents.length > 1 ? 's' : ''}
            </span>
            <span className="text-xs text-red-500">des de {formatData(lastVisit)}</span>
            {expandUrgents ? <ChevronUp className="w-4 h-4 text-red-400" /> : <ChevronDown className="w-4 h-4 text-red-400" />}
          </button>
          {expandUrgents && (
            <div className="divide-y divide-red-100">
              {nousUrgents.map(d => (
                <div key={d.id} className="flex items-start gap-3 px-4 py-2.5 bg-white">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 leading-snug line-clamp-1">{d.titol}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{d.font} · {formatData(d.data_deteccio)}</p>
                  </div>
                  <a href={d.url_original} target="_blank" rel="noopener noreferrer"
                    className="p-1 text-slate-300 hover:text-red-500 flex-shrink-0">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Importants nous */}
      {nousImportants.length > 0 && (
        <div className="border border-orange-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setExpandImportants(!expandImportants)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-orange-50 hover:bg-orange-100 transition-colors text-left"
          >
            <Info className="w-4 h-4 text-orange-600 flex-shrink-0" />
            <span className="flex-1 text-sm font-semibold text-orange-800">
              {nousImportants.length} document{nousImportants.length > 1 ? 's' : ''} important{nousImportants.length > 1 ? 's' : ''} nou{nousImportants.length > 1 ? 's' : ''}
            </span>
            {expandImportants ? <ChevronUp className="w-4 h-4 text-orange-400" /> : <ChevronDown className="w-4 h-4 text-orange-400" />}
          </button>
          {expandImportants && (
            <div className="divide-y divide-orange-100">
              {nousImportants.slice(0, 5).map(d => (
                <div key={d.id} className="flex items-start gap-3 px-4 py-2.5 bg-white">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 leading-snug line-clamp-1">{d.titol}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{d.font} · {formatData(d.data_deteccio)}</p>
                  </div>
                  <a href={d.url_original} target="_blank" rel="noopener noreferrer"
                    className="p-1 text-slate-300 hover:text-orange-500 flex-shrink-0">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
              {nousImportants.length > 5 && (
                <div className="px-4 py-2 bg-orange-50">
                  <a href="/documents?classificacio=IMPORTANT" className="text-xs text-orange-600 hover:underline">
                    Veure els {nousImportants.length - 5} restants →
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Compromisos amb termini proper */}
      {compromisosPendents.length > 0 && (
        <div className="border border-purple-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setExpandCompromisos(!expandCompromisos)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-purple-50 hover:bg-purple-100 transition-colors text-left"
          >
            <Target className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <span className="flex-1 text-sm font-semibold text-purple-800">
              {compromisosPendents.length} compromís{compromisosPendents.length > 1 ? 'os' : ''} amb termini en 30 dies
            </span>
            {expandCompromisos ? <ChevronUp className="w-4 h-4 text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-400" />}
          </button>
          {expandCompromisos && (
            <div className="divide-y divide-purple-100">
              {compromisosPendents.map(c => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 bg-white">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 line-clamp-1">{c.titol}</p>
                  </div>
                  <span className="text-xs text-purple-600 font-medium flex-shrink-0">
                    {formatData(c.termini_anunciat)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
