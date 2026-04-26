'use client'
import { useState } from 'react'
import { formatData, colorVenciment, isAdmin, truncate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ExternalLink } from 'lucide-react'
import DocumentModal from './DocumentModal'
import type { Document } from '@/types'

const classifVariant = (c?: string) =>
  (c === 'URGENT' ? 'urgent' : c === 'IMPORTANT' ? 'important' : 'informatiu') as 'urgent' | 'important' | 'informatiu'

export default function DocumentsTable({ documents, total, page, limit, userEmail }: {
  documents: Document[]; total: number; page: number; limit: number; userEmail?: string
}) {
  const [selected, setSelected] = useState<Document | null>(null)
  const admin = isAdmin(userEmail)
  const totalPages = Math.ceil(total / limit)

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Títol</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Font</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nivell</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Venciment</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Data</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {documents.map(doc => (
              <tr key={doc.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelected(doc)}>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800 truncate max-w-xs">{doc.titol || '(sense títol)'}</div>
                  {doc.resum && <div className="text-xs text-slate-400 truncate max-w-xs">{truncate(doc.resum, 80)}</div>}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{doc.font}</td>
                <td className="px-4 py-3">
                  <Badge variant={classifVariant(doc.classificacio)}>{doc.classificacio}</Badge>
                </td>
                <td className={`px-4 py-3 text-xs hidden lg:table-cell ${colorVenciment(doc.venciment)}`}>
                  {doc.venciment ? formatData(doc.venciment) : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-slate-400 hidden lg:table-cell">
                  {formatData(doc.data_deteccio)}
                </td>
                <td className="px-4 py-3">
                  <a href={doc.url_original} target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="text-blue-500 hover:text-blue-700">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">{total} documents</span>
          <div className="flex gap-1">
            {page > 1 && <a href={`?page=${page - 1}`} className="px-2 py-1 text-xs bg-slate-100 rounded hover:bg-slate-200">← Anterior</a>}
            <span className="px-2 py-1 text-xs text-slate-500">{page} / {totalPages}</span>
            {page < totalPages && <a href={`?page=${page + 1}`} className="px-2 py-1 text-xs bg-slate-100 rounded hover:bg-slate-200">Següent →</a>}
          </div>
        </div>
      </div>

      {selected && <DocumentModal doc={selected} isAdmin={admin} onClose={() => setSelected(null)} />}
    </>
  )
}
