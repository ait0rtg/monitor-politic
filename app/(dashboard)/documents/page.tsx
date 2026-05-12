import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import DocumentsFilters from '@/components/documents/DocumentsFilters'
import DocumentsTable from '@/components/documents/DocumentsTable'
import ActualitzarButton from '@/components/documents/ActualitzarButton'
import { Suspense } from 'react'

type SearchParams = { [key: string]: string | undefined }

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Usar client admin per garantir lectura independentment de RLS
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false } }
  )

  const page = Math.max(1, parseInt(params.page || '1'))
  const limit = 25
  const offset = (page - 1) * limit
  const mostrarArxivats = params.arxivats === '1'

  let query = admin
    .from('monitoratge')
    .select('*', { count: 'exact' })
    .order('data_deteccio', { ascending: false })
    .range(offset, offset + limit - 1)

  if (!mostrarArxivats) query = query.neq('estat_seguiment', 'tancat')
  if (params.classificacio) query = query.eq('classificacio', params.classificacio)
  if (params.font) query = query.eq('font', params.font)
  if (params.tema) query = query.eq('tema_principal', params.tema)
  if (params.estat) query = query.eq('estat_seguiment', params.estat)
  if (params.tipus) query = query.eq('tipus_document', params.tipus)
  if (params.dataInici) query = query.gte('data_deteccio', params.dataInici)
  if (params.dataFi) query = query.lte('data_deteccio', params.dataFi + 'T23:59:59')
  if (params.importMin) query = query.gte('import_detectat', parseFloat(params.importMin))
  if (params.cerca) {
    const c = params.cerca
    query = query.or(`titol.ilike.%${c}%,resum.ilike.%${c}%`)
  }

  const { data: documents, count, error } = await query

  if (error) {
    console.error('Error llegint monitoratge:', error)
  }

  const totalPages = Math.ceil((count || 0) / limit)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Documents</h1>
          <p className="text-sm text-slate-500">
            {count || 0} documents{Object.keys(params).length > 0 ? ' (filtrats)' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={mostrarArxivats ? '/documents' : '/documents?arxivats=1'}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              mostrarArxivats
                ? 'bg-orange-100 text-orange-700 border-orange-200'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
          >
            {mostrarArxivats ? 'Amagar tancats' : 'Veure tancats'}
          </a>
          <ActualitzarButton />
          <a href="/api/documents/export" className="text-xs text-blue-600 hover:underline px-2">
            CSV
          </a>
        </div>
      </div>

      <Suspense>
        <DocumentsFilters />
      </Suspense>

      <DocumentsTable
        documents={documents || []}
        total={count || 0}
        page={page}
        limit={limit}
        userEmail={user?.email}
      />
    </div>
  )
}
