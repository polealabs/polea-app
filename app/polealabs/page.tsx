import { createClient } from '@/lib/supabase/server'

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)
}

export default async function AdminOverview() {
  const supabase = await createClient()

  const year = new Date().getFullYear()
  const desdeAnio = `${year}-01-01`

  const [
    { count: totalTiendas },
    { count: totalUsuarios },
    { count: totalVentas },
    { count: totalProductos },
    { data: tiendasRecientes },
    { data: ventasPorMes },
  ] = await Promise.all([
    supabase.from('tiendas').select('*', { count: 'exact', head: true }),
    supabase.from('perfiles').select('*', { count: 'exact', head: true }),
    supabase.from('ventas_cabecera').select('*', { count: 'exact', head: true }),
    supabase.from('productos').select('*', { count: 'exact', head: true }),
    supabase
      .from('tiendas')
      .select('id, nombre, created_at, ciudad, categoria')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('ventas_cabecera')
      .select('fecha, total_neto')
      .gte('fecha', desdeAnio)
      .order('fecha'),
  ])

  const ventasMensuales: Record<string, number> = {}
  ;(ventasPorMes ?? []).forEach((v) => {
    const mes = v.fecha.slice(0, 7)
    ventasMensuales[mes] = (ventasMensuales[mes] ?? 0) + (v.total_neto ?? 0)
  })

  const totalVentasPlataforma = (ventasPorMes ?? []).reduce((s, v) => s + (v.total_neto ?? 0), 0)

  const KPIs = [
    { label: 'Tiendas registradas', valor: totalTiendas ?? 0, icon: '🏪', color: '#C4622D' },
    { label: 'Usuarios totales', valor: totalUsuarios ?? 0, icon: '👥', color: '#3A7D5A' },
    { label: 'Ventas registradas', valor: totalVentas ?? 0, icon: '↗', color: '#D4A853' },
    { label: 'Productos en plataforma', valor: totalProductos ?? 0, icon: '📦', color: '#7BA7D4' },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-white/40 text-sm mt-1">Estado global de Polea</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIs.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl p-5 border border-white/10"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <p className="text-2xl mb-2">{kpi.icon}</p>
            <p className="text-3xl font-bold text-white">{kpi.valor.toLocaleString()}</p>
            <p className="text-white/40 text-xs mt-1">{kpi.label}</p>
            <div className="h-0.5 rounded-full mt-3" style={{ background: kpi.color }} />
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-6 border border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <p className="text-white/40 text-xs uppercase tracking-widest mb-1">
          Total procesado en plataforma (este año)
        </p>
        <p className="text-4xl font-bold text-white">{formatCOP(totalVentasPlataforma)}</p>
      </div>

      <div className="rounded-2xl p-6 border border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <p className="text-sm font-semibold text-white mb-4">Ventas registradas por mes (este año)</p>
        <div className="space-y-3">
          {Object.keys(ventasMensuales).length === 0 ? (
            <p className="text-white/40 text-sm">Sin ventas en el periodo</p>
          ) : (
            Object.entries(ventasMensuales).map(([mes, total]) => {
              const maxVal = Math.max(...Object.values(ventasMensuales))
              const pct = maxVal > 0 ? (total / maxVal) * 100 : 0
              const [y, month] = mes.split('-')
              const label = new Date(Number(y), Number(month) - 1, 1).toLocaleDateString('es-CO', {
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
                    <div className="h-full rounded-full bg-[#C4622D] transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <div
        className="rounded-2xl border border-white/10 overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      >
        <div className="px-6 py-4 border-b border-white/10">
          <p className="text-sm font-semibold text-white">Tiendas recientes</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-6 py-3 text-left text-xs text-white/40 uppercase tracking-wide">Tienda</th>
              <th className="px-6 py-3 text-left text-xs text-white/40 uppercase tracking-wide">Ciudad</th>
              <th className="px-6 py-3 text-left text-xs text-white/40 uppercase tracking-wide">Industria</th>
              <th className="px-6 py-3 text-left text-xs text-white/40 uppercase tracking-wide">Registro</th>
            </tr>
          </thead>
          <tbody>
            {(tiendasRecientes ?? []).map((t) => (
              <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition">
                <td className="px-6 py-3 text-sm text-white font-medium">{t.nombre}</td>
                <td className="px-6 py-3 text-sm text-white/60">{t.ciudad || '—'}</td>
                <td className="px-6 py-3 text-sm text-white/60">{t.categoria || '—'}</td>
                <td className="px-6 py-3 text-sm text-white/60">
                  {new Date(t.created_at).toLocaleDateString('es-CO', {
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
    </div>
  )
}
