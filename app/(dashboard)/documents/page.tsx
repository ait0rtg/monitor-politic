import { createClient } from '@/lib/supabase/server'
import DocumentsTable from '@/components/documents/DocumentsTable'
import DocumentsFilters from '@/components/documents/DocumentsFilters'

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const page = parseInt(searchParams.page || '1')
  const limit = 25
  const offset = (page - 1) * limit

  let query = supabase
    .from('monitoratge')
    .select('*', { count: 'exact' })
    .order('data_deteccio', { ascending: false })
    .range(offset, offset + limit - 1)

  if (searchParams.classificacio) query = query.eq('classificacio', searchParams.classificacio)
  if (searchParams.font) query = query.eq('font', searchParams.font)
  if (searchParams.tema) query = query.eq('tema_principal', searchParams.tema)
  if (searchParams.estat) query = query.eq('estat_seguiment', searchParams.estat)
  if (searchParams.search) {
    query = query.or(`titol.ilike.%${searchParams.search}%,resum.ilike.%${searchParams.search}%`)
  }

  const { data: documents, count } = await query

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Documents</h1>
          <p className="text-sm text-slate-500">{count || 0} documents trobats</p>
        </div>
        <a href="/api/documents/export" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
          Exportar CSV
        </a>
      </div>

      <DocumentsFilters />
      <DocumentsTable documents={documents || []} total={count || 0} page={page} limit={limit} userEmail={user?.email} />
    </div>
  )
}
