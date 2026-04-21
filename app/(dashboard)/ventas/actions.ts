'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { calcularNetoConDescuento } from '@/lib/utils'

async function getTiendaId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data } = await supabase
    .from('tiendas')
    .select('id')
    .eq('owner_id', user.id)
    .single()
  if (!data) throw new Error('Tienda no encontrada')
  return { tienda_id: data.id, supabase }
}

export type LineaVenta = {
  producto_id: string
  cantidad: number
  precio_venta: number
  descuento: number // porcentaje (0-100)
}

export async function crearVentaMulti(payload: {
  cliente_id?: string
  canal: string
  plataforma_pago: string
  fecha: string
  lineas: LineaVenta[]
}) {
  try {
    const { tienda_id, supabase } = await getTiendaId()

    const ids = [...new Set(payload.lineas.map((l) => l.producto_id).filter(Boolean))]
    if (ids.length === 0) return { error: 'Agrega al menos un producto' }

    const { data: prodsStock, error: errStock } = await supabase
      .from('productos')
      .select('id, nombre, stock_actual')
      .eq('tienda_id', tienda_id)
      .in('id', ids)

    if (errStock) return { error: errStock.message }
    if (!prodsStock || prodsStock.length !== ids.length) {
      return { error: 'Uno o más productos no existen o no pertenecen a tu tienda' }
    }

    const byId = new Map(prodsStock.map((p) => [p.id, p]))
    const cantidadPorProducto = new Map<string, number>()
    for (const l of payload.lineas) {
      cantidadPorProducto.set(l.producto_id, (cantidadPorProducto.get(l.producto_id) ?? 0) + l.cantidad)
    }
    for (const [producto_id, cant] of cantidadPorProducto) {
      const p = byId.get(producto_id)
      if (!p) continue
      if (p.stock_actual < cant) {
        return {
          error: `Stock insuficiente para «${p.nombre}»: pides ${cant} uds. y hay ${p.stock_actual} disponibles.`,
        }
      }
    }

    const lineasCalculadas = payload.lineas.map((l) => {
      const { bruto, descuentoTotal, baseNeta, costoTransaccion, neto } = calcularNetoConDescuento(
        l.precio_venta,
        l.cantidad,
        l.descuento ?? 0,
        payload.plataforma_pago
      )
      return {
        ...l,
        descuento: l.descuento ?? 0,
        bruto,
        descuento_total: descuentoTotal,
        base_neta: baseNeta,
        costo_transaccion: costoTransaccion,
        neto,
      }
    })

    const total_bruto = lineasCalculadas.reduce((s, l) => s + l.bruto, 0)
    const total_costo_transaccion = lineasCalculadas.reduce((s, l) => s + l.costo_transaccion, 0)
    const total_neto = lineasCalculadas.reduce((s, l) => s + l.neto, 0)

    const { data: cabecera, error: errCab } = await supabase
      .from('ventas_cabecera')
      .insert({
        tienda_id,
        cliente_id: payload.cliente_id || null,
        canal: payload.canal,
        plataforma_pago: payload.plataforma_pago,
        fecha: payload.fecha,
        total_bruto,
        total_costo_transaccion,
        total_neto,
      })
      .select('id')
      .single()

    if (errCab) return { error: errCab.message }

    const items = lineasCalculadas.map((l) => ({
      cabecera_id: cabecera.id,
      tienda_id,
      producto_id: l.producto_id,
      cantidad: l.cantidad,
      precio_venta: l.precio_venta,
      descuento: l.descuento ?? 0,
      costo_transaccion: l.costo_transaccion,
      neto: l.neto,
    }))

    const { error: errItems } = await supabase.from('venta_items').insert(items)
    if (errItems) return { error: errItems.message }

    revalidatePath('/ventas')
    revalidatePath('/productos')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function eliminarVenta(cabecera_id: string) {
  try {
    const { tienda_id, supabase } = await getTiendaId()
    const { error } = await supabase
      .from('ventas_cabecera')
      .delete()
      .eq('id', cabecera_id)
      .eq('tienda_id', tienda_id)
    if (error) return { error: error.message }
    revalidatePath('/ventas')
    revalidatePath('/productos')
    return { success: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}
