import type { ReactNode } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import HeaderWrapper from '@/components/layout/HeaderWrapper'
import InactivityGuard from '@/components/ui/InactivityGuard'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

async function getGraciaInfo(tiendaId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('suscripciones')
    .select('estado, fecha_fin')
    .eq('tienda_id', tiendaId)
    .eq('estado', 'gracia')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let graciaHoras: number | null = null

  if (user) {
    const { data: tienda } = await supabase
      .from('tiendas')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (tienda) {
      const gracia = await getGraciaInfo(tienda.id)
      if (gracia) {
        graciaHoras = Math.max(0, Math.ceil((new Date(gracia.fecha_fin).getTime() - Date.now()) / (1000 * 60 * 60)))
      }
    }
  }

  return (
    <div style={{ background: 'var(--color-background)', minHeight: '100vh' }}>
      <InactivityGuard />
      {graciaHoras !== null && (
        <div className="w-full py-2.5 px-4 text-center text-sm font-medium" style={{ background: '#D4A853', color: '#1A1510' }}>
          ⚠ Tu cuenta tiene un pago pendiente. Tienes{' '}
          <strong>{graciaHoras}h</strong> para resolverlo antes de que se pause.{' '}
          <Link href="/suscripcion" className="underline font-semibold hover:opacity-80">
            Ver mi suscripción →
          </Link>
        </div>
      )}
      <Sidebar />
      <div className="lg:ml-60 flex flex-col min-h-screen">
        <HeaderWrapper />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
