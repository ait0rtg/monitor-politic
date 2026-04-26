import { cn } from '@/lib/utils'
interface BadgeProps { children: React.ReactNode; className?: string; variant?: 'urgent'|'important'|'informatiu'|'default' }
const variants = { urgent:'bg-red-100 text-red-800 border-red-200', important:'bg-orange-100 text-orange-800 border-orange-200', informatiu:'bg-green-100 text-green-800 border-green-200', default:'bg-slate-100 text-slate-700 border-slate-200' }
export function Badge({ children, className, variant='default' }: BadgeProps) {
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border', variants[variant], className)}>{children}</span>
}
