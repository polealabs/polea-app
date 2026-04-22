'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTienda } from '@/lib/hooks/useTienda'
import { DashboardHomeSkeleton } from '@/components/skeletons/DashboardHomeSkeleton'
import type { Producto, VentaCabecera, Cliente } from '@/lib/types'
import { crearVentaMulti } from '@/app/(dashboard)/ventas/actions'
import { calcularNetoConDescuento } from '@/lib/utils'

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

type LineaVentaForm = {
  producto_id: string
  cantidad: number
  precio_venta: number
  precio_original: number
  descuento: number
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
  const [loading, setLoading] = useState(true)
  const [semanaOffset, setSemanaOffset] = useState(0)
  const [notificacionesActivas, setNotificacionesActivas] = useState<
    { tipo: string; mensaje: string; link: string }[]
  >([])

  const [totalGastosMes, setTotalGastosMes] = useState(0)
  const [canalTop, setCanalTop] = useState<[string, number] | null>(null)
  const [clienteTop, setClienteTop] = useState<{ nombre: string; total: number } | null>(null)
  const [productoTop, setProductoTop] = useState<{ nombre: string; cantidad: number } | null>(null)

  const [showVentaModal, setShowVentaModal] = useState(false)
  const [productosVenta, setProductosVenta] = useState<Producto[]>([])
  const [clientesVenta, setClientesVenta] = useState<Cliente[]>([])
  const [canal, setCanal] = useState('WhatsApp')
  const [plataforma, setPlataforma] = useState('Efectivo')
  const [fechaVenta, setFechaVenta] = useState(() => new Date().toISOString().split('T')[0])
  const [clienteId, setClienteId] = useState('')
  const [lineas, setLineas] = useState<LineaVentaForm[]>([
    { producto_id: '', cantidad: 1, precio_venta: 0, precio_original: 0, descuento: 0 },
  ])
  const [submittingVenta, setSubmittingVenta] = useState(false)
  const [errorVenta, setErrorVenta] = useState<string | null>(null)
  const [, setShowClienteFormModal] = useState(false)

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

    const stockBajo = listaProductos.filter((p) => p.stock_actual <= p.stock_minimo)
    setProductosStockBajo(stockBajo)

    const { data: ventasRecientes } = await supabase
      .from('venta_items')
      .select('producto_id')
      .eq('tienda_id', tienda.id)
      .gte('created_at', hace30 + 'T00:00:00')

    const idsConMovimiento = new Set((ventasRecientes ?? []).map((v) => v.producto_id))
    const sinMovimiento = (listaProductos ?? []).filter(
      (p) => p.stock_actual > 0 && !idsConMovimiento.has(p.id),
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

    const inicioMes = `${mesActual}-01`

    const [
      { data: gastosData },
      { data: ventasCanal },
      { data: ventasClienteMes },
      { data: itemsMes },
    ] = await Promise.all([
      supabase.from('gastos').select('monto').eq('tienda_id', tienda.id).gte('fecha', inicioMes),
      supabase.from('ventas_cabecera').select('canal').eq('tienda_id', tienda.id).gte('fecha', inicioMes),
      supabase
        .from('ventas_cabecera')
        .select('cliente_id')
        .eq('tienda_id', tienda.id)
        .gte('fecha', inicioMes)
        .not('cliente_id', 'is', null),
      supabase
        .from('venta_items')
        .select('producto_id, cantidad, productos(nombre)')
        .eq('tienda_id', tienda.id)
        .gte('created_at', `${inicioMes}T00:00:00`),
    ])

    const totalGastos = (gastosData ?? []).reduce((s, g) => s + (g.monto ?? 0), 0)
    setTotalGastosMes(totalGastos)

    const conteoCanales = new Map<string, number>()
    ;(ventasCanal ?? []).forEach((v) => {
      conteoCanales.set(v.canal, (conteoCanales.get(v.canal) ?? 0) + 1)
    })
    const canalTopEntry =
      conteoCanales.size > 0
        ? ([...conteoCanales.entries()].sort((a, b) => b[1] - a[1])[0] as [string, number])
        : null
    setCanalTop(canalTopEntry)

    const conteoClienteCompras = new Map<string, number>()
    ;(ventasClienteMes ?? []).forEach((v) => {
      if (!v.cliente_id) return
      conteoClienteCompras.set(v.cliente_id, (conteoClienteCompras.get(v.cliente_id) ?? 0) + 1)
    })
    let clienteTopVal: { nombre: string; total: number } | null = null
    if (conteoClienteCompras.size > 0) {
      const [topClienteId, totalVentas] = [...conteoClienteCompras.entries()].sort((a, b) => b[1] - a[1])[0]
      const nombreCli =
        (clientesInfoRes.data ?? []).find((c) => c.id === topClienteId)?.nombre ?? '—'
      clienteTopVal = { nombre: nombreCli, total: totalVentas }
    }
    setClienteTop(clienteTopVal)

    const conteoProductosMes = new Map<string, { nombre: string; cantidad: number }>()
    ;(itemsMes ?? []).forEach(
      (item: {
        producto_id: string
        cantidad: number
        productos?: { nombre?: string } | { nombre?: string }[] | null
      }) => {
        const prod = item.productos
        const nombre = Array.isArray(prod) ? prod[0]?.nombre ?? '—' : prod?.nombre ?? '—'
        const prev = conteoProductosMes.get(item.producto_id) ?? { nombre, cantidad: 0 }
        conteoProductosMes.set(item.producto_id, {
          nombre,
          cantidad: prev.cantidad + item.cantidad,
        })
      },
    )
    const productoTopVal =
      conteoProductosMes.size > 0
        ? [...conteoProductosMes.values()].sort((a, b) => b.cantidad - a.cantidad)[0]
        : null
    setProductoTop(productoTopVal)

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

  function cerrarModal() {
    setShowVentaModal(false)
    setLineas([{ producto_id: '', cantidad: 1, precio_venta: 0, precio_original: 0, descuento: 0 }])
    setCanal('WhatsApp')
    setPlataforma('Efectivo')
    setFechaVenta(new Date().toISOString().split('T')[0])
    setClienteId('')
    setErrorVenta(null)
    setShowClienteFormModal(false)
  }

  async function handleGuardarVenta() {
    if (!tienda) return
    const lineasValidas = lineas.filter((l) => l.producto_id && l.cantidad > 0 && l.precio_venta >= 0)
    if (lineasValidas.length === 0) {
      setErrorVenta('Agrega al menos un producto')
      return
    }

    setSubmittingVenta(true)
    setErrorVenta(null)

    const result = await crearVentaMulti({
      cliente_id: clienteId || undefined,
      canal,
      plataforma_pago: plataforma,
      fecha: fechaVenta,
      lineas: lineasValidas.map((l) => ({
        producto_id: l.producto_id,
        cantidad: l.cantidad,
        precio_venta: l.precio_venta,
        descuento: l.descuento ?? 0,
      })),
    })

    if (result?.error) {
      setErrorVenta(result.error)
    } else {
      cerrarModal()
      await loadDashboardData()
    }
    setSubmittingVenta(false)
  }

  useEffect(() => {
    if (!showVentaModal || !tienda) return
    const supabase = createClient()
    void Promise.all([
      supabase.from('productos').select('*').eq('tienda_id', tienda.id).gt('stock_actual', 0).order('nombre'),
      supabase.from('clientes').select('*').eq('tienda_id', tienda.id).order('nombre'),
    ]).then(([{ data: prods }, { data: cls }]) => {
      setProductosVenta((prods ?? []) as Producto[])
      setClientesVenta((cls ?? []) as Cliente[])
    })
  }, [showVentaModal, tienda])

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
      <div className="mb-9">
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
      </div>

      {/* ALERTAS BANNER */}
      {notificacionesActivas.length > 0 && (
        <div className="bg-[#2D4A3E] rounded-2xl p-5 flex items-center gap-4 mb-4 relative">
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
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 text-xs text-[#E8845A] font-medium underline underline-offset-2 whitespace-nowrap text-right hover:text-white transition"
              >
                Ver →
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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

        {/* Columna derecha: resumen y destacados */}
        <div className="h-fit">
          <div className="bg-white rounded-2xl border border-[#EDE5DC] shadow-sm p-5 mb-4">
            <p className="text-xs font-semibold text-[#8A7D72] uppercase tracking-wide mb-4">Resumen del mes</p>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#8A7D72]">Ventas netas</span>
                <span className="text-sm font-semibold text-[#1A1510]">{formatCOP(ventasMes)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#8A7D72]">Gastos</span>
                <span className="text-sm font-semibold text-[#1A1510]">- {formatCOP(totalGastosMes)}</span>
              </div>
              <div className="pt-2 border-t border-[#EDE5DC] flex justify-between items-center">
                <span className="text-sm font-semibold text-[#1A1510]">Utilidad estimada</span>
                <span
                  className={`text-sm font-bold ${
                    ventasMes - totalGastosMes >= 0 ? 'text-[#3A7D5A]' : 'text-[#C44040]'
                  }`}
                >
                  {formatCOP(ventasMes - totalGastosMes)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#EDE5DC] shadow-sm p-5 mb-4">
            <p className="text-xs font-semibold text-[#8A7D72] uppercase tracking-wide mb-4">Destacados del mes</p>
            <div className="space-y-3">
              <div className="flex justify-between items-center gap-2">
                <span className="text-sm text-[#8A7D72] shrink-0">Canal top</span>
                <span className="text-sm font-semibold text-[#1A1510] text-right">
                  {canalTop ? `${canalTop[0]} (${canalTop[1]} ventas)` : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-sm text-[#8A7D72] shrink-0">Cliente top</span>
                <span className="text-sm font-semibold text-[#1A1510] truncate max-w-[140px] text-right">
                  {clienteTop?.nombre ?? '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#EDE5DC] shadow-sm p-5">
            <p className="text-xs font-semibold text-[#8A7D72] uppercase tracking-wide mb-3">⭐ Producto estrella</p>
            {productoTop ? (
              <div>
                <p className="text-sm font-semibold text-[#1A1510]">{productoTop.nombre}</p>
                <p className="text-xs text-[#8A7D72] mt-0.5">{productoTop.cantidad} unidades vendidas este mes</p>
              </div>
            ) : (
              <p className="text-sm text-[#8A7D72]">Sin ventas registradas este mes</p>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowVentaModal(true)}
        className="fixed bottom-6 right-6 z-40 bg-[#C4622D] hover:bg-[#E8845A] text-white font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 transition"
      >
        <span className="text-lg">↗</span>
        Nueva venta
      </button>

      {showVentaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EDE5DC] sticky top-0 bg-white rounded-t-2xl">
              <p className="text-base font-semibold text-[#1E3A2F]">Nueva venta</p>
              <button type="button" onClick={cerrarModal} className="text-[#8A7D72] hover:text-[#1A1510] transition text-xl">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#8A7D72] mb-1">Canal</label>
                  <select
                    value={canal}
                    onChange={(e) => setCanal(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#EDE5DC] text-sm text-[#1A1510] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30"
                  >
                    <option>WhatsApp</option>
                    <option>Instagram</option>
                    <option>Web</option>
                    <option>Presencial</option>
                    <option>Tienda multimarca</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#8A7D72] mb-1">Plataforma</label>
                  <select
                    value={plataforma}
                    onChange={(e) => setPlataforma(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#EDE5DC] text-sm text-[#1A1510] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30"
                  >
                    <option>Efectivo</option>
                    <option>Transferencia</option>
                    <option>Nequi</option>
                    <option>Daviplata</option>
                    <option>Wompi</option>
                    <option>Bold</option>
                    <option>Contraentrega</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#8A7D72] mb-1">Fecha</label>
                  <input
                    type="date"
                    value={fechaVenta}
                    onChange={(e) => setFechaVenta(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 rounded-lg border border-[#EDE5DC] text-sm text-[#1A1510] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8A7D72] mb-1">Cliente (opcional)</label>
                <div className="flex gap-2">
                  <select
                    value={clienteId}
                    onChange={(e) => setClienteId(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-[#EDE5DC] text-sm text-[#1A1510] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30"
                  >
                    <option value="">Sin cliente</option>
                    {clientesVenta.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-[#8A7D72] mb-2">Productos</p>
                <div className="space-y-3">
                  {lineas.map((linea, i) => {
                    const { neto: netoLinea } = calcularNetoConDescuento(
                      linea.precio_venta,
                      linea.cantidad,
                      linea.descuento,
                      plataforma,
                    )
                    return (
                      <div key={i} className="bg-[#FAF6F0] rounded-xl p-3 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="sm:col-span-1">
                            <label className="block text-xs text-[#8A7D72] mb-1">Producto</label>
                            <select
                              value={linea.producto_id}
                              onChange={(e) => {
                                const prod = productosVenta.find((p) => p.id === e.target.value)
                                const nuevas = [...lineas]
                                nuevas[i] = {
                                  ...nuevas[i],
                                  producto_id: e.target.value,
                                  precio_venta: prod?.precio_venta ?? 0,
                                  precio_original: prod?.precio_venta ?? 0,
                                }
                                setLineas(nuevas)
                              }}
                              className="w-full px-3 py-2 rounded-lg border border-[#EDE5DC] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30"
                            >
                              <option value="">Selecciona</option>
                              {productosVenta.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.nombre} — {p.stock_actual} uds
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-[#8A7D72] mb-1">Cantidad</label>
                            <input
                              type="number"
                              min={1}
                              value={linea.cantidad}
                              onChange={(e) => {
                                const n = [...lineas]
                                n[i] = { ...n[i], cantidad: Number(e.target.value) }
                                setLineas(n)
                              }}
                              className="w-full px-3 py-2 rounded-lg border border-[#EDE5DC] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[#8A7D72] mb-1">Precio</label>
                            <input
                              type="number"
                              min={0}
                              value={linea.precio_venta || ''}
                              onChange={(e) => {
                                const n = [...lineas]
                                n[i] = { ...n[i], precio_venta: Number(e.target.value) }
                                setLineas(n)
                              }}
                              className="w-full px-3 py-2 rounded-lg border border-[#EDE5DC] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-[#8A7D72]">Descuento %</label>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={linea.descuento || ''}
                              onChange={(e) => {
                                const n = [...lineas]
                                n[i] = {
                                  ...n[i],
                                  descuento: Math.min(100, Math.max(0, Number(e.target.value))),
                                }
                                setLineas(n)
                              }}
                              className="w-16 px-2 py-1 rounded-lg border border-[#EDE5DC] text-sm bg-white text-center focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30"
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-[#1E3A2F] font-semibold">
                              Neto:{' '}
                              {new Intl.NumberFormat('es-CO', {
                                style: 'currency',
                                currency: 'COP',
                                minimumFractionDigits: 0,
                              }).format(netoLinea)}
                            </span>
                            {lineas.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setLineas(lineas.filter((_, j) => j !== i))}
                                className="text-xs text-[#C44040] hover:underline"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setLineas([
                      ...lineas,
                      {
                        producto_id: '',
                        cantidad: 1,
                        precio_venta: 0,
                        precio_original: 0,
                        descuento: 0,
                      },
                    ])
                  }
                  className="mt-2 text-xs text-[#C4622D] font-medium hover:underline"
                >
                  + Agregar producto
                </button>
              </div>

              {lineas.some((l) => l.producto_id && l.precio_venta > 0) && (
                <div className="bg-[#F9EDE5] rounded-xl p-4 space-y-1">
                  {(() => {
                    const totalNeto = lineas.reduce((s, l) => {
                      const { neto } = calcularNetoConDescuento(l.precio_venta, l.cantidad, l.descuento, plataforma)
                      return s + neto
                    }, 0)
                    const totalBruto = lineas.reduce((s, l) => s + l.precio_venta * l.cantidad, 0)
                    return (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-[#8A7D72]">Total bruto</span>
                          <span className="text-[#1A1510]">
                            {new Intl.NumberFormat('es-CO', {
                              style: 'currency',
                              currency: 'COP',
                              minimumFractionDigits: 0,
                            }).format(totalBruto)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm font-bold">
                          <span className="text-[#1E3A2F]">Total neto</span>
                          <span className="text-[#1E3A2F]">
                            {new Intl.NumberFormat('es-CO', {
                              style: 'currency',
                              currency: 'COP',
                              minimumFractionDigits: 0,
                            }).format(totalNeto)}
                          </span>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}

              {errorVenta && (
                <p className="text-sm text-[#C44040] bg-[#FDEAEA] px-4 py-2.5 rounded-lg">{errorVenta}</p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-[#EDE5DC] flex gap-3 justify-end sticky bottom-0 bg-white rounded-b-2xl">
              <button
                type="button"
                onClick={cerrarModal}
                className="text-sm text-[#8A7D72] hover:text-[#1A1510] px-4 py-2 rounded-lg border border-[#EDE5DC] transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleGuardarVenta()}
                disabled={submittingVenta}
                className="text-sm bg-[#C4622D] text-white font-semibold px-4 py-2 rounded-lg hover:bg-[#E8845A] transition disabled:opacity-50"
              >
                {submittingVenta ? 'Guardando...' : 'Guardar venta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
