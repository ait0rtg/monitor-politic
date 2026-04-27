import { createClient } from '@/lib/supabase/server'
import DocumentsTable from '@/components/documents/DocumentsTable'
import DocumentsFilters from '@/components/documents/DocumentsFilters'

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const sp = await searchParams

  const page = parseInt(sp.page || '1')
  const limit = 25
  const offset = (page - 1) * limit

  let query = supabase
    .from('monitoratge')
    .select('*', { count: 'exact' })
    .order('data_deteccio', { ascending: false })
    .range(offset, offset + limit - 1)

  if (sp.classificacio) query = query.eq('classificacio', sp.classificacio)
  if (sp.font) query = query.eq('font', sp.font)
  if (sp.tema) query = query.eq('tema_principal', sp.tema)
  if (sp.estat) query = query.eq('estat_seguiment', sp.estat)
  if (sp.search) query = query.or(`titol.ilike.%${sp.search}%,resum.ilike.%${sp.search}%`)

  const { data: documents, count } = await query

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Documents</h1>
          <p className="text-sm text-slate-500">{count || 0} documents trobats</p>
        </div>
        <a href="/api/documents/export" className="text-sm text-blue-600 hover:underline">
          Exportar CSV
        </a>
      </div>
      <DocumentsFilters />
      <DocumentsTable documents={documents || []} total={count || 0} page={page} limit={limit} userEmail={user?.email} />
    </div>
  )
}
