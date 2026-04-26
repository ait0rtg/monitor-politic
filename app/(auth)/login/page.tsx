'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error('Credencials incorrectes. Torna-ho a intentar.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <h2 className="text-xl font-semibold text-slate-800 mb-6">Inicia sessió</h2>
      <form onSubmit={handleLogin} className="space-y-4">
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
            placeholder="••••••••" />
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600" />
            <span className="text-sm text-slate-600">Recorda'm</span>
          </label>
          <Link href="/reset-password" className="text-sm text-blue-600 hover:underline">
            Has oblidat la contrasenya?
          </Link>
        </div>
        <button type="submit" disabled={loading}
          className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-60">
          {loading ? 'Entrant...' : 'Inicia sessió'}
        </button>
      </form>
      <p className="text-center text-sm text-slate-500 mt-4">
        No tens compte?{' '}
        <Link href="/register" className="text-blue-600 hover:underline font-medium">Registra't</Link>
      </p>
    </div>
  )
}
