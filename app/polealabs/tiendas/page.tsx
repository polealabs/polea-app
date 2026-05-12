import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

export default async function AdminTiendas() {
  const supabase = createAdminClient()

  const { data: tiendas } = await supabase
    .from('tiendas')
    .select('id, nombre, ciudad, categoria, whatsapp, email, created_at, owner_id')
    .order('created_at', { ascending: false })

  const tiendaIds = (tiendas ?? []).map((t) => t.id)
  const ownerIds = [...new Set((tiendas ?? []).map((t) => t.owner_id).filter(Boolean))]

  const ventasPorTienda =
    tiendaIds.length > 0
      ? await supabase.from('ventas_cabecera').select('tienda_id, total_neto').in('tienda_id', tiendaIds)
      : { data: [] as { tienda_id: string; total_neto: number | null }[] }
  const productosPorTienda =
    tiendaIds.length > 0
      ? await supabase.from('productos').select('tienda_id').in('tienda_id', tiendaIds)
      : { data: [] as { tienda_id: string }[] }
  const miembrosPorTienda =
    tiendaIds.length > 0
      ? await supabase.from('miembros').select('tienda_id').in('tienda_id', tiendaIds)
      : { data: [] as { tienda_id: string }[] }
  const perfiles =
    ownerIds.length > 0
      ? await supabase.from('perfiles').select('id, nombre').in('id', ownerIds)
      : { data: [] as { id: string; nombre: string | null }[] }

  const ventasMap = new Map<string, number>()
  ;(ventasPorTienda.data ?? []).forEach((v) => {
    ventasMap.set(v.tienda_id, (ventasMap.get(v.tienda_id) ?? 0) + (v.total_neto ?? 0))
  })

  const productosMap = new Map<string, number>()
  ;(productosPorTienda.data ?? []).forEach((p) => {
    productosMap.set(p.tienda_id, (productosMap.get(p.tienda_id) ?? 0) + 1)
  })

  const miembrosMap = new Map<string, number>()
  ;(miembrosPorTienda.data ?? []).forEach((m) => {
    miembrosMap.set(m.tienda_id, (miembrosMap.get(m.tienda_id) ?? 0) + 1)
  })

  const perfilesMap = new Map((perfiles.data ?? []).map((p) => [p.id, p.nombre]))

  function formatCOP(n: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Tiendas</h1>
        <p className="text-white/40 text-sm mt-1">{tiendas?.length ?? 0} tiendas registradas</p>
      </div>

      <div
        className="rounded-2xl border border-white/10 overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      >
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-6 py-3 text-left text-xs text-white/40 uppercase tracking-wide">Tienda</th>
              <th className="px-6 py-3 text-left text-xs text-white/40 uppercase tracking-wide">Owner</th>
              <th className="px-6 py-3 text-left text-xs text-white/40 uppercase tracking-wide">Ciudad</th>
              <th className="px-6 py-3 text-left text-xs text-white/40 uppercase tracking-wide">Industria</th>
              <th className="px-6 py-3 text-right text-xs text-white/40 uppercase tracking-wide">Ventas totales</th>
              <th className="px-6 py-3 text-right text-xs text-white/40 uppercase tracking-wide">Productos</th>
              <th className="px-6 py-3 text-right text-xs text-white/40 uppercase tracking-wide">Equipo</th>
              <th className="px-6 py-3 text-left text-xs text-white/40 uppercase tracking-wide">Registro</th>
              <th className="px-6 py-3 text-left text-xs text-white/40 uppercase tracking-wide">Contacto</th>
            </tr>
          </thead>
          <tbody>
            {(tiendas ?? []).map((t) => (
              <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition">
                <td className="px-6 py-4">
                  <Link
                    href={`/polealabs/tiendas/${t.id}`}
                    className="text-sm text-white font-medium hover:text-[#C4622D] transition"
                  >
                    {t.nombre}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm text-white/60">{perfilesMap.get(t.owner_id) ?? '—'}</td>
                <td className="px-6 py-4 text-sm text-white/60">{t.ciudad || '—'}</td>
                <td className="px-6 py-4 text-sm text-white/60">{t.categoria || '—'}</td>
                <td className="px-6 py-4 text-sm text-white text-right font-medium">
                  {formatCOP(ventasMap.get(t.id) ?? 0)}
                </td>
                <td className="px-6 py-4 text-sm text-white/60 text-right">{productosMap.get(t.id) ?? 0}</td>
                <td className="px-6 py-4 text-sm text-white/60 text-right">{miembrosMap.get(t.id) ?? 0}</td>
                <td className="px-6 py-4 text-sm text-white/60">
                  {new Date(t.created_at).toLocaleDateString('es-CO', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-6 py-4">
                  {t.whatsapp ? (
                    <a
                      href={`https://wa.me/57${String(t.whatsapp).replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2 py-1 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition"
                    >
                      WhatsApp
                    </a>
                  ) : (
                    <span className="text-white/30 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
