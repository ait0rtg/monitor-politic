'use client'

import { useState } from 'react'
import { Users, FileText, AlertTriangle, Target, RefreshCw, Check, X, Shield } from 'lucide-react'
import { formatData } from '@/lib/utils'
import { toast } from 'sonner'

type Usuari = { id: string; email: string; nom: string; role: string; aprovat: boolean; created_at: string; last_login?: string }
type SyncLog = { font: string; estat: string; nous_docs: number; missatge?: string; created_at: string }

export default function AdminClient({
  usuaris: initial, stats, syncLogs
}: {
  usuaris: Usuari[]
  stats: { totalDocs: number; urgents: number; compromisos: number }
  syncLogs: SyncLog[]
}) {
  const [usuaris, setUsuaris] = useState(initial)
  const [tab, setTab] = useState<'stats' | 'usuaris' | 'logs' | 'sistema'>('stats')
  const [loading, setLoading] = useState<string | null>(null)

  async function aprovar(id: string, aprovat: boolean) {
    setLoading(id)
    try {
      const res = await fetch('/api/admin/usuaris', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, aprovat }),
      })
      if (!res.ok) throw new Error('Error')
      setUsuaris(prev => prev.map(u => u.id === id ? { ...u, aprovat } : u))
      toast.success(aprovat ? 'Usuari aprovat' : 'Usuari desactivat')
    } catch {
      toast.error('Error actualitzant l\'usuari')
    } finally {
      setLoading(null)
    }
  }

  async function canviarRol(id: string, role: string) {
    setLoading(id + role)
    try {
      const res = await fetch('/api/admin/usuaris', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, role }),
      })
      if (!res.ok) throw new Error('Error')
      setUsuaris(prev => prev.map(u => u.id === id ? { ...u, role } : u))
      toast.success('Rol actualitzat')
    } catch {
      toast.error('Error actualitzant el rol')
    } finally {
      setLoading(null)
    }
  }

  const TABS = [
    { key: 'stats', label: 'Resum' },
    { key: 'usuaris', label: `Usuaris (${usuaris.length})` },
    { key: 'logs', label: 'Logs sync' },
    { key: 'sistema', label: 'Sistema' },
  ] as const

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-1">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Resum */}
      {tab === 'stats' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">{stats.totalDocs}</div>
                  <div className="text-xs text-slate-500">Documents a la BD</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">{stats.urgents}</div>
                  <div className="text-xs text-slate-500">Documents urgents actius</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">{stats.compromisos}</div>
                  <div className="text-xs text-slate-500">Compromisos pendents</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-700 mb-3">Variables d'entorn necessàries</h3>
            <div className="space-y-2">
              {[
                { nom: 'NEXT_PUBLIC_SUPABASE_URL', desc: 'URL del projecte Supabase' },
                { nom: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', desc: 'Clau pública Supabase' },
                { nom: 'SUPABASE_SERVICE_KEY', desc: 'Clau service role (secret)' },
                { nom: 'OPENAI_API_KEY', desc: 'Clau API OpenAI (sk-proj-...)' },
                { nom: 'TELEGRAM_BOT_TOKEN', desc: 'Token del bot Telegram' },
                { nom: 'TELEGRAM_CHAT_ID', desc: 'ID del xat Telegram' },
                { nom: 'CRON_SECRET', desc: 'Secret per protegir els crons' },
              ].map(v => (
                <div key={v.nom} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <code className="text-xs font-mono text-blue-600">{v.nom}</code>
                  <span className="text-xs text-slate-400">{v.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Usuaris */}
      {tab === 'usuaris' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Usuari</th>
                <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Rol</th>
                <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Estat</th>
                <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Registre</th>
                <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Accions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usuaris.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{u.nom}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={e => canviarRol(u.id, e.target.value)}
                      disabled={u.email === 'aitor.tendero@gmail.com'}
                      className="text-xs border border-slate-200 rounded px-2 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="user">Usuari</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.aprovat ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {u.aprovat ? 'Aprovat' : 'Pendent'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{formatData(u.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {u.email !== 'aitor.tendero@gmail.com' && (
                      <button
                        onClick={() => aprovar(u.id, !u.aprovat)}
                        disabled={loading === u.id}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                          u.aprovat
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                      >
                        {u.aprovat ? 'Desactivar' : 'Aprovar'}
                      </button>
                    )}
                    {u.email === 'aitor.tendero@gmail.com' && (
                      <span className="text-xs text-slate-300 flex items-center gap-1 justify-end">
                        <Shield className="w-3 h-3" /> Admin immutable
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Logs */}
      {tab === 'logs' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-700">Últimes sincronitzacions</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {syncLogs.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">Cap log de sincronització</p>
            ) : (
              syncLogs.map((log, i) => (
                <div key={i} className="px-4 py-3 flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${log.estat === 'ok' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-700">{log.font}</span>
                      {log.nous_docs > 0 && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">+{log.nous_docs}</span>
                      )}
                    </div>
                    {log.missatge && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{log.missatge.slice(0, 100)}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">{formatData(log.created_at, 'dd/MM HH:mm')}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Sistema */}
      {tab === 'sistema' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-700 mb-3">Crons configurats</h3>
            <div className="space-y-2">
              {[
                { path: '/api/cron/vigilancia', schedule: 'Cada dia feiner a les 7:00h', desc: 'Importa documents de les 4 fonts' },
                { path: '/api/cron/recordatoris', schedule: 'Cada dia feiner a les 8:00h', desc: 'Alertes Telegram de venciments' },
                { path: '/api/pdf', schedule: 'Cada dia feiner a les 7:30h', desc: 'Processa text dels PDFs pendents' },
              ].map(c => (
                <div key={c.path} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <code className="text-xs font-mono text-blue-600">{c.path}</code>
                    <p className="text-xs text-slate-400 mt-0.5">{c.desc}</p>
                  </div>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">{c.schedule}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-700 mb-3">Fonts de dades</h3>
            <div className="space-y-2">
              {[
                { nom: 'E-Tauler', url: 'tauler.seu-e.cat', tipus: 'RSS' },
                { nom: 'Perfil Contractant', url: 'analisi.transparenciacatalunya.cat', tipus: 'Open Data API' },
                { nom: 'Junta de Govern', url: 'ciutada.platjadaro.com', tipus: 'WordPress API' },
                { nom: 'BPM Decrets', url: 'bpm.platjadaro.cat', tipus: 'HTTP scraping' },
              ].map(f => (
                <div key={f.nom} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <span className="text-sm font-medium text-slate-700">{f.nom}</span>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">{f.url}</span>
                    <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{f.tipus}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
