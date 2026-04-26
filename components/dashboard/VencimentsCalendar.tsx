import { formatData, colorVenciment, diesRestants, cn } from '@/lib/utils'

interface Venciment { id: string; titol: string; venciment: string; font: string; url_original: string }

export default function VencimentsCalendar({ venciments }: { venciments: Venciment[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="font-semibold text-slate-800 mb-4 flex items-center justify-between">
        Venciments propers
        <span className="text-xs text-slate-400 font-normal">{venciments.length} en 30 dies</span>
      </h3>
      {venciments.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">Cap venciment pròxim</p>
      ) : (
        <div className="space-y-2">
          {venciments.map((v) => {
            const dies = diesRestants(v.venciment)
            return (
              <div key={v.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50">
                <div className={cn('text-right min-w-[48px]', colorVenciment(v.venciment))}>
                  <div className="text-sm font-bold">{dies ?? '?'}</div>
                  <div className="text-xs">dies</div>
                </div>
                <div className="flex-1 min-w-0">
                  <a href={v.url_original} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-medium text-slate-700 hover:text-blue-600 truncate block">
                    {v.titol}
                  </a>
                  <div className="text-xs text-slate-400">{v.font} · {formatData(v.venciment)}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
