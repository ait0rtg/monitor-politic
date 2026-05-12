import { createClient } from '@/lib/supabase/server'
import AssessorClient from '@/components/assessor/AssessorClient'

export default async function AssessorPage() {
  const supabase = await createClient()
  const { data: sessions } = await supabase
    .from('assessor_sessions')
    .select('id, titol, created_at, updated_at, missatges')
    .order('updated_at', { ascending: false })
    .limit(20)

  return (
    <div className="h-[calc(100vh-80px)]">
      <AssessorClient sessions={sessions || []} />
    </div>
  )
}
