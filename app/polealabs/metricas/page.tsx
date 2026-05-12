import { createAdminClient } from '@/lib/supabase/admin'

export default async function AdminMetricas() {
  const supabase = createAdminClient()

  const [
    { count: totalVentas },
    { count: totalEntradas },
    { count: totalGastos },
    { count: totalDocumentos },
    { count: totalConsignaciones },
    { count: totalVariantes },
    { count: totalClientes },
    { data: tiendasConVariantes },
    { data: tiendasConConsignaciones },
    { data: tiendasConDocumentos },
  ] = await Promise.all([
    supabase.from('ventas_cabecera').select('*', { count: 'exact', head: true }),
    supabase.from('entradas').select('*', { count: 'exact', head: true }),
    supabase.from('gastos').select('*', { count: 'exact', head: true }),
    supabase.from('documentos').select('*', { count: 'exact', head: true }),
    supabase.from('consignaciones').select('*', { count: 'exact', head: true }),
    supabase.from('producto_variantes').select('*', { count: 'exact', head: true }),
    supabase.from('clientes').select('*', { count: 'exact', head: true }),
    supabase.from('producto_variantes').select('tienda_id').limit(1000),
    supabase.from('consignaciones').select('tienda_id').limit(1000),
    supabase.from('documentos').select('tienda_id').limit(1000),
  ])

  const tiendasUsanVariantes = new Set((tiendasConVariantes ?? []).map((t) => t.tienda_id)).size
  const tiendasUsanConsignaciones = new Set((tiendasConConsignaciones ?? []).map((t) => t.tienda_id)).size
  const tiendasUsanDocumentos = new Set((tiendasConDocumentos ?? []).map((t) => t.tienda_id)).size

  const features = [
    { label: 'Ventas registradas', valor: totalVentas ?? 0, icon: '↗' },
    { label: 'Entradas de inventario', valor: totalEntradas ?? 0, icon: '↓' },
    { label: 'Gastos registrados', valor: totalGastos ?? 0, icon: '−' },
    { label: 'Clientes registrados', valor: totalClientes ?? 0, icon: '👥' },
    { label: 'Documentos generados', valor: totalDocumentos ?? 0, icon: '📄' },
    { label: 'Consignaciones activas', valor: totalConsignaciones ?? 0, icon: '🏪' },
    { label: 'Variantes creadas', valor: totalVariantes ?? 0, icon: '🎨' },
  ]

  const adopcion = [
    { label: 'Usan variantes de producto', valor: tiendasUsanVariantes },
    { label: 'Usan tiendas aliadas', valor: tiendasUsanConsignaciones },
    { label: 'Usan documentos', valor: tiendasUsanDocumentos },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Métricas de producto</h1>
        <p className="text-white/40 text-sm mt-1">Uso global de features en la plataforma</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((f) => (
          <div
            key={f.label}
            className="rounded-xl p-4 border border-white/10"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <p className="text-xl mb-2">{f.icon}</p>
            <p className="text-2xl font-bold text-white">{f.valor.toLocaleString()}</p>
            <p className="text-white/40 text-xs mt-1">{f.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-6 border border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <p className="text-sm font-semibold text-white mb-4">Adopción de features avanzados</p>
        <div className="space-y-3">
          {adopcion.map((a) => (
            <div key={a.label} className="flex items-center justify-between">
              <span className="text-white/60 text-sm">{a.label}</span>
              <span className="text-white font-semibold">
                {a.valor} tienda{a.valor !== 1 ? 's' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
