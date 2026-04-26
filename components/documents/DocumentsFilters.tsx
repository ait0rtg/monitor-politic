'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export default function DocumentsFilters() {
  const router = useRouter()
  const params = useSearchParams()

  const update = useCallback((key: string, value: string) => {
    const p = new URLSearchParams(params.toString())
    if (value) p.set(key, value); else p.delete(key)
    p.delete('page')
    router.push(`?${p.toString()}`)
  }, [params, router])

  return (
    <div className="flex flex-wrap gap-2">
      <input type="text" placeholder="Cercar per títol o resum..."
        defaultValue={params.get('search') || ''}
        onChange={e => update('search', e.target.value)}
        className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52" />
      <select onChange={e => update('classificacio', e.target.value)} defaultValue={params.get('classificacio') || ''}
        className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        <option value="">Totes les urgències</option>
        <option value="URGENT">Urgent</option>
        <option value="IMPORTANT">Important</option>
        <option value="INFORMATIU">Informatiu</option>
      </select>
      <select onChange={e => update('estat', e.target.value)} defaultValue={params.get('estat') || ''}
        className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        <option value="">Tots els estats</option>
        <option value="pendent">Pendent</option>
        <option value="en_curs">En curs</option>
        <option value="tancat">Tancat</option>
      </select>
    </div>
  )
}
