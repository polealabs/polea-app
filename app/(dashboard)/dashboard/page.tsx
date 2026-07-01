'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTienda } from '@/lib/hooks/useTienda'
import { DashboardHomeSkeleton } from '@/components/skeletons/DashboardHomeSkeleton'
import ProductoSelect from '@/components/ui/ProductoSelect'
import ClienteInlineForm from '@/components/ui/ClienteInlineForm'
import type { Cliente, MedioPago, Producto, ProductoVariante, VentaCabecera } from '@/lib/types'
import { crearVentaMulti } from '@/app/(dashboard)/ventas/actions'
import { calcularComisionMedioPago, toLocalISODateString, toLocalISOYearMonthString, formatCOP } from '@/lib/utils'

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

type LineaVentaForm = {
  producto_id: string
  variante_id?: string
  cantidad: number
  precio_venta: number
  precio_original: number
  descuento: number
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
  const hoy = toLocalISODateString()
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
      dias.push(toLocalISODateString(d))
    }
  }

  return {
    desde: toLocalISODateString(inicio),
    hasta: toLocalISODateString(finReal),
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
  const [nombreUsuario, setNombreUsuario] = useState<string | null>(null)
  const [productosStockBajo, setProductosStockBajo] = useState<Producto[]>([])
  const [ultimasVentas, setUltimasVentas] = useState<VentaConDetalles[]>([])
  const [loading, setLoading] = useState(true)
  const [semanaOffset, setSemanaOffset] = useState(0)
  const [periodoGrafico, setPeriodoGrafico] = useState<'semana' | 'mes' | 'anio'>('semana')
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear())
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth())
  const [datosGrafico, setDatosGrafico] = useState<{ label: string; total: number }[]>([])
  const [aniosDisponibles, setAniosDisponibles] = useState<number[]>([new Date().getFullYear()])
  const [notificacionesActivas, setNotificacionesActivas] = useState<
    { tipo: string; mensaje: string; link: string }[]
  >([])

  const [totalGastosMes, setTotalGastosMes] = useState(0)
  const [top3Canales, setTop3Canales] = useState<{ canal: string; total: number }[]>([])
  const [top3Clientes, setTop3Clientes] = useState<{ nombre: string; total: number }[]>([])
  const [productoTop, setProductoTop] = useState<{ nombre: string; cantidad: number } | null>(null)

  const [showVentaModal, setShowVentaModal] = useState(false)
  const [productosVenta, setProductosVenta] = useState<Producto[]>([])
  const [variantesVenta, setVariantesVenta] = useState<Map<string, ProductoVariante[]>>(() => new Map())
  const [clientesVenta, setClientesVenta] = useState<Cliente[]>([])
  const [mediosPago, setMediosPago] = useState<MedioPago[]>([])
  const [canal, setCanal] = useState('WhatsApp')
  const [medioId, setMedioId] = useState('')
  const [envio, setEnvio] = useState(0)
  const [fechaVenta, setFechaVenta] = useState(() => toLocalISODateString())
  const [clienteId, setClienteId] = useState('')
  const [lineas, setLineas] = useState<LineaVentaForm[]>([
    { producto_id: '', cantidad: 1, precio_venta: 0, precio_original: 0, descuento: 0 },
  ])
  const [submittingVenta, setSubmittingVenta] = useState(false)
  const [errorVenta, setErrorVenta] = useState<string | null>(null)
  const [showClienteFormModal, setShowClienteFormModal] = useState(false)

  useEffect(() => {
    if (!tiendaLoading && !tienda) {
      router.replace('/onboarding')
    }
  }, [tienda, tiendaLoading, router])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void (async () => {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          const { data: perfil } = await supabase
            .from('perfiles')
            .select('nombre')
            .eq('id', user.id)
            .maybeSingle()
          if (perfil?.nombre) setNombreUsuario(perfil.nombre)
          else setNombreUsuario(user.email?.split('@')[0] ?? null)
        }
      })()
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  const loadDashboardData = useCallback(async () => {
    if (!tienda) return

    const tiendaId = tienda.id
    const supabase = createClient()

    const ahora = new Date()
    const hoy = toLocalISODateString(ahora)
    const mesActual = toLocalISOYearMonthString(ahora)
    const mesActualStr = mesActual

    const d30 = new Date(ahora)
    d30.setDate(ahora.getDate() - 30)
    const hace30 = toLocalISODateString(d30)

    const mesAnteriorDate = new Date(ahora)
    mesAnteriorDate.setMonth(mesAnteriorDate.getMonth() - 1)
    const mesAnteriorStr = toLocalISOYearMonthString(mesAnteriorDate)

    const d60 = new Date(ahora)
    d60.setDate(ahora.getDate() - 60)
    const hace60 = toLocalISODateString(d60)

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
        supabase.from('productos').select('*').eq('tienda_id', tiendaId).neq('estado', 'archivado'),
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

    const { data: primeraVenta } = await supabase
      .from('ventas_cabecera')
      .select('fecha')
      .eq('tienda_id', tienda.id)
      .order('fecha', { ascending: true })
      .limit(1)
      .maybeSingle()

    const anioMasAntiguo = primeraVenta
      ? new Date(primeraVenta.fecha).getFullYear()
      : new Date().getFullYear()

    const anioActual = new Date().getFullYear()
    const years: number[] = []
    for (let y = anioMasAntiguo; y <= anioActual; y++) years.push(y)
    setAniosDisponibles(years)

    const totalHoy = (ventasHoyRes.data ?? []).reduce((s, v) => s + (v.total_neto ?? 0), 0)
    const totalMes = (ventasMesRes.data ?? []).reduce((s, v) => s + (v.total_neto ?? 0), 0)

    const listaProductos = todosProductosRes.data ?? []

    const { data: variantesData } = await supabase
      .from('producto_variantes')
      .select('producto_id, stock_actual, stock_minimo')
      .eq('tienda_id', tienda.id)
      .eq('activa', true)

    const mapaVariantesBajas = new Map<string, boolean>()
    const mapaVariantesStock = new Map<string, number>()
    for (const v of variantesData ?? []) {
      mapaVariantesStock.set(v.producto_id, (mapaVariantesStock.get(v.producto_id) ?? 0) + v.stock_actual)
      // Same condition as productos/page.tsx: stock <= minimo covers both bajo and agotado variants
      if (v.stock_actual <= (v.stock_minimo ?? 0)) mapaVariantesBajas.set(v.producto_id, true)
    }

    const stockBajo = listaProductos.filter((p) => {
      const variantesReales = (variantesData ?? []).filter((v) => v.producto_id === p.id)
      const tieneVariantesReal = variantesReales.length > 0
      if (tieneVariantesReal) {
        // Match productos module: agotado = total stock <= 0, bajo = any variant <= minimo
        const stockTotal = mapaVariantesStock.get(p.id) ?? 0
        return stockTotal <= 0 || (mapaVariantesBajas.get(p.id) ?? false)
      }
      return p.stock_actual <= 0 || (p.stock_actual > 0 && p.stock_actual <= (p.stock_minimo ?? 0))
    })
    setProductosStockBajo(stockBajo)

    const { data: ventasRecientes } = await supabase
      .from('venta_items')
      .select('producto_id')
      .eq('tienda_id', tienda.id)
      .gte('created_at', hace30 + 'T00:00:00')

    const idsConMovimiento = new Set((ventasRecientes ?? []).map((v) => v.producto_id))
    const sinMovimiento = (listaProductos ?? []).filter((p) => {
      const tieneVariantesReal = (variantesData ?? []).some((v) => v.producto_id === p.id)
      const stockReal = tieneVariantesReal ? (mapaVariantesStock.get(p.id) ?? 0) : p.stock_actual
      return stockReal > 0 && !idsConMovimiento.has(p.id)
    })

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
    const inicioMesSiguienteDate = new Date(`${inicioMes}T12:00:00`)
    inicioMesSiguienteDate.setMonth(inicioMesSiguienteDate.getMonth() + 1)
    const inicioMesSiguiente = toLocalISODateString(inicioMesSiguienteDate)

    const [
      { data: gastosData },
      { data: ventasMesRows },
      { data: itemsMes },
    ] = await Promise.all([
      supabase
        .from('gastos')
        .select('monto')
        .eq('tienda_id', tienda.id)
        .gte('fecha', inicioMes)
        .lt('fecha', inicioMesSiguiente),
      supabase
        .from('ventas_cabecera')
        .select('canal, cliente_id, total_neto')
        .eq('tienda_id', tienda.id)
        .gte('fecha', inicioMes)
        .lt('fecha', inicioMesSiguiente),
      // Producto estrella: unidades vendidas del mes según la FECHA de la venta
      // (no created_at, que registraba cuándo se digitó la fila y no reflejaba el mes).
      supabase
        .from('venta_items')
        .select('producto_id, cantidad, productos(nombre), ventas_cabecera!inner(fecha)')
        .eq('tienda_id', tienda.id)
        .gte('ventas_cabecera.fecha', inicioMes)
        .lt('ventas_cabecera.fecha', inicioMesSiguiente),
    ])

    const totalGastos = (gastosData ?? []).reduce((s, g) => s + (g.monto ?? 0), 0)
    setTotalGastosMes(totalGastos)

    // Top 3 canales y clientes del mes por MONTO vendido (total neto).
    const montoPorCanal = new Map<string, number>()
    const montoPorCliente = new Map<string, number>()
    ;(ventasMesRows ?? []).forEach((v) => {
      montoPorCanal.set(v.canal, (montoPorCanal.get(v.canal) ?? 0) + (v.total_neto ?? 0))
      if (v.cliente_id) {
        montoPorCliente.set(v.cliente_id, (montoPorCliente.get(v.cliente_id) ?? 0) + (v.total_neto ?? 0))
      }
    })
    setTop3Canales(
      [...montoPorCanal.entries()]
        .map(([canal, total]) => ({ canal, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 3),
    )
    const nombresClientes = new Map((clientesInfoRes.data ?? []).map((c) => [c.id, c.nombre]))
    setTop3Clientes(
      [...montoPorCliente.entries()]
        .map(([id, total]) => ({ nombre: nombresClientes.get(id) ?? '—', total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 3),
    )

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
    setMedioId('')
    setEnvio(0)
    setFechaVenta(toLocalISODateString())
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
    // Si el producto tiene variantes, exige elegir una.
    const faltaVariante = lineasValidas.find(
      (l) => (variantesVenta.get(l.producto_id) ?? []).length > 0 && !l.variante_id,
    )
    if (faltaVariante) {
      const prod = productosVenta.find((p) => p.id === faltaVariante.producto_id)
      setErrorVenta(`Selecciona una variante para «${prod?.nombre ?? 'el producto'}»`)
      return
    }

    setSubmittingVenta(true)
    setErrorVenta(null)

    const result = await crearVentaMulti({
      cliente_id: clienteId || undefined,
      canal,
      plataforma_pago: 'Efectivo',
      medio_pago_id: medioId || undefined,
      envio,
      fecha: fechaVenta,
      lineas: lineasValidas.map((l) => ({
        producto_id: l.producto_id,
        variante_id: l.variante_id || undefined,
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

  async function handleClienteCreado(cliente: { id: string; nombre: string }) {
    if (!tienda) return
    const supabase = createClient()
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .eq('tienda_id', tienda.id)
      .order('nombre')
    const lista = (data ?? []) as Cliente[]
    setClientesVenta(lista)
    const nombreNorm = cliente.nombre.trim().toLowerCase()
    const nuevo = lista.find((c) => c.nombre.trim().toLowerCase() === nombreNorm)
    if (nuevo) setClienteId(nuevo.id)
    setShowClienteFormModal(false)
  }

  useEffect(() => {
    if (!showVentaModal || !tienda) return
    const supabase = createClient()
    void Promise.all([
      // Sin filtro .gt('stock_actual', 0): los productos con variantes tienen
      // stock_actual = 0 en el padre; su stock real vive en producto_variantes.
      supabase
        .from('productos')
        .select('*')
        .eq('tienda_id', tienda.id)
        .neq('estado', 'archivado')
        .order('nombre'),
      supabase.from('clientes').select('*').eq('tienda_id', tienda.id).order('nombre'),
      supabase.from('medios_pago').select('*').eq('tienda_id', tienda.id).eq('activo', true).order('nombre'),
      supabase.from('producto_variantes').select('*').eq('tienda_id', tienda.id).eq('activa', true),
    ]).then(([{ data: prods }, { data: cls }, { data: medios }, { data: vars }]) => {
      const mapVar = new Map<string, ProductoVariante[]>()
      ;(vars ?? []).forEach((v) => {
        const row = v as ProductoVariante
        const arr = mapVar.get(row.producto_id) ?? []
        arr.push(row)
        mapVar.set(row.producto_id, arr)
      })
      // Mostrar solo productos vendibles: con stock propio o con alguna variante con stock.
      const vendibles = ((prods ?? []) as Producto[]).filter(
        (p) => p.stock_actual > 0 || (mapVar.get(p.id) ?? []).some((v) => v.stock_actual > 0),
      )
      setProductosVenta(vendibles)
      setVariantesVenta(mapVar)
      setClientesVenta((cls ?? []) as Cliente[])
      setMediosPago((medios ?? []) as MedioPago[])
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

  const cargarDatosGrafico = useCallback(async () => {
    if (!tienda) return
    const supabase = createClient()
    setDatosGrafico([])

    if (periodoGrafico === 'semana') {
      const { desde, hasta, dias } = getRangoSemana(semanaOffset)
      const { data } = await supabase
        .from('ventas_cabecera')
        .select('fecha, total_neto')
        .eq('tienda_id', tienda.id)
        .gte('fecha', desde)
        .lte('fecha', hasta)

      const resultado = dias.map((fecha) => ({
        label: getDiaLabel(fecha),
        total: (data ?? []).filter((v) => v.fecha === fecha).reduce((s, v) => s + (v.total_neto ?? 0), 0),
      }))
      setDatosGrafico(resultado)
    } else if (periodoGrafico === 'mes') {
      const ultimoDia = new Date(anioSeleccionado, mesSeleccionado + 1, 0)
      const inicioStr = `${anioSeleccionado}-${String(mesSeleccionado + 1).padStart(2, '0')}-01`
      const finStr = `${anioSeleccionado}-${String(mesSeleccionado + 1).padStart(2, '0')}-${String(ultimoDia.getDate()).padStart(2, '0')}`

      const { data } = await supabase
        .from('ventas_cabecera')
        .select('fecha, total_neto')
        .eq('tienda_id', tienda.id)
        .gte('fecha', inicioStr)
        .lte('fecha', finStr)

      const semanas: { label: string; total: number }[] = []
      let diaActual = 1
      let numSemana = 1
      while (diaActual <= ultimoDia.getDate()) {
        const finSemana = Math.min(diaActual + 6, ultimoDia.getDate())
        const total = (data ?? [])
          .filter((v) => {
            const dia = new Date(v.fecha + 'T12:00:00').getDate()
            return dia >= diaActual && dia <= finSemana
          })
          .reduce((s, v) => s + (v.total_neto ?? 0), 0)
        semanas.push({ label: `Sem ${numSemana}`, total })
        diaActual += 7
        numSemana++
      }
      setDatosGrafico(semanas)
    } else {
      const { data } = await supabase
        .from('ventas_cabecera')
        .select('fecha, total_neto')
        .eq('tienda_id', tienda.id)
        .gte('fecha', `${anioSeleccionado}-01-01`)
        .lte('fecha', `${anioSeleccionado}-12-31`)

      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      const resultado = meses.map((label, i) => ({
        label,
        total: (data ?? [])
          .filter((v) => new Date(v.fecha + 'T12:00:00').getMonth() === i)
          .reduce((s, v) => s + (v.total_neto ?? 0), 0),
      }))
      setDatosGrafico(resultado)
    }
  }, [tienda, periodoGrafico, semanaOffset, anioSeleccionado, mesSeleccionado])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void cargarDatosGrafico()
    }, 0)
    return () => window.clearTimeout(id)
  }, [tienda, periodoGrafico, semanaOffset, anioSeleccionado, mesSeleccionado, cargarDatosGrafico])

  if (tiendaLoading || loading) {
    return <DashboardHomeSkeleton />
  }

  if (!tienda) return null

  return (
    <div className="w-full p-4 md:p-6 xl:p-10">
      {/* HEADER */}
      <div className="mb-9">
        <div className="min-w-0">
          <h1 className="font-serif text-[32px] font-medium leading-tight" style={{ color: 'var(--color-greeting-text)' }}>
            {getSaludo()},{' '}
            <span className="italic" style={{ color: 'var(--color-accent)' }}>
              {nombreUsuario || tienda?.nombre}
            </span>
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
        <div className="rounded-xl px-4 py-2.5 flex items-center gap-3 mb-4" style={{ background: 'var(--color-primary)' }}>
          <span className="text-white/60 text-sm flex-shrink-0">✦</span>
          <div className="flex flex-wrap gap-x-5 gap-y-1 min-w-0">
            {notificacionesActivas.map((alerta, i) => (
              <Link
                key={`${alerta.tipo}-${i}`}
                href={alerta.link}
                onClick={e => e.stopPropagation()}
                className="text-xs text-white/85 hover:text-white hover:underline underline-offset-2 transition whitespace-nowrap"
              >
                {alerta.mensaje} →
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div
          className="bg-white rounded-2xl border border-border-warm p-5 relative overflow-hidden shadow-sm"
          style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}
        >
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-terra" />
          <p className="text-xs text-ink-soft mb-2">Ventas hoy</p>
          <p className="font-serif text-[26px] font-medium text-ink leading-none">{formatCOP(ventasHoy)}</p>
        </div>
        <div
          className="bg-white rounded-2xl border border-border-warm p-5 relative overflow-hidden shadow-sm"
          style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}
        >
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--color-primary)]" />
          <p className="text-xs text-ink-soft mb-2">Este mes (neto)</p>
          <p className="font-serif text-[26px] font-medium text-ink leading-none">{formatCOP(ventasMes)}</p>
        </div>
        <Link
          href="/productos?filtro=stock-bajo"
          className={`rounded-2xl border p-5 relative overflow-hidden shadow-sm block transition ${
            productosStockBajo.length > 0 ? 'bg-red-pale border-red-alert/20' : 'bg-white border-border-warm'
          }`}
          style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}
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
          {/* GRÁFICO DE VENTAS */}
          <div className="bg-white rounded-2xl border border-[#EDE5DC] p-6 shadow-sm"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            
            {/* Header del gráfico */}
            <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                  {periodoGrafico === 'semana' ? 'Ventas esta semana' : periodoGrafico === 'mes' ? 'Ventas este mes' : 'Ventas este año'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-soft)' }}>
                  {periodoGrafico === 'semana' && (() => {
                    const rango = getRangoSemana(semanaOffset)
                    const desde = new Date(rango.desde + 'T12:00:00')
                    const hasta = new Date(rango.hasta + 'T12:00:00')
                    const fmt = (d: Date) => d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
                    return `${fmt(desde)} – ${fmt(hasta)}`
                  })()}
                  {periodoGrafico === 'mes' && `${['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][mesSeleccionado]} ${anioSeleccionado}`}
                  {periodoGrafico === 'anio' && `Año ${anioSeleccionado}`}
                </p>
                <p className="font-serif text-[22px] font-medium mt-0.5" style={{ color: 'var(--color-text)' }}>
                  {formatCOP(datosGrafico.reduce((s, d) => s + d.total, 0))}
                </p>
              </div>

              {/* Controles */}
              <div className="flex items-center gap-2 flex-wrap">
                
                {/* Selector de período */}
                <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                  {(['semana', 'mes', 'anio'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => { setPeriodoGrafico(p); setSemanaOffset(0) }}
                      className="px-3 py-1.5 text-xs font-medium transition"
                      style={{
                        background: periodoGrafico === p ? 'var(--color-primary)' : 'var(--color-surface)',
                        color: periodoGrafico === p ? '#fff' : 'var(--color-text-soft)',
                      }}
                    >
                      {p === 'semana' ? 'Semana' : p === 'mes' ? 'Mes' : 'Año'}
                    </button>
                  ))}
                </div>

                {/* Selector de año (en modo mes y año) */}
                {(periodoGrafico === 'mes' || periodoGrafico === 'anio') && (
                  <select
                    value={anioSeleccionado}
                    onChange={e => setAnioSeleccionado(Number(e.target.value))}
                    className="text-xs px-2 py-1.5 rounded-lg border"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
                  >
                    {aniosDisponibles.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                )}

                {/* Selector de mes (solo en modo mes) */}
                {periodoGrafico === 'mes' && (
                  <select
                    value={mesSeleccionado}
                    onChange={e => setMesSeleccionado(Number(e.target.value))}
                    className="text-xs px-2 py-1.5 rounded-lg border"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
                  >
                    {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m, i) => (
                      <option key={i} value={i}>{m}</option>
                    ))}
                  </select>
                )}

                {/* Navegación semanas (solo en modo semana) */}
                {periodoGrafico === 'semana' && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSemanaOffset(o => Math.max(getMinOffset(), o - 1))}
                      disabled={semanaOffset <= getMinOffset()}
                      className="w-7 h-7 rounded-lg border flex items-center justify-center text-sm transition disabled:opacity-30"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-soft)', background: 'var(--color-surface)' }}
                    >‹</button>
                    <div className="w-8 flex items-center justify-center">
                      {semanaOffset < 0 && (
                        <button
                          type="button"
                          onClick={() => setSemanaOffset(0)}
                          className="text-xs font-medium"
                          style={{ color: 'var(--color-accent)' }}
                        >Hoy</button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSemanaOffset(o => Math.min(0, o + 1))}
                      disabled={semanaOffset >= 0}
                      className="w-7 h-7 rounded-lg border flex items-center justify-center text-sm transition disabled:opacity-30"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-soft)', background: 'var(--color-surface)' }}
                    >›</button>
                  </div>
                )}
              </div>
            </div>

            {/* BARRAS */}
            <div className="flex items-end mt-4" style={{ height: '100px', gap: '8px' }}>
              {(() => {
                const max = Math.max(...datosGrafico.map(d => d.total), 1)
                return datosGrafico.map((d, i) => {
                  const isHoy = periodoGrafico === 'semana' && semanaOffset === 0 && i === datosGrafico.length - 1
                  const heightPx = d.total > 0 ? Math.max(Math.round((d.total / max) * 100), 6) : 2
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1" style={{ height: '100px' }}>
                      {d.total > 0 && (
                        <span style={{
                          fontSize: '0.6rem',
                          fontWeight: 600,
                          lineHeight: 1,
                          color: isHoy ? 'var(--color-accent)' : 'var(--color-text-soft)',
                        }}>
                          {new Intl.NumberFormat('es-CO', { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1 }).format(d.total)}
                        </span>
                      )}
                      <div
                        style={{
                          width: '100%',
                          height: `${heightPx}px`,
                          background: isHoy ? 'var(--color-accent)' : 'var(--color-primary)',
                          opacity: isHoy ? 1 : 0.4,
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.3s ease',
                        }}
                        title={formatCOP(d.total)}
                      />
                      <span style={{
                        fontSize: '0.65rem',
                        color: isHoy ? 'var(--color-accent)' : 'var(--color-text-soft)',
                        fontWeight: isHoy ? 600 : 400,
                      }}>
                        {d.label}
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
          <div
            className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-5 mb-4"
            style={{ background: 'var(--color-surface)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
          >
            <p className="text-xs font-semibold text-[var(--color-text-soft)] uppercase tracking-wide mb-4">Resumen del mes</p>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--color-text-soft)]">Ventas netas</span>
                <span className="text-sm font-semibold text-[var(--color-text)]">{formatCOP(ventasMes)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--color-text-soft)]">Gastos</span>
                <span className="text-sm font-semibold text-[var(--color-text)]">- {formatCOP(totalGastosMes)}</span>
              </div>
              <div className="pt-2 border-t border-[var(--color-border)] flex justify-between items-center">
                <span className="text-sm font-semibold text-[var(--color-text)]">Utilidad estimada</span>
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

          <div
            className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-5 mb-4"
            style={{ background: 'var(--color-surface)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
          >
            <p className="text-xs font-semibold text-[var(--color-text-soft)] uppercase tracking-wide mb-4">Destacados del mes</p>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-[var(--color-text-soft)] mb-2">Top 3 canales</p>
                {top3Canales.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-faint)]">Sin ventas este mes</p>
                ) : (
                  <div className="space-y-1.5">
                    {top3Canales.map((c, i) => (
                      <div key={c.canal} className="flex justify-between items-center gap-2">
                        <span className="text-sm text-[var(--color-text)] truncate">
                          <span className="text-[var(--color-text-faint)] mr-1.5">{i + 1}.</span>
                          {c.canal}
                        </span>
                        <span className="text-sm font-semibold text-[var(--color-text)] text-right shrink-0">
                          {formatCOP(c.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="pt-3 border-t border-[var(--color-border)]">
                <p className="text-xs font-medium text-[var(--color-text-soft)] mb-2">Top 3 clientes</p>
                {top3Clientes.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-faint)]">Sin clientes con ventas este mes</p>
                ) : (
                  <div className="space-y-1.5">
                    {top3Clientes.map((c, i) => (
                      <div key={`${c.nombre}-${i}`} className="flex justify-between items-center gap-2">
                        <span className="text-sm text-[var(--color-text)] truncate max-w-[150px]">
                          <span className="text-[var(--color-text-faint)] mr-1.5">{i + 1}.</span>
                          {c.nombre}
                        </span>
                        <span className="text-sm font-semibold text-[var(--color-text)] text-right shrink-0">
                          {formatCOP(c.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-5"
            style={{ background: 'var(--color-surface)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
          >
            <p className="text-xs font-semibold text-[var(--color-text-soft)] uppercase tracking-wide mb-3">⭐ Producto estrella</p>
            {productoTop ? (
              <div>
                <p className="text-sm font-semibold text-[var(--color-text)]">{productoTop.nombre}</p>
                <p className="text-xs text-[var(--color-text-soft)] mt-0.5">{productoTop.cantidad} unidades vendidas este mes</p>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-soft)]">Sin ventas registradas este mes</p>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowVentaModal(true)}
        className="fixed bottom-6 right-6 z-40 btn-primary text-white font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2"
      >
        <span className="text-lg">↗</span>
        Nueva venta
      </button>

      {showVentaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] sticky top-0 bg-white rounded-t-2xl">
              <p className="text-base font-semibold text-[var(--color-primary)]">Nueva venta</p>
              <button type="button" onClick={cerrarModal} className="text-[var(--color-text-soft)] hover:text-[var(--color-text)] transition text-xl">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-soft)] mb-1">Canal</label>
                  <select
                    value={canal}
                    onChange={(e) => setCanal(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                  >
                    <option>WhatsApp</option>
                    <option>Instagram</option>
                    <option>Web</option>
                    <option>Presencial</option>
                    <option>Tienda multimarca</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-soft)] mb-1">Medio de pago</label>
                  <select
                    value={medioId}
                    onChange={(e) => setMedioId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                  >
                    <option value="">Seleccionar medio</option>
                    {mediosPago.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre} {m.comision_porcentaje > 0 ? `(${m.comision_porcentaje}%)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-soft)] mb-1">Fecha</label>
                  <input
                    type="date"
                    value={fechaVenta}
                    onChange={(e) => setFechaVenta(e.target.value)}
                    max={toLocalISODateString()}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--color-text-soft)] mb-1">Cliente (opcional)</label>
                {!showClienteFormModal ? (
                  <div className="flex gap-2">
                    <ProductoSelect
                      className="flex-1"
                      opciones={[
                        { id: '', label: 'Sin cliente' },
                        ...clientesVenta.map((c) => ({
                          id: c.id,
                          label: c.nombre,
                          sublabel: c.telefono ?? undefined,
                        })),
                      ]}
                      value={clienteId}
                      onChange={(id) => setClienteId(id)}
                      placeholder="Buscar cliente..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowClienteFormModal(true)}
                      className="text-xs text-[var(--color-accent)] hover:underline whitespace-nowrap font-medium px-2"
                    >
                      + Nuevo
                    </button>
                  </div>
                ) : (
                  <ClienteInlineForm
                    tiendaId={tienda.id}
                    onCreado={(cliente) => void handleClienteCreado(cliente)}
                    onCancelar={() => setShowClienteFormModal(false)}
                  />
                )}
              </div>

              <div className="max-w-[260px]">
                <label className="block text-xs font-medium text-[var(--color-text-soft)] mb-1">Envío (opcional)</label>
                <input
                  type="number"
                  value={envio === 0 ? '' : envio}
                  onChange={(e) => setEnvio(e.target.value === '' ? 0 : Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                />
              </div>

              <div>
                <p className="text-xs font-medium text-[var(--color-text-soft)] mb-2">Productos</p>
                <div className="space-y-3">
                  {lineas.map((linea, i) => {
                    const brutoLinea = linea.precio_venta * linea.cantidad
                    const descuentoLinea = Math.round(brutoLinea * ((linea.descuento ?? 0) / 100))
                    const netoLinea = brutoLinea - descuentoLinea
                    const variantesLinea = variantesVenta.get(linea.producto_id) ?? []
                    return (
                      <div key={i} className="bg-[var(--color-background)] rounded-xl p-3 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="sm:col-span-1">
                            <label className="block text-xs text-[var(--color-text-soft)] mb-1">Producto</label>
                            <ProductoSelect
                              opciones={productosVenta.map((p) => {
                                const vars = variantesVenta.get(p.id) ?? []
                                const stockVars = vars.reduce((s, v) => s + v.stock_actual, 0)
                                return {
                                  id: p.id,
                                  label: p.nombre,
                                  sublabel:
                                    vars.length > 0
                                      ? `Variantes · ${stockVars} uds · ${formatCOP(p.precio_venta)} base`
                                      : `Stock: ${p.stock_actual} uds · ${formatCOP(p.precio_venta)}`,
                                }
                              })}
                              value={linea.producto_id}
                              onChange={(id) => {
                                const prod = productosVenta.find((p) => p.id === id)
                                const nuevas = [...lineas]
                                nuevas[i] = {
                                  ...nuevas[i],
                                  producto_id: id,
                                  variante_id: undefined,
                                  precio_venta: prod?.precio_venta ?? 0,
                                  precio_original: prod?.precio_venta ?? 0,
                                }
                                setLineas(nuevas)
                              }}
                              placeholder="Buscar producto..."
                            />
                            {variantesLinea.length > 0 && (
                              <select
                                value={linea.variante_id ?? ''}
                                onChange={(e) => {
                                  const variante = variantesLinea.find((v) => v.id === e.target.value)
                                  const nuevas = [...lineas]
                                  nuevas[i] = {
                                    ...nuevas[i],
                                    variante_id: e.target.value || undefined,
                                    precio_venta: variante?.precio_venta ?? nuevas[i].precio_venta,
                                    precio_original: variante?.precio_venta ?? nuevas[i].precio_original,
                                  }
                                  setLineas(nuevas)
                                }}
                                className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm bg-white text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                              >
                                <option value="">Selecciona una variante</option>
                                {variantesLinea.map((v) => (
                                  <option key={v.id} value={v.id}>
                                    {v.nombre} — Stock: {v.stock_actual}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs text-[var(--color-text-soft)] mb-1">Cantidad</label>
                            <input
                              type="number"
                              min={1}
                              value={linea.cantidad === 0 ? '' : linea.cantidad}
                              onChange={(e) => {
                                const val = e.target.value
                                const n = [...lineas]
                                n[i] = { ...n[i], cantidad: val === '' ? 0 : Number(val) }
                                setLineas(n)
                              }}
                              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[var(--color-text-soft)] mb-1">Precio</label>
                            <input
                              type="number"
                              min={0}
                              value={linea.precio_venta === 0 ? '' : linea.precio_venta}
                              onChange={(e) => {
                                const val = e.target.value
                                const n = [...lineas]
                                n[i] = { ...n[i], precio_venta: val === '' ? 0 : Number(val) }
                                setLineas(n)
                              }}
                              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-[var(--color-text-soft)]">Descuento %</label>
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
                              className="w-16 px-2 py-1 rounded-lg border border-[var(--color-border)] text-sm bg-white text-center focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-[var(--color-primary)] font-semibold">
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
                  className="mt-2 text-xs text-[var(--color-accent)] font-medium hover:underline"
                >
                  + Agregar producto
                </button>
              </div>

              {lineas.some((l) => l.producto_id && l.precio_venta > 0) && (
                <div className="bg-[#F9EDE5] rounded-xl p-4 space-y-1">
                  {(() => {
                    const totalBruto = lineas.reduce((s, l) => s + l.precio_venta * l.cantidad, 0)
                    const descuentos = lineas.reduce((s, l) => s + Math.round(l.precio_venta * l.cantidad * ((l.descuento ?? 0) / 100)), 0)
                    const subtotal = totalBruto - descuentos
                    const medioSeleccionado = mediosPago.find((m) => m.id === medioId)
                    const calcComision = medioSeleccionado
                      ? calcularComisionMedioPago(subtotal, envio, medioSeleccionado)
                      : { base_comision: 0, comision_base: 0, iva_comision: 0, comision_total: 0, neto: subtotal + envio }
                    return (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--color-text-soft)]">Subtotal productos</span>
                          <span className="text-[var(--color-text)]">
                            {new Intl.NumberFormat('es-CO', {
                              style: 'currency',
                              currency: 'COP',
                              minimumFractionDigits: 0,
                            }).format(totalBruto)}
                          </span>
                        </div>
                        {envio > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--color-text-soft)]">Envío</span>
                            <span className="text-[#3A7D5A]">
                              + {new Intl.NumberFormat('es-CO', {
                                style: 'currency',
                                currency: 'COP',
                                minimumFractionDigits: 0,
                              }).format(envio)}
                            </span>
                          </div>
                        )}
                        {medioSeleccionado && calcComision.comision_base > 0 && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-[var(--color-text-soft)]">
                                Comisión {medioSeleccionado.nombre} ({medioSeleccionado.comision_porcentaje}%
                                {medioSeleccionado.tarifa_fija > 0
                                  ? ` + ${new Intl.NumberFormat('es-CO', {
                                      style: 'currency',
                                      currency: 'COP',
                                      minimumFractionDigits: 0,
                                    }).format(medioSeleccionado.tarifa_fija)}`
                                  : ''}
                                )
                              </span>
                              <span className="text-[#C44040]">
                                - {new Intl.NumberFormat('es-CO', {
                                  style: 'currency',
                                  currency: 'COP',
                                  minimumFractionDigits: 0,
                                }).format(calcComision.comision_base)}
                              </span>
                            </div>
                            {calcComision.iva_comision > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-[var(--color-text-soft)]">IVA comisión (19%)</span>
                                <span className="text-[#C44040]">
                                  - {new Intl.NumberFormat('es-CO', {
                                    style: 'currency',
                                    currency: 'COP',
                                    minimumFractionDigits: 0,
                                  }).format(calcComision.iva_comision)}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                        <div className="flex justify-between text-sm font-bold">
                          <span className="text-[var(--color-primary)]">Total neto</span>
                          <span className="text-[var(--color-primary)]">
                            {new Intl.NumberFormat('es-CO', {
                              style: 'currency',
                              currency: 'COP',
                              minimumFractionDigits: 0,
                            }).format(calcComision.neto)}
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

            <div className="px-6 py-4 border-t border-[var(--color-border)] flex gap-3 justify-end sticky bottom-0 bg-white rounded-b-2xl">
              <button
                type="button"
                onClick={cerrarModal}
                className="text-sm text-[var(--color-text-soft)] hover:text-[var(--color-text)] px-4 py-2 rounded-lg border border-[var(--color-border)] transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleGuardarVenta()}
                disabled={submittingVenta}
                className="text-sm btn-primary text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
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
