import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: admin } = await supabase
    .from('admins')
    .select('nombre')
    .eq('email', user.email ?? '')
    .maybeSingle()

  if (!admin) redirect('/dashboard')

  return (
    <div className="min-h-screen" style={{ background: '#0A0F0A' }}>
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#C4622D] flex items-center justify-center">
            <span className="text-white text-xs font-bold">P</span>
          </div>
          <div>
            <p className="text-white text-sm font-semibold">Polea Admin</p>
            <p className="text-white/40 text-xs">Panel de operaciones</p>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap justify-end">
          <Link href="/polealabs" className="text-white/60 hover:text-white text-xs transition">
            Overview
          </Link>
          <Link href="/polealabs/tiendas" className="text-white/60 hover:text-white text-xs transition">
            Tiendas
          </Link>
          <Link href="/polealabs/usuarios" className="text-white/60 hover:text-white text-xs transition">
            Usuarios
          </Link>
          <Link href="/polealabs/metricas" className="text-white/60 hover:text-white text-xs transition">
            Métricas
          </Link>
          <span className="text-white/30 text-xs">{admin.nombre ?? user.email}</span>
          <Link
            href="/dashboard"
            className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
          >
            Volver a la app →
          </Link>
        </div>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  )
}
