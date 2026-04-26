import { formatData } from '@/lib/utils'

interface DocUrgent { id: string; titol: string; font: string; data_deteccio: string; url_original: string; resum?: string }

export default function UrgentsTable({ urgents }: { urgents: DocUrgent[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <span className="w-2 h-2 bg-red-500 rounded-full" />
        Elements urgents pendents
        <span className="ml-auto text-xs text-slate-400 font-normal">{urgents.length}</span>
      </h3>
      {urgents.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">Cap element urgent pendent</p>
      ) : (
        <div className="space-y-3">
          {urgents.map((d) => (
            <div key={d.id} className="p-3 bg-red-50 border border-red-100 rounded-lg">
              <a href={d.url_original} target="_blank" rel="noopener noreferrer"
                className="text-sm font-semibold text-red-900 hover:underline line-clamp-1">{d.titol}</a>
              {d.resum && <p className="text-xs text-red-700 mt-1 line-clamp-2">{d.resum}</p>}
              <div className="text-xs text-red-500 mt-1">{d.font} · {formatData(d.data_deteccio)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
