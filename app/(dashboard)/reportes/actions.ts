'use server'

import { createClient } from '@/lib/supabase/server'
import { requireFinanzas } from '@/lib/tienda-server'

export interface GastosPorTipoReporte {
  variable: { total: number; items: { subcategoria: string; monto: number }[] }
  fijo: { total: number; items: { subcategoria: string; monto: number }[] }
  financiero: { total: number; items: { subcategoria: string; monto: number }[] }
  sin_clasificar: { total: number; items: { categoria: string; monto: number }[] }
}

export interface DatosReporte {
  mes: string
  ventasBrutas: number
  totalDescuentos: number
  totalDevoluciones: number
  ventasNetas: number
  cpvMes: number
  totalComprasMes: number
  totalComprasInventario: number
  saldoInicial: number
  saldoFinal: number
  totalUnidadesVendidas: number
  totalComisionesPlataforma: number
  utilidadBruta: number
  margenBruto: number
  gastosPorCategoria: Record<string, number>
  totalGastos: number
  gastosVariables: number
  gastosFijos: number
  gastosFinancieros: number
  gastosPorTipo: GastosPorTipoReporte
  utilidadDespuesVariables: number
  utilidadOperacional: number
  utilidadNeta: number
  margenNeto: number
  ticketPromedio: number
  totalTransacciones: number
  unidadesVendidas: number
  productoMasVendido: { nombre: string; cantidad: number } | null
  clienteQueMasCompro: { nombre: string; total: number } | null
  top3Productos: { nombre: string; total: number; unidades: number; margen?: number }[]
  top3Clientes: { nombre: string; total: number }[]
  ventasNetasMesAnterior: number
  variacionVentas: number | null
  ventasTiendasAliadas: { consignataria_id: string; nombre: string; totalVendido: number; comision: number; neto: number }[]
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
  variante_id?: string | null
  productos?: { nombre?: string } | { nombre?: string }[] | null
}

type ItemVendidoRow = {
  producto_id: string
  cantidad: number
  ventas_cabecera?: { fecha: string; tienda_id: string } | { fecha: string; tienda_id: string }[] | null
}

type GastoRow = {
  categoria: string | null
  tipo_gasto: string | null
  subcategoria: string | null
  monto: number
}

type DevolucionRow = {
  precio_original: number
  cantidad: number
  resolucion: string | null
}

function agregarSubcategoria(
  bucket: { total: number; items: { subcategoria: string; monto: number }[] },
  label: string,
  monto: number,
) {
  const existing = bucket.items.find((i) => i.subcategoria === label)
  if (existing) existing.monto += monto
  else bucket.items.push({ subcategoria: label, monto })
  bucket.total += monto
}

function esTipoGastoClave(t: string | null): t is 'variable' | 'fijo' | 'financiero' {
  return t === 'variable' || t === 'fijo' || t === 'financiero'
}

type EntradaRow = {
  producto_id: string
  cantidad: number
  costo_unitario: number
  fecha?: string
  created_at?: string
  productos?: { nombre?: string; tipo?: string } | { nombre?: string; tipo?: string }[] | null
}

function calcularCPV(
  itemsVendidos: ItemVendidoRow[],
  entradasCosto: EntradaRow[],
  costoPorProducto: Map<string, number>,
): number {
  let cpv = 0
  for (const item of itemsVendidos ?? []) {
    const costoProducto = costoPorProducto.get(item.producto_id)
    if (costoProducto && costoProducto > 0) {
      cpv += item.cantidad * costoProducto
      continue
    }

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

async function calcularSaldoFinalMes(
  tienda_id: string,
  mes: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<number> {
  const [year, month] = mes.split('-').map(Number)
  const inicio = `${mes}-01`
  const fin = new Date(year, month, 1).toISOString().split('T')[0]

  const [{ data: ventas }, { data: entradas }, { data: gastos }, { data: devoluciones }] =
    await Promise.all([
      supabase
        .from('ventas_cabecera')
        .select('total_neto')
        .eq('tienda_id', tienda_id)
        .gte('fecha', inicio)
        .lt('fecha', fin),
      supabase
        .from('entradas')
        .select('cantidad, costo_unitario')
        .eq('tienda_id', tienda_id)
        .gte('fecha', inicio)
        .lt('fecha', fin),
      supabase
        .from('gastos')
        .select('monto, tipo_gasto')
        .eq('tienda_id', tienda_id)
        .gte('fecha', inicio)
        .lt('fecha', fin),
      supabase
        .from('devoluciones_venta')
        .select('precio_original, cantidad, resolucion')
        .eq('tienda_id', tienda_id)
        .eq('mes_contable', mes),
    ])

  const ventasNetas = (ventas ?? []).reduce((s, v) => s + (v.total_neto ?? 0), 0)
  const comprasEntradas = (entradas ?? []).reduce((s, e) => s + e.cantidad * e.costo_unitario, 0)
  const totalGastos = (gastos ?? []).reduce((s, g) => s + (g.monto ?? 0), 0)
  const devs = ((devoluciones ?? []) as DevolucionRow[]).reduce((s, d) => {
    if (d.resolucion === 'reembolso' || d.resolucion === 'credito') {
      return s + d.precio_original * d.cantidad
    }
    return s
  }, 0)

  return ventasNetas - comprasEntradas - totalGastos - devs
}

export async function obtenerDatosReporte(mes: string): Promise<DatosReporte | null> {
  let ctx
  try {
    ctx = await requireFinanzas()
  } catch {
    return null
  }
  const { tienda_id, supabase } = ctx
  const tienda = { id: tienda_id }

  const start = `${mes}-01`
  const [year, month] = mes.split('-').map(Number)
  const nextMonth = new Date(year, month, 1)
  const end = nextMonth.toISOString().split('T')[0]

  const prevMonth = new Date(year, month - 2, 1)
  const prevMonthStr = prevMonth.toISOString().slice(0, 7)
  const prevStart = `${prevMonthStr}-01`
  const prevEnd = new Date(year, month - 1, 1).toISOString().split('T')[0]

  const { data: ventas } = await supabase
    .from('ventas_cabecera')
    .select('id, total_bruto, total_neto, total_costo_transaccion, cliente_id, fecha')
    .eq('tienda_id', tienda.id)
    .gte('fecha', start)
    .lt('fecha', end)

  const ventaIds = (ventas ?? []).map((v) => v.id)
  let items: VentaItemRow[] = []
  if (ventaIds.length > 0) {
    const { data: itemsData } = await supabase
      .from('venta_items')
      .select('producto_id, cantidad, precio_venta, descuento, neto, variante_id, productos(nombre)')
      .eq('tienda_id', tienda.id)
      .in('cabecera_id', ventaIds)
    items = (itemsData ?? []) as VentaItemRow[]
  }

  const [
    { data: gastos },
    { data: entradas },
    { data: ventasAnt },
    { data: itemsVendidos },
    { data: entradasCosto },
    { data: devolucionesData },
  ] = await Promise.all([
      supabase
        .from('gastos')
        .select('categoria, tipo_gasto, subcategoria, monto')
        .eq('tienda_id', tienda.id)
        .gte('fecha', start)
        .lt('fecha', end),
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
        .select('producto_id, cantidad, ventas_cabecera!inner(fecha)')
        .eq('tienda_id', tienda.id)
        .gte('ventas_cabecera.fecha', start)
        .lt('ventas_cabecera.fecha', end),
      supabase
        .from('entradas')
        .select('producto_id, costo_unitario, fecha, created_at, productos!inner(nombre, tipo)')
        .eq('tienda_id', tienda.id)
        .eq('productos.tipo', 'Producto terminado')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('devoluciones_venta')
        .select('precio_original, cantidad, tipo, resolucion, mes_contable')
        .eq('tienda_id', tienda.id)
        .eq('mes_contable', mes),
    ])

  const ventasRows = (ventas ?? []) as VentaCabeceraRow[]
  const itemsRows = (items ?? []) as VentaItemRow[]
  const gastosRows = (gastos ?? []) as GastoRow[]
  const entradasRows = (entradas ?? []) as EntradaRow[]
  const itemsVendidosRows = (itemsVendidos ?? []) as ItemVendidoRow[]
  const entradasCostoRows = (entradasCosto ?? []) as EntradaRow[]
  const ventasAntRows = (ventasAnt ?? []) as { total_neto: number }[]
  const devolucionesRows = (devolucionesData ?? []) as DevolucionRow[]

  const { data: productosConCosto } = await supabase
    .from('productos')
    .select('id, costo_produccion')
    .eq('tienda_id', tienda.id)
    .not('costo_produccion', 'is', null)
    .gt('costo_produccion', 0)

  const costoPorProducto = new Map(
    (productosConCosto ?? []).map((p) => [p.id, p.costo_produccion as number]),
  )

  const ventasBrutas = ventasRows.reduce((s, v) => s + v.total_bruto, 0)
  const totalDescuentos = itemsRows.reduce((s, i) => s + i.precio_venta * i.cantidad * ((i.descuento ?? 0) / 100), 0)
  const costoTransacciones = ventasRows.reduce((s, v) => s + v.total_costo_transaccion, 0)
  const totalComisionesPlataforma = costoTransacciones
  const totalDevoluciones = devolucionesRows.reduce((s, d) => {
    if (d.resolucion === 'reembolso' || d.resolucion === 'credito') {
      return s + d.precio_original * d.cantidad
    }
    return s
  }, 0)
  const ventasNetasAntesComision = ventasBrutas - totalDescuentos - totalDevoluciones
  const ventasNetas = ventasNetasAntesComision - totalComisionesPlataforma

  const totalComprasMes = entradasRows.reduce((s, e) => s + e.cantidad * e.costo_unitario, 0)
  const cpvMes = calcularCPV(itemsVendidosRows, entradasCostoRows, costoPorProducto)
  const totalUnidadesVendidas = itemsVendidosRows.reduce((s, i) => s + (i.cantidad ?? 0), 0)
  const utilidadBruta = ventasNetas - cpvMes
  const margenBruto = ventasNetas > 0 ? (utilidadBruta / ventasNetas) * 100 : 0

  const gastosPorCategoria: Record<string, number> = {}
  const gastosPorTipo: GastosPorTipoReporte = {
    variable: { total: 0, items: [] },
    fijo: { total: 0, items: [] },
    financiero: { total: 0, items: [] },
    sin_clasificar: { total: 0, items: [] },
  }
  let totalComprasInventario = 0

  gastosRows.forEach((g) => {
    const monto = Number(g.monto) || 0
    const label = g.subcategoria?.trim() || g.categoria?.trim() || 'Sin categoría'
    const tipo = g.tipo_gasto

    // compra_inventario no participa en P&L, solo en flujo de caja.
    if (tipo === 'compra_inventario') {
      totalComprasInventario += monto
      return
    }

    if (esTipoGastoClave(tipo)) {
      const cat = g.categoria?.trim() || 'Sin categoría'
      gastosPorCategoria[cat] = (gastosPorCategoria[cat] ?? 0) + monto
      agregarSubcategoria(gastosPorTipo[tipo], label, monto)
    } else {
      const cat = g.categoria?.trim() || 'Sin categoría'
      gastosPorCategoria[cat] = (gastosPorCategoria[cat] ?? 0) + monto
      const existing = gastosPorTipo.sin_clasificar.items.find((i) => i.categoria === label)
      if (existing) existing.monto += monto
      else gastosPorTipo.sin_clasificar.items.push({ categoria: label, monto })
      gastosPorTipo.sin_clasificar.total += monto
    }
  })

  const gastosVariables = gastosPorTipo.variable.total
  const gastosFijos = gastosPorTipo.fijo.total
  const gastosFinancieros = gastosPorTipo.financiero.total
  const totalGastos =
    gastosVariables + gastosFijos + gastosFinancieros + gastosPorTipo.sin_clasificar.total
  const flujoNeto = ventasNetas - totalComprasMes - totalComprasInventario - totalGastos

  const [prevYearSaldo, prevMonthSaldo] = (() => {
    const [y, m] = mes.split('-').map(Number)
    if (m === 1) return [y - 1, 12]
    return [y, m - 1]
  })()
  const mesPrevio = `${prevYearSaldo}-${String(prevMonthSaldo).padStart(2, '0')}`

  const { data: ventasPrevCheck } = await supabase
    .from('ventas_cabecera')
    .select('id')
    .eq('tienda_id', tienda.id)
    .gte('fecha', `${mesPrevio}-01`)
    .lt('fecha', `${mes}-01`)
    .limit(1)

  const saldoInicial =
    ventasPrevCheck && ventasPrevCheck.length > 0
      ? await calcularSaldoFinalMes(tienda.id, mesPrevio, supabase)
      : 0
  const saldoFinal = saldoInicial + flujoNeto

  const utilidadDespuesVariables = utilidadBruta - gastosVariables
  const utilidadOperacional =
    utilidadDespuesVariables - gastosFijos - gastosPorTipo.sin_clasificar.total
  const utilidadAntesImpuestos = utilidadOperacional - gastosFinancieros
  const utilidadNeta = utilidadAntesImpuestos
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
  const top3Productos = [...ventasPorProducto.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 3)
    .map(([productoId, info]) => {
      const costoProducto = costoPorProducto.get(productoId)
      const precioPromedio = info.unidades > 0 ? info.total / info.unidades : 0
      const margen =
        costoProducto && precioPromedio > 0
          ? ((precioPromedio - costoProducto) / precioPromedio) * 100
          : undefined
      return { ...info, margen }
    })

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

  // Ventas de tiendas aliadas (consignación) del mes: liquidaciones por remisión
  // (consignacion_movimientos) + liquidaciones masivas (liquidaciones). No están
  // en ventasNetas (son un flujo aparte), por eso se reportan por separado.
  const [{ data: movsLiq }, { data: liqsMasivas }, { data: consignatariasData }] = await Promise.all([
    supabase
      .from('consignacion_movimientos')
      .select('consignataria_id, total_bruto, comision, neto')
      .eq('tienda_id', tienda.id)
      .eq('tipo', 'liquidacion')
      .gte('fecha', start)
      .lt('fecha', end),
    supabase
      .from('liquidaciones')
      .select('consignataria_id, total_vendido, comision, neto')
      .eq('tienda_id', tienda.id)
      .gte('fecha', start)
      .lt('fecha', end),
    supabase.from('tiendas_consignatarias').select('id, nombre').eq('tienda_id', tienda.id),
  ])

  const nombresConsig = new Map((consignatariasData ?? []).map((c) => [c.id as string, c.nombre as string]))
  const aliadasMap = new Map<string, { totalVendido: number; comision: number; neto: number }>()
  const acumularAliada = (id: string | null, vendido: number, comision: number, neto: number) => {
    if (!id) return
    const prev = aliadasMap.get(id) ?? { totalVendido: 0, comision: 0, neto: 0 }
    aliadasMap.set(id, {
      totalVendido: prev.totalVendido + (Number(vendido) || 0),
      comision: prev.comision + (Number(comision) || 0),
      neto: prev.neto + (Number(neto) || 0),
    })
  }
  ;(movsLiq ?? []).forEach((m) => acumularAliada(m.consignataria_id, m.total_bruto, m.comision, m.neto))
  ;(liqsMasivas ?? []).forEach((l) => acumularAliada(l.consignataria_id, l.total_vendido, l.comision, l.neto))

  const ventasTiendasAliadas = [...aliadasMap.entries()]
    .map(([consignataria_id, v]) => ({
      consignataria_id,
      nombre: nombresConsig.get(consignataria_id) ?? 'Sin nombre',
      ...v,
    }))
    .sort((a, b) => b.totalVendido - a.totalVendido)

  return {
    mes,
    ventasBrutas,
    totalDescuentos,
    totalDevoluciones,
    ventasNetas,
    cpvMes,
    totalComprasMes,
    totalComprasInventario,
    saldoInicial,
    saldoFinal,
    totalUnidadesVendidas,
    totalComisionesPlataforma,
    utilidadBruta,
    margenBruto,
    gastosPorCategoria,
    totalGastos,
    gastosVariables,
    gastosFijos,
    gastosFinancieros,
    gastosPorTipo,
    utilidadDespuesVariables,
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
    ventasTiendasAliadas,
  }
}
