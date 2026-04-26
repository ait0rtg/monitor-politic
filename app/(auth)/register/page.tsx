'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function RegisterPage() {
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('La contrasenya ha de tenir almenys 8 caràcters.')
      return
    }
    setLoading(true)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, email, password }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || 'Error en el registre.')
      setLoading(false)
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">📋</span>
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Sol·licitud enviada</h2>
        <p className="text-sm text-slate-500">
          El teu accés està pendent d'aprovació per l'administrador.
          Rebràs un email quan sigui aprovat.
        </p>
        <Link href="/login" className="inline-block mt-4 text-sm text-blue-600 hover:underline">
          Tornar al login
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <h2 className="text-xl font-semibold text-slate-800 mb-6">Crea un compte</h2>
      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nom complet</label>
          <input type="text" value={nom} onChange={e => setNom(e.target.value)} required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="El teu nom" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="el-teu@email.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Contrasenya</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Mínim 8 caràcters" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-60">
          {loading ? 'Enviant...' : 'Sol·licitar accés'}
        </button>
      </form>
      <p className="text-center text-sm text-slate-500 mt-4">
        Ja tens compte?{' '}
        <Link href="/login" className="text-blue-600 hover:underline font-medium">Inicia sessió</Link>
      </p>
    </div>
  )
}
