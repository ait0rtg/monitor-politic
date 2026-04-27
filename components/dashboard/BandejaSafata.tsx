'use client'
import { useState } from 'react'
import { Inbox, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { formatData } from '@/lib/utils'

const classifColor: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-800 border-red-200',
  IMPORTANT: 'bg-orange-100 text-orange-800 border-orange-200',
  INFORMATIU: 'bg-green-100 text-green-800 border-green-200',
}

export default function BandejaSafata({ documents }: { documents: any[] }) {
  const [obert, setObert] = useState(true)

  if (documents.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-blue-200 shadow-sm">
      <button
        onClick={() => setObert(!obert)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-colors">
        <div className="flex items-center gap-2">
          <Inbox className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-slate-800">Safata d'entrada</span>
          <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {documents.length}
          </span>
        </div>
        {obert ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {obert && (
        <div className="border-t border-slate-100 divide-y divide-slate-50">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${classifColor[doc.classificacio] || classifColor.INFORMATIU}`}>
                    {doc.classificacio}
                  </span>
                  <span className="text-xs text-slate-400">{doc.font}</span>
                  <span className="text-xs text-slate-300">·</span>
                  <span className="text-xs text-slate-400">{formatData(doc.data_deteccio)}</span>
                </div>
                <p className="text-sm font-medium text-slate-800 truncate">{doc.titol}</p>
                {doc.resum && (
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{doc.resum}</p>
                )}
              </div>
              <a
                href={doc.url_original}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 text-blue-500 hover:text-blue-700 mt-1">
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
