import { createClient } from '@/lib/supabase/client'

export interface Notificacion {
  id: string
  tipo:
    | 'stock_bajo'
    | 'sin_movimiento'
    | 'cliente_recurrente'
    | 'ventas_bajas'
    | 'pagos_pendientes'
    | 'cuotas_pendientes'
  titulo: string
  mensaje: string
  leida: boolean
  metadata?: Record<string, unknown>
  created_at: string
}

function formatCOPNotif(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(n)
}

export async function generarNotificaciones(tiendaId: string): Promise<void> {
  const supabase = createClient()

  const { data: prefs } = await supabase.from('preferencias').select('*').eq('tienda_id', tiendaId).maybeSingle()
  if (!prefs) return

  const notificacionesNuevas: Omit<Notificacion, 'id' | 'created_at'>[] = []
  const hoy = new Date()

  if (prefs.alerta_stock_bajo) {
    const { data: productos } = await supabase
      .from('productos')
      .select('id, nombre, stock_actual, stock_minimo, tiene_variantes')
      .eq('tienda_id', tiendaId)
      .neq('estado', 'archivado')

    const { data: variantes } = await supabase
      .from('producto_variantes')
      .select('producto_id, stock_actual')
      .eq('tienda_id', tiendaId)
      .eq('activa', true)

    const stockPorProducto = new Map<string, number>()
    for (const v of variantes ?? []) {
      stockPorProducto.set(v.producto_id, (stockPorProducto.get(v.producto_id) ?? 0) + v.stock_actual)
    }

    const productosStockBajo = (productos ?? []).filter((p) => {
      const stock = p.tiene_variantes ? (stockPorProducto.get(p.id) ?? 0) : p.stock_actual
      return stock <= p.stock_minimo
    })
    if (productosStockBajo.length > 0) {
      const hace24h = new Date(hoy.getTime() - 24 * 60 * 60 * 1000).toISOString()
      const { data: existe } = await supabase
        .from('notificaciones')
        .select('id')
        .eq('tienda_id', tiendaId)
        .eq('tipo', 'stock_bajo')
        .gte('created_at', hace24h)
        .limit(1)
        .maybeSingle()

      if (!existe) {
        notificacionesNuevas.push({
          tipo: 'stock_bajo',
          titulo: `${productosStockBajo.length} producto${productosStockBajo.length > 1 ? 's' : ''} con stock bajo`,
          mensaje: `${productosStockBajo
            .slice(0, 3)
            .map((p) => p.nombre)
            .join(', ')}${
            productosStockBajo.length > 3 ? ` y ${productosStockBajo.length - 3} más` : ''
          } necesitan reabastecimiento.`,
          leida: false,
          metadata: { productos: productosStockBajo.map((p) => p.id) },
        })
      }
    }
  }

  if (prefs.alerta_sin_movimiento) {
    const diasSinMovimiento =
      typeof prefs.dias_sin_movimiento === 'number' && prefs.dias_sin_movimiento > 0
        ? prefs.dias_sin_movimiento
        : 30
    const haceNDias = new Date(hoy.getTime() - diasSinMovimiento * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    const { data: todosProductosRaw } = await supabase
      .from('productos')
      .select('id, nombre, stock_actual, tiene_variantes')
      .eq('tienda_id', tiendaId)
      .neq('estado', 'archivado')

    const { data: variantesMov } = await supabase
      .from('producto_variantes')
      .select('producto_id, stock_actual')
      .eq('tienda_id', tiendaId)
      .eq('activa', true)

    const stockMovPorProducto = new Map<string, number>()
    for (const v of variantesMov ?? []) {
      stockMovPorProducto.set(v.producto_id, (stockMovPorProducto.get(v.producto_id) ?? 0) + v.stock_actual)
    }

    const todosProductos = (todosProductosRaw ?? []).filter((p) => {
      const stock = p.tiene_variantes ? (stockMovPorProducto.get(p.id) ?? 0) : p.stock_actual
      return stock > 0
    })

    const { data: ventasRecientes } = await supabase
      .from('venta_items')
      .select('producto_id')
      .eq('tienda_id', tiendaId)
      .gte('created_at', haceNDias)

    const idsConMovimiento = new Set((ventasRecientes ?? []).map((v) => v.producto_id))
    const sinMovimiento = todosProductos.filter((p) => !idsConMovimiento.has(p.id))

    if (sinMovimiento.length > 0) {
      const hace24h = new Date(hoy.getTime() - 24 * 60 * 60 * 1000).toISOString()
      const { data: existe } = await supabase
        .from('notificaciones')
        .select('id')
        .eq('tienda_id', tiendaId)
        .eq('tipo', 'sin_movimiento')
        .gte('created_at', hace24h)
        .limit(1)
        .maybeSingle()

      if (!existe) {
        notificacionesNuevas.push({
          tipo: 'sin_movimiento',
          titulo: `${sinMovimiento.length} producto${sinMovimiento.length > 1 ? 's' : ''} sin ventas en ${
            diasSinMovimiento
          } días`,
          mensaje: `${sinMovimiento
            .slice(0, 3)
            .map((p) => p.nombre)
            .join(', ')}${sinMovimiento.length > 3 ? ` y ${sinMovimiento.length - 3} más` : ''} tienen stock pero no se han vendido.`,
          leida: false,
          metadata: { productos: sinMovimiento.map((p) => p.id) },
        })
      }
    }
  }

  if (prefs.alerta_cliente_recurrente) {
    const haceRecurrente = new Date(hoy.getTime() - prefs.dias_cliente_recurrente * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]
    const haceAlerta = new Date(hoy.getTime() - prefs.dias_sin_compra_alerta * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    const { data: clientesRecurrentes } = await supabase
      .from('ventas_cabecera')
      .select('cliente_id')
      .eq('tienda_id', tiendaId)
      .gte('fecha', haceRecurrente)
      .not('cliente_id', 'is', null)

    const conteoClientes = new Map<string, number>()
    ;(clientesRecurrentes ?? []).forEach((v) => {
      if (v.cliente_id) {
        conteoClientes.set(v.cliente_id, (conteoClientes.get(v.cliente_id) ?? 0) + 1)
      }
    })

    const idsRecurrentes = [...conteoClientes.entries()]
      .filter(([, count]) => count >= 2)
      .map(([id]) => id)

    if (idsRecurrentes.length > 0) {
      const { data: comprasRecientes } = await supabase
        .from('ventas_cabecera')
        .select('cliente_id')
        .eq('tienda_id', tiendaId)
        .gte('fecha', haceAlerta)
        .in('cliente_id', idsRecurrentes)

      const idsConCompraReciente = new Set((comprasRecientes ?? []).map((v) => v.cliente_id))
      const clientesSinCompra = idsRecurrentes.filter((id) => !idsConCompraReciente.has(id))

      if (clientesSinCompra.length > 0) {
        const { data: infoClientes } = await supabase
          .from('clientes')
          .select('id, nombre')
          .in('id', clientesSinCompra)

        const hace48h = new Date(hoy.getTime() - 48 * 60 * 60 * 1000).toISOString()
        const { data: existe } = await supabase
          .from('notificaciones')
          .select('id')
          .eq('tienda_id', tiendaId)
          .eq('tipo', 'cliente_recurrente')
          .gte('created_at', hace48h)
          .limit(1)
          .maybeSingle()

        if (!existe) {
          notificacionesNuevas.push({
            tipo: 'cliente_recurrente',
            titulo: `${clientesSinCompra.length} cliente${clientesSinCompra.length > 1 ? 's' : ''} recurrente${
              clientesSinCompra.length > 1 ? 's' : ''
            } sin comprar`,
            mensaje: `${(infoClientes ?? [])
              .slice(0, 3)
              .map((c) => c.nombre)
              .join(', ')}${
              clientesSinCompra.length > 3 ? ` y ${clientesSinCompra.length - 3} más` : ''
            } llevan más de ${prefs.dias_sin_compra_alerta} días sin visitar. ¡Es un buen momento para contactarlos!`,
            leida: false,
            metadata: { clientes: clientesSinCompra },
          })
        }
      }
    }
  }

  {
    const hoyStr = hoy.toISOString().split('T')[0]
    const en7dias = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000)
    const en7diasStr = en7dias.toISOString().split('T')[0]

    const { data: cuentasPendientes, error: errCuentas } = await supabase
      .from('cuentas_por_pagar')
      .select('id, descripcion, monto_total, monto_pagado, fecha_vencimiento')
      .eq('tienda_id', tiendaId)
      .in('estado', ['pendiente', 'parcial'])
      .gte('fecha_vencimiento', hoyStr)
      .lte('fecha_vencimiento', en7diasStr)
      .order('fecha_vencimiento')

    if (!errCuentas && cuentasPendientes && cuentasPendientes.length > 0) {
      const totalPendiente = cuentasPendientes.reduce(
        (s, c) => s + (Number(c.monto_total) - Number(c.monto_pagado)),
        0,
      )
      const hace24h = new Date(hoy.getTime() - 24 * 60 * 60 * 1000).toISOString()
      const { data: existePagos } = await supabase
        .from('notificaciones')
        .select('id')
        .eq('tienda_id', tiendaId)
        .eq('tipo', 'pagos_pendientes')
        .gte('created_at', hace24h)
        .limit(1)
        .maybeSingle()

      if (!existePagos) {
        notificacionesNuevas.push({
          tipo: 'pagos_pendientes',
          titulo: 'Pagos de inventario próximos a vencer',
          mensaje: `${cuentasPendientes.length} pago(s) pendiente(s) por ${formatCOPNotif(totalPendiente)} en los próximos 7 días.`,
          leida: false,
          metadata: { cuenta_ids: cuentasPendientes.map((c) => c.id) },
        })
      }
    }

    const { data: cuotasPendientes, error: errCuotasP } = await supabase
      .from('cuotas_pago')
      .select('id, monto, fecha_vencimiento, cuentas_por_pagar(descripcion)')
      .eq('tienda_id', tiendaId)
      .eq('estado', 'pendiente')
      .gte('fecha_vencimiento', hoyStr)
      .lte('fecha_vencimiento', en7diasStr)
      .order('fecha_vencimiento')

    if (!errCuotasP && cuotasPendientes && cuotasPendientes.length > 0) {
      const hace24hC = new Date(hoy.getTime() - 24 * 60 * 60 * 1000).toISOString()
      const { data: existeCuotas } = await supabase
        .from('notificaciones')
        .select('id')
        .eq('tienda_id', tiendaId)
        .eq('tipo', 'cuotas_pendientes')
        .gte('created_at', hace24hC)
        .limit(1)
        .maybeSingle()

      if (!existeCuotas) {
        notificacionesNuevas.push({
          tipo: 'cuotas_pendientes',
          titulo: 'Cuotas de compras por vencer',
          mensaje: `${cuotasPendientes.length} cuota(s) vencen en los próximos 7 días.`,
          leida: false,
          metadata: { cuota_ids: cuotasPendientes.map((c) => c.id) },
        })
      }
    }
  }

  if (prefs.alerta_ventas_bajas) {
    const inicioMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0]
    const inicioMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1).toISOString().split('T')[0]
    const finMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0).toISOString().split('T')[0]

    const [{ data: ventasMesActual }, { data: ventasMesAnterior }] = await Promise.all([
      supabase.from('ventas_cabecera').select('total_neto').eq('tienda_id', tiendaId).gte('fecha', inicioMesActual),
      supabase
        .from('ventas_cabecera')
        .select('total_neto')
        .eq('tienda_id', tiendaId)
        .gte('fecha', inicioMesAnterior)
        .lte('fecha', finMesAnterior),
    ])

    const totalActual = (ventasMesActual ?? []).reduce((s, v) => s + v.total_neto, 0)
    const totalAnterior = (ventasMesAnterior ?? []).reduce((s, v) => s + v.total_neto, 0)

    if (totalAnterior > 0) {
      const porcentaje = (totalActual / totalAnterior) * 100
      if (porcentaje < prefs.porcentaje_alerta_ventas && hoy.getDate() >= 7) {
        const hace72h = new Date(hoy.getTime() - 72 * 60 * 60 * 1000).toISOString()
        const { data: existe } = await supabase
          .from('notificaciones')
          .select('id')
          .eq('tienda_id', tiendaId)
          .eq('tipo', 'ventas_bajas')
          .gte('created_at', hace72h)
          .limit(1)
          .maybeSingle()

        if (!existe) {
          notificacionesNuevas.push({
            tipo: 'ventas_bajas',
            titulo: 'Ventas por debajo del mes anterior',
            mensaje: `Este mes llevas ${Math.round(
              porcentaje,
            )}% de las ventas del mes pasado. Considera activar promociones o contactar clientes frecuentes.`,
            leida: false,
            metadata: { porcentaje: Math.round(porcentaje) },
          })
        }
      }
    }
  }

  if (notificacionesNuevas.length > 0) {
    const { error: errInsert } = await supabase
      .from('notificaciones')
      .insert(notificacionesNuevas.map((n) => ({ ...n, tienda_id: tiendaId })))
    if (errInsert) {
      console.error('Error insertando notificaciones:', errInsert.message)
    }
  }
}

export async function marcarLeida(notificacionId: string, tiendaId: string): Promise<void> {
  const supabase = createClient()
  await supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('id', notificacionId)
    .eq('tienda_id', tiendaId)
}

export async function marcarTodasLeidas(tiendaId: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('notificaciones').update({ leida: true }).eq('tienda_id', tiendaId).eq('leida', false)
}

export async function obtenerNotificaciones(tiendaId: string): Promise<Notificacion[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('notificaciones')
    .select('*')
    .eq('tienda_id', tiendaId)
    .order('created_at', { ascending: false })
    .limit(20)
  return (data ?? []) as Notificacion[]
}
