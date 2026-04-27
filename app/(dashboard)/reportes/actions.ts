'use server'

import { createClient } from '@/lib/supabase/server'

export interface DatosReporte {
  mes: string
  ventasBrutas: number
  totalDescuentos: number
  ventasNetas: number
  cpvMes: number
  totalComprasMes: number
  totalUnidadesVendidas: number
  totalComisionesPlataforma: number
  utilidadBruta: number
  margenBruto: number
  gastosPorCategoria: Record<string, number>
  totalGastos: number
  utilidadOperacional: number
  utilidadNeta: number
  margenNeto: number
  ticketPromedio: number
  totalTransacciones: number
  unidadesVendidas: number
  productoMasVendido: { nombre: string; cantidad: number } | null
  clienteQueMasCompro: { nombre: string; total: number } | null
  top3Productos: { nombre: string; total: number; unidades: number }[]
  top3Clientes: { nombre: string; total: number }[]
  ventasNetasMesAnterior: number
  variacionVentas: number | null
}

type VentaCabeceraRow = {
  id: string
  total_bruto: number
  total_neto: number
  total_costo_transaccion: number
  cliente_id: string | null
  fecha: string
}

type VentaItemRow = {
  producto_id: string
  cantidad: number
  precio_venta: number
  descuento: number
  neto: number
  productos?: { nombre?: string } | { nombre?: string }[] | null
}

type ItemVendidoRow = {
  producto_id: string
  cantidad: number
  ventas_cabecera?: { fecha: string; tienda_id: string } | { fecha: string; tienda_id: string }[] | null
}

type GastoRow = {
  categoria: string
  monto: number
}

type EntradaRow = {
  producto_id: string
  cantidad: number
  costo_unitario: number
  fecha?: string
  productos?: { nombre?: string; tipo?: string } | { nombre?: string; tipo?: string }[] | null
}

function calcularCPV(itemsVendidos: ItemVendidoRow[], entradasCosto: EntradaRow[]): number {
  let cpv = 0
  for (const item of itemsVendidos ?? []) {
    const ventaRaw = item.ventas_cabecera
    const fechaVenta = Array.isArray(ventaRaw) ? ventaRaw[0]?.fecha : ventaRaw?.fecha
    const entrada = (entradasCosto ?? []).find((e) => {
      if (e.producto_id !== item.producto_id) return false
      if (!fechaVenta || !e.fecha) return true
      return e.fecha <= fechaVenta
    })
    if (entrada?.costo_unitario) {
      cpv += item.cantidad * entrada.costo_unitario
    }
  }
  return cpv
}

export async function obtenerDatosReporte(mes: string): Promise<DatosReporte | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: tienda } = await supabase.from('tiendas').select('id').eq('owner_id', user.id).single()
  if (!tienda) return null

  const start = `${mes}-01`
  const [year, month] = mes.split('-').map(Number)
  const nextMonth = new Date(year, month, 1)
  const end = nextMonth.toISOString().split('T')[0]

  const prevMonth = new Date(year, month - 2, 1)
  const prevMonthStr = prevMonth.toISOString().slice(0, 7)
  const prevStart = `${prevMonthStr}-01`
  const prevEnd = new Date(year, month - 1, 1).toISOString().split('T')[0]

  const [
    { data: ventas },
    { data: items },
    { data: gastos },
    { data: entradas },
    { data: ventasAnt },
    { data: itemsVendidos },
    { data: entradasCosto },
  ] =
    await Promise.all([
      supabase
        .from('ventas_cabecera')
        .select('id, total_bruto, total_neto, total_costo_transaccion, cliente_id, fecha')
        .eq('tienda_id', tienda.id)
        .gte('fecha', start)
        .lt('fecha', end),
      supabase
        .from('venta_items')
        .select('producto_id, cantidad, precio_venta, descuento, neto, productos(nombre)')
        .eq('tienda_id', tienda.id)
        .gte('created_at', `${start}T00:00:00`)
        .lt('created_at', `${end}T00:00:00`),
      supabase.from('gastos').select('categoria, monto').eq('tienda_id', tienda.id).gte('fecha', start).lt('fecha', end),
      supabase
        .from('entradas')
        .select('producto_id, cantidad, costo_unitario, fecha')
        .eq('tienda_id', tienda.id)
        .gte('fecha', start)
        .lt('fecha', end),
      supabase
        .from('ventas_cabecera')
        .select('total_neto')
        .eq('tienda_id', tienda.id)
        .gte('fecha', prevStart)
        .lt('fecha', prevEnd),
      supabase
        .from('venta_items')
        .select('producto_id, cantidad, ventas_cabecera!inner(fecha, tienda_id)')
        .eq('ventas_cabecera.tienda_id', tienda.id)
        .gte('ventas_cabecera.fecha', start)
        .lt('ventas_cabecera.fecha', end),
      supabase
        .from('entradas')
        .select('producto_id, costo_unitario, fecha, productos!inner(nombre, tipo)')
        .eq('tienda_id', tienda.id)
        .eq('productos.tipo', 'Producto terminado')
        .order('fecha', { ascending: false }),
    ])

  const ventasRows = (ventas ?? []) as VentaCabeceraRow[]
  const itemsRows = (items ?? []) as VentaItemRow[]
  const gastosRows = (gastos ?? []) as GastoRow[]
  const entradasRows = (entradas ?? []) as EntradaRow[]
  const itemsVendidosRows = (itemsVendidos ?? []) as ItemVendidoRow[]
  const entradasCostoRows = (entradasCosto ?? []) as EntradaRow[]
  const ventasAntRows = (ventasAnt ?? []) as { total_neto: number }[]

  const ventasBrutas = ventasRows.reduce((s, v) => s + v.total_bruto, 0)
  const ventasNetas = ventasRows.reduce((s, v) => s + v.total_neto, 0)
  const totalDescuentos = itemsRows.reduce((s, i) => s + i.precio_venta * i.cantidad * ((i.descuento ?? 0) / 100), 0)
  const costoTransacciones = ventasRows.reduce((s, v) => s + v.total_costo_transaccion, 0)
  const totalComisionesPlataforma = costoTransacciones

  const totalComprasMes = entradasRows.reduce((s, e) => s + e.cantidad * e.costo_unitario, 0)
  const cpvMes = calcularCPV(itemsVendidosRows, entradasCostoRows)
  const totalUnidadesVendidas = itemsVendidosRows.reduce((s, i) => s + (i.cantidad ?? 0), 0)
  const utilidadBruta = ventasNetas - cpvMes
  const margenBruto = ventasNetas > 0 ? (utilidadBruta / ventasNetas) * 100 : 0

  const gastosPorCategoria: Record<string, number> = {}
  gastosRows.forEach((g) => {
    gastosPorCategoria[g.categoria] = (gastosPorCategoria[g.categoria] ?? 0) + g.monto
  })
  const totalGastos = Object.values(gastosPorCategoria).reduce((s, v) => s + v, 0)

  const utilidadOperacional = utilidadBruta - totalGastos
  const utilidadNeta = utilidadOperacional
  const margenNeto = ventasNetas > 0 ? (utilidadNeta / ventasNetas) * 100 : 0

  const totalTransacciones = ventasRows.length
  const ticketPromedio = totalTransacciones > 0 ? ventasNetas / totalTransacciones : 0
  const unidadesVendidas = itemsRows.reduce((s, i) => s + i.cantidad, 0)

  const conteoProductos = new Map<string, { nombre: string; cantidad: number }>()
  const ventasPorProducto = new Map<string, { nombre: string; total: number; unidades: number }>()
  itemsRows.forEach((i) => {
    const producto = Array.isArray(i.productos) ? i.productos[0] : i.productos
    const nombre = producto?.nombre ?? 'Desconocido'
    const prev = conteoProductos.get(i.producto_id) ?? { nombre, cantidad: 0 }
    conteoProductos.set(i.producto_id, { nombre, cantidad: prev.cantidad + i.cantidad })
    const prevVenta = ventasPorProducto.get(i.producto_id) ?? { nombre, total: 0, unidades: 0 }
    ventasPorProducto.set(i.producto_id, {
      nombre,
      total: prevVenta.total + i.neto,
      unidades: prevVenta.unidades + i.cantidad,
    })
  })
  const productoMasVendido =
    conteoProductos.size > 0 ? [...conteoProductos.values()].sort((a, b) => b.cantidad - a.cantidad)[0] : null
  const top3Productos = [...ventasPorProducto.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)

  const conteoClientes = new Map<string, number>()
  ventasRows.forEach((v) => {
    if (v.cliente_id) {
      conteoClientes.set(v.cliente_id, (conteoClientes.get(v.cliente_id) ?? 0) + v.total_neto)
    }
  })

  let clienteQueMasCompro: { nombre: string; total: number } | null = null
  let top3Clientes: { nombre: string; total: number }[] = []
  if (conteoClientes.size > 0) {
    const clientesIds = [...conteoClientes.keys()]
    const { data: clientesData } = await supabase.from('clientes').select('id, nombre').in('id', clientesIds)
    const nombres = new Map((clientesData ?? []).map((c) => [c.id, c.nombre]))
    const rankingClientes = [...conteoClientes.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, total]) => ({ nombre: nombres.get(id) ?? 'Sin nombre', total }))

    top3Clientes = rankingClientes.slice(0, 3)
    clienteQueMasCompro = rankingClientes[0] ?? null
  }

  const ventasNetasMesAnterior = ventasAntRows.reduce((s, v) => s + v.total_neto, 0)
  const variacionVentas =
    ventasNetasMesAnterior > 0 ? ((ventasNetas - ventasNetasMesAnterior) / ventasNetasMesAnterior) * 100 : null

  return {
    mes,
    ventasBrutas,
    totalDescuentos,
    ventasNetas,
    cpvMes,
    totalComprasMes,
    totalUnidadesVendidas,
    totalComisionesPlataforma,
    utilidadBruta,
    margenBruto,
    gastosPorCategoria,
    totalGastos,
    utilidadOperacional,
    utilidadNeta,
    margenNeto,
    ticketPromedio,
    totalTransacciones,
    unidadesVendidas,
    productoMasVendido,
    clienteQueMasCompro,
    top3Productos,
    top3Clientes,
    ventasNetasMesAnterior,
    variacionVentas,
  }
}
