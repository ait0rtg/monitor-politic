'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FileText, Target, BarChart3,
  LogOut, Shield, MessageSquare, Calendar,
  Brain, FileEdit, Menu, X, Smartphone, CalendarDays
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { isAdmin, cn, getInitials } from '@/lib/utils'
import { useState } from 'react'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/agenda', label: 'Agenda de Plens', icon: CalendarDays },
  { href: '/calendari', label: 'Calendari', icon: Calendar },
  { href: '/assessor', label: 'Assessor IA', icon: MessageSquare, highlight: true },
  { href: '/memoria', label: 'Memòria Política', icon: Brain },
  { href: '/alegacions', label: 'Al·legacions', icon: FileEdit },
  { href: '/compromisos', label: 'Compromisos', icon: Target },
  { href: '/analisi', label: 'Anàlisi', icon: BarChart3 },
  { href: '/preguntes-ple', label: 'Preguntes pel Ple', icon: FileText },
  { href: '/ple', label: 'Mode Ple 📱', icon: Smartphone },
]

function NavLink({ href, label, icon: Icon, highlight, pathname }: {
  href: string; label: string; icon: any; highlight?: boolean; pathname: string
}) {
  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  return (
    <Link href={href} className={cn(
      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
      active ? 'bg-blue-50 text-blue-700'
        : highlight ? 'text-blue-600 hover:bg-blue-50'
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
    )}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">{label}</span>
      {highlight && !active && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />}
    </Link>
  )
}

export default function Sidebar({ userEmail, userName }: { userEmail: string; userName: string }) {
  const pathname = usePathname()
  const admin = isAdmin(userEmail)
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const content = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-blue-800 leading-tight">Monitor Polític</div>
          <div className="text-xs text-slate-400">Castell-Platja d'Aro</div>
        </div>
        <button onClick={() => setMobileOpen(false)} className="lg:hidden p-1 rounded text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map(item => <NavLink key={item.href} {...item} pathname={pathname} />)}
        {admin && (
          <>
            <div className="border-t border-slate-100 my-2" />
            <Link href="/admin" className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith('/admin') ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-50'
            )}>
              <Shield className="w-4 h-4" /> Administració
            </Link>
          </>
        )}
      </nav>

      <div className="p-3 border-t border-slate-100">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {getInitials(userName || userEmail)}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-700 truncate">{userName || userEmail}</div>
            <div className="text-xs text-slate-400 truncate">{userEmail}</div>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
          <LogOut className="w-3.5 h-3.5" /> Tancar sessió
        </button>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden lg:flex w-56 bg-white border-r border-slate-200 flex-col h-full">{content}</aside>
      <button onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-40 p-2 bg-white border border-slate-200 rounded-lg shadow-sm">
        <Menu className="w-5 h-5 text-slate-600" />
      </button>
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-56 bg-white border-r border-slate-200 flex flex-col h-full z-50">{content}</aside>
        </div>
      )}
    </>
  )
}
