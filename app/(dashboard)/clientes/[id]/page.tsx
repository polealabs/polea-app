'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTienda } from '@/lib/hooks/useTienda'
import { ModuleTableSkeleton } from '@/components/skeletons/ModuleTableSkeleton'
import type { Cliente } from '@/lib/types'
import { formatCOP } from '@/lib/utils'

type VentaItem = {
  producto_nombre: string
  cantidad: number
  precio_venta: number
  descuento: number
  neto: number
}

type Venta = {
  id: string
  fecha: string
  canal: string
  total_neto: number
  total_bruto: number
  medio_pago: string | null
  items: VentaItem[]
}

type VentaCabeceraRow = {
  id: string
  fecha: string
  canal: string
  total_neto: number
  total_bruto: number
  medios_pago?: { nombre?: string } | { nombre?: string }[] | null
  venta_items?: {
    cantidad: number
    precio_venta: number
    descuento: number | null
    neto: number
    productos?: { nombre?: string } | { nombre?: string }[] | null
  }[]
}

function nombreEmbed(embed: { nombre?: string } | { nombre?: string }[] | null | undefined): string {
  if (!embed) return 'Producto eliminado'
  if (Array.isArray(embed)) return embed[0]?.nombre ?? 'Producto eliminado'
  return embed.nombre ?? 'Producto eliminado'
}

function medioNombre(embed: VentaCabeceraRow['medios_pago']): string | null {
  if (!embed) return null
  if (Array.isArray(embed)) return embed[0]?.nombre ?? null
  return embed.nombre ?? null
}

function formatFecha(fecha: string) {
  return new Date(fecha + 'T12:00:00').toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function ClienteDetallePage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()
  const { tienda, loading: tiendaLoading } = useTienda()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [ventas, setVentas] = useState<Venta[]>([])
  const [loading, setLoading] = useState(true)
  const [ventaExpandida, setVentaExpandida] = useState<string | null>(null)

  useEffect(() => {
    if (!tienda || !id) return
    void (async () => {
      setLoading(true)
      const supabase = createClient()

      const [{ data: clienteData }, { data: ventasData }] = await Promise.all([
        supabase.from('clientes').select('*').eq('id', id).eq('tienda_id', tienda.id).single(),
        supabase
          .from('ventas_cabecera')
          .select(
            `
            id, fecha, canal, total_neto, total_bruto,
            medios_pago(nombre),
            venta_items(cantidad, precio_venta, descuento, neto, productos(nombre))
          `,
          )
          .eq('cliente_id', id)
          .eq('tienda_id', tienda.id)
          .order('fecha', { ascending: false }),
      ])

      if (!clienteData) {
        setLoading(false)
        router.push('/clientes')
        return
      }

      setCliente(clienteData)
      setVentas(
        (ventasData ?? []).map((v: VentaCabeceraRow) => ({
          id: v.id,
          fecha: v.fecha,
          canal: v.canal,
          total_neto: v.total_neto,
          total_bruto: v.total_bruto,
          medio_pago: medioNombre(v.medios_pago),
          items: (v.venta_items ?? []).map((item) => ({
            producto_nombre: nombreEmbed(item.productos),
            cantidad: item.cantidad,
            precio_venta: item.precio_venta,
            descuento: item.descuento ?? 0,
            neto: item.neto,
          })),
        })),
      )
      setLoading(false)
    })()
  }, [tienda, id, router])

  const totalGastado = ventas.reduce((sum, v) => sum + v.total_neto, 0)
  const ticketPromedio = ventas.length > 0 ? totalGastado / ventas.length : 0

  if (tiendaLoading || loading) return <ModuleTableSkeleton maxWidthClass="max-w-4xl" showToolbarButton={false} />

  if (!cliente) return null

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-[#8A7D72] hover:text-[#1A1510] mb-4 inline-flex items-center gap-1 transition"
        >
          ← Volver a clientes
        </button>
        <h1 className="text-2xl font-bold text-[#1E3A2F]" style={{ fontFamily: 'Fraunces, serif' }}>
          {cliente.nombre}
        </h1>
        {cliente.telefono && <p className="text-sm text-[#8A7D72] mt-0.5">{cliente.telefono}</p>}
        {cliente.ciudad && <p className="text-sm text-[#8A7D72]">{cliente.ciudad}</p>}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-[#1A1510]/8 p-4 shadow-sm" style={{ background: 'var(--color-surface)' }}>
          <p className="text-xs text-[#8A7D72] uppercase tracking-wide font-semibold mb-1">Total compras</p>
          <p className="text-2xl font-bold text-[#1E3A2F]">{ventas.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#1A1510]/8 p-4 shadow-sm" style={{ background: 'var(--color-surface)' }}>
          <p className="text-xs text-[#8A7D72] uppercase tracking-wide font-semibold mb-1">Total gastado</p>
          <p className="text-2xl font-bold text-[#1E3A2F]">{formatCOP(totalGastado)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#1A1510]/8 p-4 shadow-sm" style={{ background: 'var(--color-surface)' }}>
          <p className="text-xs text-[#8A7D72] uppercase tracking-wide font-semibold mb-1">Ticket promedio</p>
          <p className="text-2xl font-bold text-[#1E3A2F]">{formatCOP(ticketPromedio)}</p>
        </div>
      </div>

      {/* Historial de compras */}
      <div className="bg-white rounded-2xl border border-[#1A1510]/8 shadow-sm overflow-hidden" style={{ background: 'var(--color-surface)' }}>
        <div className="px-5 py-4 border-b border-[#1A1510]/8">
          <h2 className="text-base font-semibold text-[#1E3A2F]">Historial de compras</h2>
        </div>

        {ventas.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-[#8A7D72]">Este cliente aún no tiene compras registradas.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1A1510]/5">
            {ventas.map((venta) => (
              <div key={venta.id}>
                <button
                  type="button"
                  onClick={() => setVentaExpandida(ventaExpandida === venta.id ? null : venta.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#FAF6F0]/60 transition text-left"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm font-medium text-[#1A1510]">{formatFecha(venta.fecha)}</p>
                      <p className="text-xs text-[#8A7D72]">
                        {venta.canal}
                        {venta.medio_pago ? ` · ${venta.medio_pago}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm font-semibold text-[#1E3A2F]">{formatCOP(venta.total_neto)}</p>
                    <span className="text-[#8A7D72] text-xs">{ventaExpandida === venta.id ? '▲' : '▼'}</span>
                  </div>
                </button>

                {ventaExpandida === venta.id && (
                  <div className="px-5 pb-4 bg-[#FAF6F0]/40">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-wide text-[#8A7D72]">
                          <th className="text-left py-2">Producto</th>
                          <th className="text-center py-2">Cant.</th>
                          <th className="text-right py-2">Precio</th>
                          <th className="text-right py-2">Descuento</th>
                          <th className="text-right py-2">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1A1510]/5">
                        {venta.items.map((item, i) => {
                          const descuentoCOP = Math.round(item.precio_venta * item.cantidad * (item.descuento / 100))
                          return (
                            <tr key={i}>
                              <td className="py-2 text-[#1A1510]">{item.producto_nombre}</td>
                              <td className="py-2 text-center text-[#8A7D72]">{item.cantidad}</td>
                              <td className="py-2 text-right text-[#8A7D72]">{formatCOP(item.precio_venta)}</td>
                              <td className="py-2 text-right text-[#8A7D72]">
                                {item.descuento > 0 ? `${item.descuento}% (-${formatCOP(descuentoCOP)})` : '—'}
                              </td>
                              <td className="py-2 text-right font-medium text-[#1A1510]">{formatCOP(item.neto)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    {venta.total_bruto !== venta.total_neto && (
                      <p className="text-xs text-[#8A7D72] mt-2 text-right">
                        Bruto: {formatCOP(venta.total_bruto)} · Comisiones: -{formatCOP(venta.total_bruto - venta.total_neto)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
