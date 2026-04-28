import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Obtenim o creem el perfil
  let profile = null
  const { data: existingProfile } = await supabase
    .from('usuaris')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!existingProfile) {
    // Si no existeix el perfil el creem
    const isAdmin = user.email === 'aitor.tendero@gmail.com'
    await supabase.from('usuaris').insert({
      id: user.id,
      email: user.email!,
      nom: user.user_metadata?.nom || user.email!.split('@')[0],
      role: isAdmin ? 'admin' : 'user',
      aprovat: isAdmin,
    })
    profile = { nom: user.email!.split('@')[0], role: isAdmin ? 'admin' : 'user', aprovat: isAdmin }
  } else {
    profile = existingProfile
  }

  // Admin sempre passa
  const isAdmin = user.email === 'aitor.tendero@gmail.com'
  if (!profile?.aprovat && !isAdmin) {
    redirect('/pending')
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar userEmail={user.email || ''} userName={profile?.nom || ''} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar userEmail={user.email || ''} userName={profile?.nom || ''} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
