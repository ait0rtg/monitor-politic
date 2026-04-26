export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-blue-900">Monitor Polític Municipal</h1>
          <p className="text-sm text-slate-500 mt-1">Castell-Platja d'Aro</p>
        </div>
        {children}
      </div>
    </div>
  )
}
