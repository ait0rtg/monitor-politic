'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Search, Paperclip, X, Trash2, Download } from 'lucide-react'
import { toast } from 'sonner'

type Missatge = { rol: 'user' | 'assistant'; text: string; timestamp: string }
type Doc = { id: string; titol: string; font: string; classificacio: string; resum?: string }

const STORAGE_KEY = 'assessor_historial'

function loadHistorial(): Missatge[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveHistorial(msgs: Missatge[]) {
  try {
    // Guardar màxim 100 missatges
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-100)))
  } catch {}
}

export default function AssessorClient() {
  const [missatges, setMissatges] = useState<Missatge[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCerca, setShowCerca] = useState(false)
  const [cerca, setCerca] = useState('')
  const [docsResultat, setDocsResultat] = useState<Doc[]>([])
  const [docsAdjunts, setDocsAdjunts] = useState<Doc[]>([])
  const [cercant, setCercant] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Carregar historial de localStorage
  useEffect(() => {
    const saved = loadHistorial()
    if (saved.length > 0) {
      setMissatges(saved)
    } else {
      setMissatges([{
        rol: 'assistant',
        text: 'Hola! Soc el teu assessor polític. Puc ajudar-te amb normativa municipal, estratègies, redacció de preguntes i mocions, interpretació de documents, contractació pública, urbanisme i qualsevol tema d\'interès municipal.\n\nPots adjuntar documents de la base de dades per treballar-los. Com et puc ajudar?',
        timestamp: new Date().toISOString(),
      }])
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [missatges])

  async function cercarDocuments(q: string) {
    if (q.length < 3) { setDocsResultat([]); return }
    setCercant(true)
    try {
      const res = await fetch(`/api/assessor/cerca?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setDocsResultat(data.documents || [])
    } catch {
      setDocsResultat([])
    } finally {
      setCercant(false)
    }
  }

  function adjuntarDoc(doc: Doc) {
    if (docsAdjunts.find(d => d.id === doc.id)) return
    setDocsAdjunts(prev => [...prev, doc])
    toast.success(`Document adjuntat: ${doc.titol.slice(0, 40)}...`)
  }

  function eliminarAdjunt(id: string) {
    setDocsAdjunts(prev => prev.filter(d => d.id !== id))
  }

  async function handleEnviar() {
    if (!input.trim() || loading) return
    const consulta = input.trim()
    setInput('')

    const nouMissatgeUser: Missatge = {
      rol: 'user',
      text: consulta + (docsAdjunts.length > 0
        ? `\n\n[Documents adjunts: ${docsAdjunts.map(d => d.titol).join(', ')}]`
        : ''),
      timestamp: new Date().toISOString(),
    }

    const nousMissatges = [...missatges, nouMissatgeUser]
    setMissatges(nousMissatges)
    saveHistorial(nousMissatges)
    setLoading(true)

    try {
      const res = await fetch('/api/assessor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consulta,
          historial: missatges.slice(-10),
          documents_adjunts: docsAdjunts,
        }),
      })
      const data = await res.json()
      const resposta = data.resposta || 'Error en la resposta.'

      const nouMissatgeAssistant: Missatge = {
        rol: 'assistant',
        text: resposta,
        timestamp: new Date().toISOString(),
      }

      const missatgesActualitzats = [...nousMissatges, nouMissatgeAssistant]
      setMissatges(missatgesActualitzats)
      saveHistorial(missatgesActualitzats)
      setDocsAdjunts([])
    } catch {
      const error: Missatge = { rol: 'assistant', text: 'Error de connexió.', timestamp: new Date().toISOString() }
      setMissatges(prev => [...prev, error])
    } finally {
      setLoading(false)
    }
  }

  function netejarHistorial() {
    localStorage.removeItem(STORAGE_KEY)
    setMissatges([{
      rol: 'assistant',
      text: 'Historial netejat. Com et puc ajudar?',
      timestamp: new Date().toISOString(),
    }])
    toast.success('Historial netejat')
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

  const CLASSIF_COLOR: Record<string, string> = {
    URGENT: 'text-red-600', IMPORTANT: 'text-orange-500', INFORMATIU: 'text-green-600'
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-xl border border-slate-200 overflow-hidden">

      {/* Capçalera */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-slate-700">Assessor IA</span>
          <span className="text-xs text-slate-400">· {missatges.length - 1} missatges</span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => { setShowCerca(!showCerca); setTimeout(() => inputRef.current?.focus(), 100) }}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors ${showCerca ? 'bg-blue-50 text-blue-600' : ''}`}
            title="Adjuntar document">
            <Paperclip className="w-4 h-4" />
          </button>
          <button onClick={exportarConversa}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Exportar conversa">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={netejarHistorial}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Netejar historial">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Panell cerca documents */}
      {showCerca && (
        <div className="border-b border-slate-100 p-3 bg-blue-50/50">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={cerca}
              onChange={e => { setCerca(e.target.value); cercarDocuments(e.target.value) }}
              placeholder="Cerca documents per adjuntar..."
              className="w-full pl-8 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* Documents adjunts */}
          {docsAdjunts.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {docsAdjunts.map(d => (
                <span key={d.id} className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {d.titol.slice(0, 30)}...
                  <button onClick={() => eliminarAdjunt(d.id)}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}

          {/* Resultats cerca */}
          {cercant && <p className="text-xs text-slate-400 text-center py-2">Cercant...</p>}
          {docsResultat.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {docsResultat.map(d => (
                <button key={d.id} onClick={() => adjuntarDoc(d)}
                  className="w-full text-left px-3 py-2 bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${CLASSIF_COLOR[d.classificacio] || ''}`}>●</span>
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
      <div className="p-4 border-t border-slate-100">
        {docsAdjunts.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {docsAdjunts.map(d => (
              <span key={d.id} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">
                📎 {d.titol.slice(0, 25)}...
                <button onClick={() => eliminarAdjunt(d.id)}><X className="w-3 h-3" /></button>
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
            placeholder={docsAdjunts.length > 0 ? `Pregunta sobre els ${docsAdjunts.length} documents adjunts...` : 'Escriu la teva consulta...'}
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button onClick={handleEnviar} disabled={loading || !input.trim()}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-1.5">Enter per enviar · 📎 per adjuntar documents</p>
      </div>
    </div>
  )
}
