'use client'

import { useState } from 'react'
import { Search, AlertTriangle, FileText, Zap, ExternalLink } from 'lucide-react'
import type { Document } from '@/types'

const CLASSIF: Record<string, { dot: string; bg: string }> = {
  URGENT: { dot: 'bg-red-500', bg: 'border-red-200 bg-red-50' },
  IMPORTANT: { dot: 'bg-orange-400', bg: 'border-orange-200 bg-orange-50' },
  INFORMATIU: { dot: 'bg-green-500', bg: 'border-slate-200 bg-white' },
}

export default function ModePle({ documents }: { documents: Document[] }) {
  const [cerca, setCerca] = useState('')
  const [tab, setTab] = useState<'urgents' | 'tots' | 'cerca'>('urgents')

  const urgents = documents.filter(d => d.classificacio === 'URGENT' || d.classificacio === 'IMPORTANT').slice(0, 20)
  const cercats = cerca.length > 2
    ? documents.filter(d =>
        d.titol?.toLowerCase().includes(cerca.toLowerCase()) ||
        d.resum?.toLowerCase().includes(cerca.toLowerCase())
      ).slice(0, 15)
    : []

  const llista = tab === 'urgents' ? urgents : tab === 'cerca' ? cercats : documents.slice(0, 30)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header mòbil */}
      <div className="bg-blue-800 text-white px-4 pt-safe pb-3 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-base font-bold">Monitor Polític</h1>
            <p className="text-xs text-blue-200">Mode Ple</p>
          </div>
          <Zap className="w-5 h-5 text-blue-300" />
        </div>

        {/* Cerca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={cerca}
            onChange={e => { setCerca(e.target.value); if (e.target.value.length > 2) setTab('cerca') }}
            placeholder="Cerca ràpida..."
            className="w-full pl-9 pr-4 py-2 bg-white rounded-lg text-sm text-slate-700 focus:outline-none"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-slate-200 sticky top-24 z-10">
        {([
          { key: 'urgents', label: `Prioritaris (${urgents.length})`, icon: AlertTriangle },
          { key: 'tots', label: 'Tots', icon: FileText },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
            }`}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Llista de documents */}
      <div className="divide-y divide-slate-100">
        {llista.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            {tab === 'cerca' ? 'Escriu almenys 3 caràcters per cercar' : 'Cap document'}
          </div>
        ) : (
          llista.map(doc => {
            const style = CLASSIF[doc.classificacio] || CLASSIF.INFORMATIU
            return (
              <div key={doc.id} className="bg-white px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${style.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 leading-snug">{doc.titol}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">{doc.font}</span>
                      {doc.tema_principal && (
                        <span className="text-xs text-slate-300">· {doc.tema_principal}</span>
                      )}
                    </div>
                    {doc.resum && (
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{doc.resum}</p>
                    )}
                    {doc.per_a_l_oposicio && (
                      <p className="text-xs text-orange-600 mt-1 font-medium">⚡ {doc.per_a_l_oposicio}</p>
                    )}
                  </div>
                  <a href={doc.url_original} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 text-slate-300 hover:text-blue-500 flex-shrink-0">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
