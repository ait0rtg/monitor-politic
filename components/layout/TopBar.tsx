'use client'

import { usePathname } from 'next/navigation'

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/documents': 'Documents',
  '/assistent': 'Assistent de Preparació',
  '/compromisos': 'Compromisos del govern',
  '/analisi': 'Anàlisi avançada',
  '/admin': 'Administració',
}

export default function TopBar({ userEmail, userName }: { userEmail: string; userName: string }) {
  const pathname = usePathname()
  const title = Object.entries(TITLES).find(([k]) => pathname.startsWith(k))?.[1] || ''

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6">
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
    </header>
  )
}
