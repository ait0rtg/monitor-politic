'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Plus, Trash2, History, Search, Paperclip, X, Download, ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import { formatData } from '@/lib/utils'

type Missatge = { rol: 'user' | 'assistant'; text: string; timestamp: string }
type Sessio = { id: string; titol: string; created_at: string; updated_at: string; missatges?: Missatge[] }
type Doc = { id: string; titol: string; font: string; classificacio: string; resum?: string }

const MISSATGE_INICIAL: Missatge = {
  rol: 'assistant',
  text: 'Hola! Soc el teu assessor polític municipal. Puc ajudar-te amb:\n\n• Normativa municipal i autonòmica\n• Redacció de preguntes, mocions i al·legacions\n• Interpretació de documents i contractes\n• Estratègies de fiscalització\n• Qualsevol tema d\'interès per a un regidor\n\nPots adjuntar documents de la base de dades per analitzar-los. Com et puc ajudar?',
  timestamp: new Date().toISOString(),
}

const CLASSIF_COLOR: Record<string, string> = {
  URGENT: 'text-red-600', IMPORTANT: 'text-orange-500', INFORMATIU: 'text-green-600',
}

export default function AssessorClient({ sessions: initialSessions }: { sessions: Sessio[] }) {
  const [sessions, setSessions] = useState<Sessio[]>(initialSessions)
  const [sessioActual, setSessioActual] = useState<string | null>(null)
  const [missatges, setMissatges] = useState<Missatge[]>([MISSATGE_INICIAL])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [panellHistorial, setPanellHistorial] = useState(false)
  const [panellCerca, setPanellCerca] = useState(false)
  const [cerca, setCerca] = useState('')
  const [docsResultat, setDocsResultat] = useState<Doc[]>([])
  const [docsAdjunts, setDocsAdjunts] = useState<Doc[]>([])
  const [cercant, setCercant] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [missatges, loading])

  async function cercarDocs(q: string) {
    if (q.length < 3) { setDocsResultat([]); return }
    setCercant(true)
    try {
      const res = await fetch(`/api/assessor/cerca?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setDocsResultat(data.documents || [])
    } catch { setDocsResultat([]) }
    finally { setCercant(false) }
  }

  function adjuntarDoc(doc: Doc) {
    if (docsAdjunts.find(d => d.id === doc.id)) return
    setDocsAdjunts(prev => [...prev, doc])
    toast.success('Document adjuntat')
  }

  async function guardarSessio(msgs: Missatge[], id: string | null): Promise<string> {
    const res = await fetch('/api/assessor/sessio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ missatges: msgs, sessioId: id }),
    })
    const data = await res.json()
    return data.sessioId
  }

  async function handleEnviar() {
    if (!input.trim() || loading) return
    const consulta = input.trim()
    setInput('')

    const nouUser: Missatge = {
      rol: 'user',
      text: consulta + (docsAdjunts.length > 0
        ? `\n\n[Documents adjunts: ${docsAdjunts.map(d => d.titol).join(', ')}]` : ''),
      timestamp: new Date().toISOString(),
    }

    const nousMissatges = [...missatges, nouUser]
    setMissatges(nousMissatges)
    setDocsAdjunts([])
    setLoading(true)

    try {
      const res = await fetch('/api/assessor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consulta,
          historial: missatges.slice(-12),
          documents_adjunts: docsAdjunts,
        }),
      })
      const data = await res.json()
      const resposta = data.resposta || 'Error en la resposta.'

      const nouAssistant: Missatge = {
        rol: 'assistant',
        text: resposta,
        timestamp: new Date().toISOString(),
      }

      const msgsActualitzats = [...nousMissatges, nouAssistant]
      setMissatges(msgsActualitzats)

      // Guardar a Supabase
      const nouId = await guardarSessio(msgsActualitzats, sessioActual)
      if (!sessioActual) {
        setSessioActual(nouId)
        const titol = consulta.slice(0, 50) + (consulta.length > 50 ? '...' : '')
        setSessions(prev => [{ id: nouId, titol, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, ...prev])
      } else {
        setSessions(prev => prev.map(s => s.id === sessioActual ? { ...s, updated_at: new Date().toISOString() } : s))
      }
    } catch {
      toast.error('Error de connexió')
    } finally {
      setLoading(false)
    }
  }

  function novaSessio() {
    setSessioActual(null)
    setMissatges([MISSATGE_INICIAL])
    setDocsAdjunts([])
    setPanellHistorial(false)
  }

  function carregarSessio(s: Sessio) {
    if (!s.missatges || s.missatges.length === 0) return
    setSessioActual(s.id)
    setMissatges(s.missatges)
    setPanellHistorial(false)
  }

  async function eliminarSessio(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await fetch(`/api/assessor/sessio?id=${id}`, { method: 'DELETE' })
    setSessions(prev => prev.filter(s => s.id !== id))
    if (sessioActual === id) novaSessio()
    toast.success('Sessió eliminada')
  }

  function exportarConversa() {
    const text = missatges
      .map(m => `[${m.rol === 'user' ? 'Tu' : 'Assessor'}] ${new Date(m.timestamp).toLocaleString('ca-ES')}\n${m.text}`)
      .join('\n\n' + '─'.repeat(40) + '\n\n')
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `assessor-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-full border border-slate-200 rounded-xl overflow-hidden bg-white">

      {/* Panell historial */}
      {panellHistorial && (
        <div className="w-64 border-r border-slate-200 flex flex-col flex-shrink-0">
          <div className="px-3 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Converses</h3>
            <button onClick={() => setPanellHistorial(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
          <button onClick={novaSessio}
            className="flex items-center gap-2 mx-3 mt-2 mb-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Nova conversa
          </button>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Cap conversa guardada</p>
            ) : (
              sessions.map(s => (
                <div key={s.id}
                  onClick={() => carregarSessio(s)}
                  className={`flex items-start gap-2 px-3 py-2 rounded-lg cursor-pointer group transition-colors ${sessioActual === s.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{s.titol || 'Conversa'}</p>
                    <p className="text-xs text-slate-400">{formatData(s.updated_at)}</p>
                  </div>
                  <button onClick={e => eliminarSessio(s.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-300 hover:text-red-400 flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Àrea principal */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Capçalera */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <button onClick={() => setPanellHistorial(!panellHistorial)}
            className={`p-1.5 rounded-lg transition-colors ${panellHistorial ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
            title="Historial de converses">
            <History className="w-4 h-4" />
          </button>
          <Bot className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-slate-700 flex-1">
            {sessioActual ? (sessions.find(s => s.id === sessioActual)?.titol || 'Assessor IA') : 'Assessor IA'}
          </span>
          <span className="text-xs text-slate-400">{missatges.length - 1} missatge{missatges.length !== 2 ? 's' : ''}</span>
          <button onClick={() => setPanellCerca(!panellCerca)}
            className={`p-1.5 rounded-lg transition-colors ${panellCerca ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
            title="Adjuntar document">
            <Paperclip className="w-4 h-4" />
          </button>
          <button onClick={exportarConversa}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Exportar">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={novaSessio}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Nova conversa">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Panell cerca documents */}
        {panellCerca && (
          <div className="border-b border-slate-100 px-4 py-3 bg-blue-50/50 flex-shrink-0">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input type="text" value={cerca}
                onChange={e => { setCerca(e.target.value); cercarDocs(e.target.value) }}
                placeholder="Cerca documents per adjuntar..."
                className="w-full pl-8 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            {docsAdjunts.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {docsAdjunts.map(d => (
                  <span key={d.id} className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {d.titol.slice(0, 30)}
                    <button onClick={() => setDocsAdjunts(prev => prev.filter(x => x.id !== d.id))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {cercant && <p className="text-xs text-slate-400 text-center py-1">Cercant...</p>}
            {docsResultat.length > 0 && (
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {docsResultat.map(d => (
                  <button key={d.id} onClick={() => adjuntarDoc(d)}
                    className="w-full text-left px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${CLASSIF_COLOR[d.classificacio] || ''}`}>●</span>
                      <span className="text-xs font-medium text-slate-700 flex-1 truncate">{d.titol}</span>
                      <span className="text-xs text-slate-400 flex-shrink-0">{d.font}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Missatges */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {missatges.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.rol === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.rol === 'assistant' && (
                <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-blue-600" />
                </div>
              )}
              <div className="flex flex-col gap-1 max-w-2xl">
                <div className={`px-4 py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                  m.rol === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-slate-100 text-slate-800 rounded-bl-none'
                }`}>
                  {m.text}
                </div>
                <span className={`text-xs text-slate-300 ${m.rol === 'user' ? 'text-right' : ''}`}>
                  {new Date(m.timestamp).toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {m.rol === 'user' && (
                <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-slate-600" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-blue-600" />
              </div>
              <div className="bg-slate-100 px-4 py-3 rounded-xl rounded-bl-none">
                <div className="flex gap-1">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-slate-100 flex-shrink-0">
          {docsAdjunts.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {docsAdjunts.map(d => (
                <span key={d.id} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">
                  📎 {d.titol.slice(0, 25)}
                  <button onClick={() => setDocsAdjunts(prev => prev.filter(x => x.id !== d.id))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleEnviar()}
              placeholder={docsAdjunts.length > 0 ? `Pregunta sobre els ${docsAdjunts.length} documents adjunts...` : 'Escriu la teva consulta... (Enter per enviar)'}
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button onClick={handleEnviar} disabled={loading || !input.trim()}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
