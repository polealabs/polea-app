'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTienda } from '@/lib/hooks/useTienda'
import { DashboardHomeSkeleton } from '@/components/skeletons/DashboardHomeSkeleton'
import type { Producto, VentaCabecera } from '@/lib/types'

type VentaConDetalles = VentaCabecera & {
  cliente_nombre?: string
  items: {
    producto_nombre: string
    cantidad: number
    precio_venta: number
    neto: number
  }[]
}

type VentaCabeceraRaw = VentaCabecera & {
  clientes?: { nombre?: string } | { nombre?: string }[] | null
  venta_items?: {
    cantidad: number
    precio_venta: number
    neto: number
    productos?: { nombre?: string } | { nombre?: string }[] | null
  }[]
}

type VentaDia = {
  fecha: string
  total: number
}

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(n)
}

function formatFecha(fecha: string) {
  return new Date(fecha + 'T12:00:00').toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
  })
}

function getSaludo() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

function getDiaLabel(fecha: string) {
  const hoy = new Date().toISOString().split('T')[0]
  if (fecha === hoy) return 'Hoy'
  return new Date(fecha + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short' })
}

function getRangoSemana(offset: number): { desde: string; hasta: string; dias: string[] } {
  const hoy = new Date()
  // Ir al inicio de la semana actual (lunes) y aplicar offset en semanas
  const diaSemana = hoy.getDay() === 0 ? 6 : hoy.getDay() - 1 // 0=lunes
  const inicioSemanaActual = new Date(hoy)
  inicioSemanaActual.setDate(hoy.getDate() - diaSemana)

  const inicio = new Date(inicioSemanaActual)
  inicio.setDate(inicioSemanaActual.getDate() + offset * 7)

  const fin = new Date(inicio)
  fin.setDate(inicio.getDate() + 6)

  // No permitir ir más allá de hoy en el futuro
  const finReal = fin > hoy ? hoy : fin

  const dias: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(inicio)
    d.setDate(inicio.getDate() + i)
    if (d <= hoy) {
      dias.push(d.toISOString().split('T')[0])
    }
  }

  return {
    desde: inicio.toISOString().split('T')[0],
    hasta: finReal.toISOString().split('T')[0],
    dias,
  }
}

const MIN_OFFSET = -4
// Calcular dinámicamente según días del mes:
// El offset mínimo real es el que lleva hasta 30 días atrás
function getMinOffset(): number {
  const hoy = new Date()
  const hace30 = new Date(hoy)
  hace30.setDate(hoy.getDate() - 30)
  // Calcular cuántas semanas completas caben
  const diffMs = hoy.getTime() - hace30.getTime()
  const diffSemanas = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
  return -Math.min(diffSemanas, Math.abs(MIN_OFFSET))
}

const CANAL_COLORS: Record<string, string> = {
  WhatsApp: 'bg-green-pale text-green',
  Instagram: 'bg-terra-pale text-terra',
  Web: 'bg-border-warm text-ink-mid',
  Presencial: 'bg-gold-pale text-gold',
  'Tienda multimarca': 'bg-[#F0EDF9] text-[#6B5A8A]',
}

export default function DashboardPage() {
  const { tienda, loading: tiendaLoading } = useTienda()
  const router = useRouter()
  const pathname = usePathname()

  const [ventasHoy, setVentasHoy] = useState(0)
  const [ventasMes, setVentasMes] = useState(0)
  const [productosStockBajo, setProductosStockBajo] = useState<Producto[]>([])
  const [ultimasVentas, setUltimasVentas] = useState<VentaConDetalles[]>([])
  const [ventasSemana, setVentasSemana] = useState<VentaDia[]>([])
  const [todosProductos, setTodosProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [semanaOffset, setSemanaOffset] = useState(0)
  const [notificacionesActivas, setNotificacionesActivas] = useState<
    { tipo: string; mensaje: string; link: string }[]
  >([])

  useEffect(() => {
    if (!tiendaLoading && !tienda) {
      router.replace('/onboarding')
    }
  }, [tienda, tiendaLoading, router])

  const loadDashboardData = useCallback(async () => {
    if (!tienda) return

    const tiendaId = tienda.id
    const supabase = createClient()

    const hoy = new Date().toISOString().split('T')[0]
    const mesActual = new Date().toISOString().slice(0, 7)
    const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const mesActualStr = new Date().toISOString().slice(0, 7)
    const mesAnteriorDate = new Date()
    mesAnteriorDate.setMonth(mesAnteriorDate.getMonth() - 1)
    const mesAnteriorStr = mesAnteriorDate.toISOString().slice(0, 7)
    const hace60 = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const [
      ventasHoyRes,
      ventasMesRes,
      todosProductosRes,
      ventasRecientesRes,
      ultimasRes,
      ventasMesAntRes,
      clientesMesRes,
      clientesRecientesRes,
      clientesInfoRes,
    ] =
      await Promise.all([
        supabase.from('ventas_cabecera').select('total_neto').eq('tienda_id', tiendaId).eq('fecha', hoy),
        supabase
          .from('ventas_cabecera')
          .select('total_neto')
          .eq('tienda_id', tiendaId)
          .gte('fecha', `${mesActual}-01`),
        supabase.from('productos').select('*').eq('tienda_id', tiendaId),
        supabase.from('ventas_cabecera').select('id').eq('tienda_id', tiendaId).gte('fecha', hace30),
        supabase
          .from('ventas_cabecera')
          .select(
            '*, clientes(nombre), venta_items(cantidad, precio_venta, neto, productos(nombre))',
          )
          .eq('tienda_id', tiendaId)
          .order('fecha', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('ventas_cabecera')
          .select('total_neto')
          .eq('tienda_id', tiendaId)
          .gte('fecha', `${mesAnteriorStr}-01`)
          .lt('fecha', `${mesActualStr}-01`),
        supabase
          .from('ventas_cabecera')
          .select('cliente_id')
          .eq('tienda_id', tiendaId)
          .gte('fecha', hace60)
          .not('cliente_id', 'is', null),
        supabase
          .from('ventas_cabecera')
          .select('cliente_id')
          .eq('tienda_id', tiendaId)
          .gte('fecha', hace30)
          .not('cliente_id', 'is', null),
        supabase.from('clientes').select('id, nombre').eq('tienda_id', tiendaId),
      ])

    const totalHoy = (ventasHoyRes.data ?? []).reduce((s, v) => s + (v.total_neto ?? 0), 0)
    const totalMes = (ventasMesRes.data ?? []).reduce((s, v) => s + (v.total_neto ?? 0), 0)

    const listaProductos = todosProductosRes.data ?? []
    setTodosProductos(listaProductos)

    const stockBajo = listaProductos.filter((p) => p.stock_actual <= p.stock_minimo)
    setProductosStockBajo(stockBajo)

    const ventasRecientesIds = (ventasRecientesRes.data ?? []).map((v) => v.id)
    const idsConMovimiento = new Set<string>()
    if (ventasRecientesIds.length > 0) {
      const { data: itemsRecientes } = await supabase
        .from('venta_items')
        .select('producto_id')
        .eq('tienda_id', tiendaId)
        .in('cabecera_id', ventasRecientesIds)
      ;(itemsRecientes ?? []).forEach((item) => idsConMovimiento.add(item.producto_id))
    }
    const sinMovimiento = listaProductos.filter(
      (p) => !idsConMovimiento.has(p.id) && p.stock_actual > 0
    )

    setVentasHoy(totalHoy)
    setVentasMes(totalMes)

    const ventasMapeadas: VentaConDetalles[] = (ultimasRes.data ?? []).map((v: VentaCabeceraRaw) => ({
      ...v,
      cliente_nombre: Array.isArray(v.clientes) ? v.clientes[0]?.nombre : v.clientes?.nombre,
      items: (v.venta_items ?? []).map((i) => ({
        producto_nombre: Array.isArray(i.productos) ? i.productos[0]?.nombre ?? '—' : i.productos?.nombre ?? '—',
        cantidad: i.cantidad,
        precio_venta: i.precio_venta,
        neto: i.neto,
      })),
    }))
    setUltimasVentas(ventasMapeadas)

    const alertas: { tipo: string; mensaje: string; link: string }[] = []

    if (stockBajo.length > 0) {
      alertas.push({
        tipo: 'stock',
        mensaje: `${stockBajo.length} producto${stockBajo.length > 1 ? 's' : ''} con stock bajo o agotado`,
        link: '/productos?filtro=stock-bajo',
      })
    }

    if (sinMovimiento.length > 0) {
      alertas.push({
        tipo: 'movimiento',
        mensaje: `${sinMovimiento.length} producto${sinMovimiento.length > 1 ? 's' : ''} sin ventas en 30 días`,
        link: '/productos?filtro=sin-movimiento',
      })
    }

    const totalMesAnt = (ventasMesAntRes.data ?? []).reduce((s, v) => s + (v.total_neto ?? 0), 0)
    if (totalMesAnt > 0 && totalMes > 0) {
      const pct = (totalMes / totalMesAnt) * 100
      if (pct < 80 && new Date().getDate() >= 7) {
        alertas.push({
          tipo: 'ventas',
          mensaje: `Las ventas de este mes están al ${Math.round(pct)}% del mes anterior`,
          link: '/reportes',
        })
      }
    }

    const compras60 = new Map<string, number>()
    ;(clientesMesRes.data ?? []).forEach((v) => {
      if (!v.cliente_id) return
      compras60.set(v.cliente_id, (compras60.get(v.cliente_id) ?? 0) + 1)
    })
    const recurrentes = [...compras60.entries()].filter(([, count]) => count >= 2).map(([id]) => id)
    const compraRecienteIds = new Set((clientesRecientesRes.data ?? []).map((v) => v.cliente_id))
    const sinCompra = recurrentes.filter((id) => !compraRecienteIds.has(id))
    if (sinCompra.length > 0) {
      const nombres = new Map((clientesInfoRes.data ?? []).map((c) => [c.id, c.nombre]))
      const muestra = sinCompra
        .slice(0, 2)
        .map((id) => nombres.get(id))
        .filter(Boolean)
      alertas.push({
        tipo: 'clientes',
        mensaje:
          muestra.length > 0
            ? `Clientes recurrentes sin compra reciente: ${muestra.join(', ')}${sinCompra.length > 2 ? ` y ${sinCompra.length - 2} más` : ''}`
            : `${sinCompra.length} cliente${sinCompra.length > 1 ? 's' : ''} recurrente${sinCompra.length > 1 ? 's' : ''} sin compra reciente`,
        link: '/clientes?filtro=recurrentes',
      })
    }

    setNotificacionesActivas(alertas)

    setLoading(false)
  }, [tienda])

  useEffect(() => {
    if (!tienda) return
    const timeoutId = window.setTimeout(() => {
      void loadDashboardData()
    }, 0)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void loadDashboardData()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.clearTimeout(timeoutId)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [tienda, pathname, loadDashboardData])

  useEffect(() => {
    if (!tienda) return
    const { desde, hasta, dias } = getRangoSemana(semanaOffset)
    const supabase = createClient()

    supabase
      .from('ventas_cabecera')
      .select('fecha, total_neto')
      .eq('tienda_id', tienda.id)
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .then(({ data }) => {
        const ventasPorDia = dias.map((fecha) => ({
          fecha,
          total: (data ?? [])
            .filter((v) => v.fecha === fecha)
            .reduce((s, v) => s + (v.total_neto ?? 0), 0),
        }))
        setVentasSemana(ventasPorDia)
      })
  }, [tienda, semanaOffset])

  if (tiendaLoading || loading) {
    return <DashboardHomeSkeleton />
  }

  if (!tienda) return null

  return (
    <div className="w-full p-4 md:p-6 xl:p-10">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-9">
        <div className="min-w-0">
          <h1 className="font-serif text-[32px] font-medium text-ink leading-tight">
            {getSaludo()},{' '}
            <span className="italic text-terra">{tienda.nombre}</span>
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            {new Date().toLocaleDateString('es-CO', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            {tienda.ciudad ? ` · ${tienda.ciudad}` : ''}
          </p>
        </div>
        <div className="flex gap-2.5 flex-wrap shrink-0">
          <Link
            href="/productos"
            className="px-5 py-2.5 rounded-lg text-sm font-medium border border-border-warm bg-white text-ink-mid hover:border-ink-faint transition"
          >
            + Producto
          </Link>
          <Link
            href="/ventas"
            className="px-5 py-2.5 rounded-lg text-sm font-medium bg-terra text-white hover:bg-terra-light transition"
          >
            + Venta nueva
          </Link>
        </div>
      </div>

      {/* ALERTAS BANNER */}
      {notificacionesActivas.length > 0 && (
        <div className="bg-[#2D4A3E] rounded-2xl p-5 flex items-center gap-4 mb-4 relative overflow-hidden">
          <div className="absolute right-[-20px] top-[-20px] w-[120px] h-[120px] rounded-full bg-terra/20 blur-2xl" />
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-lg flex-shrink-0">
            ✦
          </div>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-[2px] text-[#E8845A] mb-1">Alertas</p>
            <ul className="space-y-0.5">
              {notificacionesActivas.map((alerta, i) => (
                <li key={`${alerta.tipo}-${i}`} className="text-sm text-white/90 leading-snug">
                  · {alerta.mensaje}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-1 flex-shrink-0">
            {notificacionesActivas.map((alerta, i) => (
              <Link
                key={i}
                href={alerta.link}
                className="text-xs text-[#E8845A] font-medium underline underline-offset-2 whitespace-nowrap text-right"
              >
                Ver →
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-border-warm p-5 relative overflow-hidden shadow-sm">
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-terra" />
          <p className="text-xs text-ink-soft mb-2">Ventas hoy</p>
          <p className="font-serif text-[26px] font-medium text-ink leading-none">{formatCOP(ventasHoy)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border-warm p-5 relative overflow-hidden shadow-sm">
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#2D4A3E]" />
          <p className="text-xs text-ink-soft mb-2">Este mes (neto)</p>
          <p className="font-serif text-[26px] font-medium text-ink leading-none">{formatCOP(ventasMes)}</p>
        </div>
        <Link
          href="/productos?filtro=stock-bajo"
          className={`rounded-2xl border p-5 relative overflow-hidden shadow-sm block transition ${
            productosStockBajo.length > 0 ? 'bg-red-pale border-red-alert/20' : 'bg-white border-border-warm'
          }`}
        >
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-red-alert" />
          <p className="text-xs text-ink-soft mb-2">Alertas stock</p>
          <p
            className={`font-serif text-[26px] font-medium leading-none ${
              productosStockBajo.length > 0 ? 'text-red-alert' : 'text-ink'
            }`}
          >
            {productosStockBajo.length}
          </p>
        </Link>
        <Link
          href="/ventas"
          className="bg-terra rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:bg-terra-light transition"
        >
          <p className="text-xs text-white/70">Acción rápida</p>
          <p className="font-serif text-[20px] font-medium text-white leading-tight mt-2">
            Registrar
            <br />
            venta
          </p>
        </Link>
      </div>

      {/* DOS COLUMNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="flex flex-col gap-6">
          {/* GRÁFICO */}
          <div className="bg-white rounded-2xl border border-border-warm p-6 shadow-sm">
            {(() => {
              const { desde, hasta } = getRangoSemana(semanaOffset)
              const labelRango =
                semanaOffset === 0 ? 'Esta semana' : `${formatFecha(desde)} – ${formatFecha(hasta)}`
              return (
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <p className="text-sm font-semibold text-ink">Ventas esta semana</p>
                    <p className="text-xs text-ink-soft mt-0.5">{labelRango}</p>
                    <p className="font-serif text-[22px] font-medium text-ink mt-0.5">
                      {formatCOP(ventasSemana.reduce((s, d) => s + d.total, 0))}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSemanaOffset((o) => Math.max(getMinOffset(), o - 1))}
                      disabled={semanaOffset <= getMinOffset()}
                      className="w-7 h-7 rounded-lg border border-[#EDE5DC] flex items-center justify-center text-[#8A7D72] hover:bg-[#FAF6F0] disabled:opacity-30 disabled:cursor-not-allowed transition text-sm"
                      title="Semana anterior"
                    >
                      ‹
                    </button>
                    {semanaOffset < 0 && (
                      <button
                        onClick={() => setSemanaOffset(0)}
                        className="text-xs text-[#C4622D] font-medium hover:underline px-1"
                        title="Volver a semana actual"
                      >
                        Hoy
                      </button>
                    )}
                    <button
                      onClick={() => setSemanaOffset((o) => Math.min(0, o + 1))}
                      disabled={semanaOffset >= 0}
                      className="w-7 h-7 rounded-lg border border-[#EDE5DC] flex items-center justify-center text-[#8A7D72] hover:bg-[#FAF6F0] disabled:opacity-30 disabled:cursor-not-allowed transition text-sm"
                      title="Semana siguiente"
                    >
                      ›
                    </button>
                  </div>
                </div>
              )
            })()}
            <div className="flex items-stretch gap-2 min-h-[104px]">
              {(() => {
                const max = Math.max(...ventasSemana.map((d) => d.total), 1)
                const maxBarPx = 72
                return ventasSemana.map((d, i) => {
                  const isHoy = semanaOffset === 0 && i === ventasSemana.length - 1
                  const barPx =
                    d.total > 0 ? Math.max((d.total / max) * maxBarPx, 6) : 4
                  return (
                    <div
                      key={d.fecha}
                      className="flex-1 flex flex-col items-center gap-1 justify-end min-w-0"
                    >
                      {d.total > 0 && (
                        <span
                          className={`text-[9px] font-semibold mb-1 leading-none ${
                            isHoy ? 'text-[#C4622D]' : 'text-[#8A7D72]'
                          }`}
                        >
                          {new Intl.NumberFormat('es-CO', {
                            notation: 'compact',
                            compactDisplay: 'short',
                            maximumFractionDigits: 1,
                          }).format(d.total)}
                        </span>
                      )}
                      <div
                        className={`w-full max-w-[40px] mx-auto rounded-t-md transition-all ${isHoy ? 'bg-terra' : 'bg-border-warm'}`}
                        style={{ height: barPx }}
                        title={formatCOP(d.total)}
                      />
                      <span
                        className={`text-[10px] ${isHoy ? 'text-terra font-semibold' : 'text-ink-soft'}`}
                      >
                        {getDiaLabel(d.fecha)}
                      </span>
                    </div>
                  )
                })
              })()}
            </div>
          </div>

          {/* ÚLTIMAS VENTAS */}
          <div className="bg-white rounded-2xl border border-border-warm shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-warm">
              <p className="text-sm font-semibold text-ink">Últimas ventas</p>
              <Link href="/ventas" className="text-xs text-terra font-medium hover:underline">
                Ver todas →
              </Link>
            </div>
            {ultimasVentas.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm text-ink-soft">Aún no hay ventas registradas.</p>
                <Link href="/ventas" className="text-sm text-terra font-medium hover:underline mt-1 block">
                  Registra la primera →
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="bg-cream border-b border-border-warm">
                    <th className="text-left px-6 py-3 text-[11px] font-semibold text-ink-soft uppercase tracking-wide">
                      Fecha
                    </th>
                    <th className="text-left px-6 py-3 text-[11px] font-semibold text-ink-soft uppercase tracking-wide">
                      Producto
                    </th>
                    <th className="text-left px-6 py-3 text-[11px] font-semibold text-ink-soft uppercase tracking-wide">
                      Canal
                    </th>
                    <th className="text-right px-6 py-3 text-[11px] font-semibold text-ink-soft uppercase tracking-wide">
                      Neto
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ultimasVentas.map((v, i) => (
                    <tr
                      key={v.id}
                      className={`border-b border-border-warm/60 hover:bg-cream/60 transition ${
                        i === ultimasVentas.length - 1 ? 'border-b-0' : ''
                      }`}
                    >
                      <td className="px-6 py-3.5 text-ink-soft text-xs">{formatFecha(v.fecha)}</td>
                      <td className="px-6 py-3.5 font-medium text-ink">
                        {v.items.map((item) => `${item.producto_nombre} × ${item.cantidad}`).join(', ')}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            CANAL_COLORS[v.canal] ?? 'bg-border-warm text-ink-mid'
                          }`}
                        >
                          {v.canal}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-[#2D4A3E]">{formatCOP(v.total_neto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </div>

        {/* INVENTARIO */}
        <div className="bg-white rounded-2xl border border-border-warm shadow-sm overflow-hidden h-fit">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-warm">
            <p className="text-sm font-semibold text-ink">Inventario</p>
            <Link href="/productos" className="text-xs text-terra font-medium hover:underline">
              Ver todo →
            </Link>
          </div>
          {todosProductos.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm text-ink-soft">Sin productos aún.</p>
            </div>
          ) : (
            <div className="divide-y divide-border-warm/60">
              {todosProductos.slice(0, 6).map((p) => {
                const agotado = p.stock_actual === 0
                const bajo = !agotado && p.stock_actual <= p.stock_minimo
                return (
                  <div key={p.id} className="flex items-center gap-3 px-6 py-3.5">
                    <div className="w-8 h-8 rounded-lg bg-cream flex items-center justify-center text-sm flex-shrink-0">
                      📦
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{p.nombre}</p>
                      {p.sku && <p className="text-[11px] text-ink-soft">{p.sku}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-ink">{p.stock_actual} uds</p>
                      {agotado ? (
                        <span className="text-[10px] font-semibold text-red-alert bg-red-pale px-2 py-0.5 rounded-full">
                          Agotado
                        </span>
                      ) : bajo ? (
                        <span className="text-[10px] font-semibold text-gold bg-gold-pale px-2 py-0.5 rounded-full">
                          Stock bajo
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-green bg-green-pale px-2 py-0.5 rounded-full">
                          OK
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
