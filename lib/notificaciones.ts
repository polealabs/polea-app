import { createClient } from '@/lib/supabase/client'

export interface Notificacion {
  id: string
  tipo: 'stock_bajo' | 'sin_movimiento' | 'cliente_recurrente' | 'ventas_bajas'
  titulo: string
  mensaje: string
  leida: boolean
  metadata?: Record<string, unknown>
  created_at: string
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
      .select('id, nombre, stock_actual, stock_minimo')
      .eq('tienda_id', tiendaId)

    const productosStockBajo = (productos ?? []).filter((p) => p.stock_actual <= p.stock_minimo)
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
    const haceNDias = new Date(hoy.getTime() - prefs.dias_sin_movimiento * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    const { data: todosProductos } = await supabase
      .from('productos')
      .select('id, nombre, stock_actual')
      .eq('tienda_id', tiendaId)
      .gt('stock_actual', 0)

    const { data: ventasRecientes } = await supabase
      .from('venta_items')
      .select('producto_id')
      .eq('tienda_id', tiendaId)
      .gte('created_at', haceNDias)

    const idsConMovimiento = new Set((ventasRecientes ?? []).map((v) => v.producto_id))
    const sinMovimiento = (todosProductos ?? []).filter((p) => !idsConMovimiento.has(p.id))

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
            prefs.dias_sin_movimiento
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
    await supabase
      .from('notificaciones')
      .insert(notificacionesNuevas.map((n) => ({ ...n, tienda_id: tiendaId })))
  }
}

export async function marcarLeida(notificacionId: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('notificaciones').update({ leida: true }).eq('id', notificacionId)
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
