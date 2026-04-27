'use client'
import { useState } from 'react'
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'

export default function MonitoratgeButton() {
  const [loading, setLoading] = useState(false)
  const [resultat, setResultat] = useState<{ nous: number } | null>(null)
  const [error, setError] = useState('')

  async function executar() {
    setLoading(true)
    setResultat(null)
    setError('')
    try {
      const res = await fetch('/api/monitoratge', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResultat(data)
      setTimeout(() => window.location.reload(), 2000)
    } catch (e: any) {
      setError(e.message || 'Error executant el monitoratge.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {resultat && (
        <span className="flex items-center gap-1 text-sm text-green-600">
          <CheckCircle className="w-4 h-4" />
          {resultat.nous} documents nous
        </span>
      )}
      {error && (
        <span className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          {error}
        </span>
      )}
      <button
        onClick={executar}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60">
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Actualitzant...' : 'Actualitzar fonts'}
      </button>
    </div>
  )
}
