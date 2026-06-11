import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import BetaPanel from './BetaPanel'
import { formatCOP } from '@/lib/utils'

export default async function AdminTiendaDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const [{ data: tienda }, { data: ventas }, { data: miembros }] = await Promise.all([
    supabase.from('tiendas').select('*').eq('id', id).maybeSingle(),
    supabase.from('ventas_cabecera').select('fecha, total_neto').eq('tienda_id', id).order('fecha'),
    supabase.from('miembros').select('email, rol, created_at').eq('tienda_id', id),
  ])

  if (!tienda) notFound()

  const ventasMensuales: Record<string, number> = {}
  ;(ventas ?? []).forEach((v) => {
    const mes = v.fecha.slice(0, 7)
    ventasMensuales[mes] = (ventasMensuales[mes] ?? 0) + (v.total_neto ?? 0)
  })

  const totalVentas = (ventas ?? []).reduce((s, v) => s + (v.total_neto ?? 0), 0)
  const totalEquipo = miembros?.length ?? 0

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/polealabs/tiendas" className="text-white/40 hover:text-white text-sm transition">
          ← Tiendas
        </Link>
        <span className="text-white/20">/</span>
        <h1 className="text-xl font-bold text-white">{tienda.nombre}</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ciudad', valor: tienda.ciudad || '—' },
          { label: 'Industria', valor: tienda.categoria || '—' },
          { label: 'Total ventas', valor: formatCOP(totalVentas) },
          { label: 'Miembros del equipo', valor: String(totalEquipo) },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl p-4 border border-white/10"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <p className="text-white/40 text-xs mb-1">{item.label}</p>
            <p className="text-white font-semibold">{item.valor}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-6 border border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <p className="text-sm font-semibold text-white mb-4">Ventas por mes</p>
        {Object.keys(ventasMensuales).length === 0 ? (
          <p className="text-white/40 text-sm">Sin ventas registradas</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(ventasMensuales).map(([mes, total]) => {
              const maxVal = Math.max(...Object.values(ventasMensuales))
              const pct = maxVal > 0 ? (total / maxVal) * 100 : 0
              const [year, month] = mes.split('-')
              const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('es-CO', {
                month: 'long',
                year: 'numeric',
              })
              return (
                <div key={mes}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/60 capitalize">{label}</span>
                    <span className="text-white font-medium">{formatCOP(total)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-[#C4622D]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <BetaPanel
        tiendaId={tienda.id}
        esBeta={tienda.es_beta ?? false}
        betaHasta={tienda.beta_hasta ?? null}
      />

      {miembros && miembros.length > 0 && (
        <div
          className="rounded-2xl border border-white/10 overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <div className="px-6 py-4 border-b border-white/10">
            <p className="text-sm font-semibold text-white">Equipo</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-3 text-left text-xs text-white/40 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs text-white/40 uppercase">Rol</th>
                <th className="px-6 py-3 text-left text-xs text-white/40 uppercase">Desde</th>
              </tr>
            </thead>
            <tbody>
              {miembros.map((m) => (
                <tr key={`${m.email}-${m.created_at}`} className="border-b border-white/5">
                  <td className="px-6 py-3 text-sm text-white/60">{m.email ?? '—'}</td>
                  <td className="px-6 py-3 text-sm text-white/60 capitalize">{m.rol}</td>
                  <td className="px-6 py-3 text-sm text-white/60">
                    {new Date(m.created_at).toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
