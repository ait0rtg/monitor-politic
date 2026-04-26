import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/utils'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check if user is approved
  const { data: profile } = await supabase
    .from('usuaris')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile?.aprovat && !isAdmin(user.email)) {
    redirect('/pending')
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar userEmail={user.email || ''} userName={profile?.nom || ''} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar userEmail={user.email || ''} userName={profile?.nom || ''} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
