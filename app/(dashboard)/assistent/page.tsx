'use client'

import { useState } from 'react'
import { Search, FileText, AlertTriangle, HelpCircle, Zap } from 'lucide-react'
import { toast } from 'sonner'

interface AssistentResult {
  resum_executiu: string
  antecedents: string
  acords_vigents: string
  imports_contractes: string
  vulnerabilitats: string
  preguntes_suggerides: string[]
  documents_font: { titol: string; url: string }[]
}

const EXEMPLES = [
  "Quins antecedents hi ha sobre la contracta de neteja viaria?",
  "Tot el que saps sobre les ordenances de terrasses i veladors",
  "Historial complet de contractes de jardineria municipal",
  "Acords i decisions sobre l'habitatge turístic al municipi",
  "Quines licitacions estan actives o han vençut recentment?",
  "Antecedents sobre la zona de Can Bas i el seu desenvolupament urbanístic",
]

export default function AssistentPage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AssistentResult | null>(null)
  const [idioma, setIdioma] = useState<'ca' | 'es'>('ca')

  async function handleQuery(q?: string) {
    const pregunta = q || query
    if (!pregunta.trim()) return
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/assistent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregunta, idioma }),
      })
      if (!res.ok) throw new Error('Error en la consulta')
      const data = await res.json()
      setResult(data)
    } catch {
      toast.error('Error en la consulta. Torna-ho a intentar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Zap className="w-6 h-6 text-blue-600" />
          Assistent de Preparació
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Pregunta en llenguatge natural. Rebràs un informe complet amb tot el context disponible.
        </p>
      </div>

      {/* Search box */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex gap-2 mb-3">
          <button onClick={() => setIdioma('ca')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${idioma === 'ca' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}>
            Català
          </button>
          <button onClick={() => setIdioma('es')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${idioma === 'es' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}>
            Castellà
          </button>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleQuery()}
              placeholder="Exemple: 'Tot el que hi ha sobre la contracta de neteja viaria'"
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => handleQuery()}
            disabled={loading || !query.trim()}
            className="px-5 py-3 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 whitespace-nowrap">
            {loading ? 'Analitzant...' : 'Consultar'}
          </button>
        </div>
      </div>

      {/* Examples */}
      {!result && !loading && (
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Exemples de consultes</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EXEMPLES.map((ex, i) => (
              <button key={i} onClick={() => { setQuery(ex); handleQuery(ex) }}
                className="text-left px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-3" />
          <p className="text-sm text-slate-500">Consultant la base de dades i generant l'informe...</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {/* Resum executiu */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <h3 className="font-semibold text-blue-900 text-sm uppercase tracking-wide mb-2">Resum executiu</h3>
            <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">{result.resum_executiu}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Antecedents */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-1.5 mb-3">
                <FileText className="w-4 h-4 text-slate-400" />
                Antecedents i historial
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{result.antecedents}</p>
            </div>

            {/* Acords vigents */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-1.5 mb-3">
                <FileText className="w-4 h-4 text-green-500" />
                Acords vigents
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{result.acords_vigents}</p>
            </div>

            {/* Imports */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-1.5 mb-3">
                <FileText className="w-4 h-4 text-orange-400" />
                Imports i contractes
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{result.imports_contractes}</p>
            </div>

            {/* Vulnerabilitats */}
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
              <h3 className="font-semibold text-orange-800 text-sm flex items-center gap-1.5 mb-3">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Vulnerabilitats del govern
              </h3>
              <p className="text-sm text-orange-900 leading-relaxed whitespace-pre-wrap">{result.vulnerabilitats}</p>
            </div>
          </div>

          {/* Preguntes suggerides */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-1.5 mb-3">
              <HelpCircle className="w-4 h-4 text-blue-500" />
              Preguntes suggerides per al ple
            </h3>
            <ol className="space-y-2">
              {result.preguntes_suggerides.map((q, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700">
                  <span className="font-semibold text-blue-600 min-w-[20px]">{i + 1}.</span>
                  {q}
                </li>
              ))}
            </ol>
          </div>

          {/* Documents font */}
          {result.documents_font?.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h3 className="font-semibold text-slate-600 text-xs uppercase tracking-wide mb-3">
                Documents consultats ({result.documents_font.length})
              </h3>
              <ul className="space-y-1.5">
                {result.documents_font.map((doc, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full flex-shrink-0" />
                    {doc.url ? (
                      <a href={doc.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline truncate">{doc.titol}</a>
                    ) : (
                      <span className="text-xs text-slate-500 truncate">{doc.titol}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button onClick={() => { setResult(null); setQuery('') }}
            className="text-sm text-slate-500 hover:text-slate-700 underline">
            Nova consulta
          </button>
        </div>
      )}
    </div>
  )
}
