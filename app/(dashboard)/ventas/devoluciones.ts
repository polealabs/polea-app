'use server'

import { revalidatePath } from 'next/cache'
import type { ResolucionDevolucion, TipoDevolucion } from '@/lib/types'
import { getTiendaContext } from '@/lib/tienda-server'

async function getTienda() {
  const { tienda_id, supabase, canEdit } = await getTiendaContext()
  return { tienda_id, supabase, canEdit }
}

export async function registrarDevolucion(payload: {
  venta_id: string
  fecha: string
  tipo: TipoDevolucion
  resolucion: ResolucionDevolucion
  producto_original_id: string
  cantidad: number
  precio_original: number
  producto_cambio_id?: string
  precio_cambio?: number
  motivo?: string
  notas?: string
}) {
  try {
    const { tienda_id, supabase, canEdit } = await getTienda()
    if (!canEdit) return { error: 'No tienes permisos para registrar devoluciones' }

    const diferencia =
      payload.resolucion === 'cambio_otro' && payload.precio_cambio != null
        ? payload.precio_cambio - payload.precio_original
        : 0

    const offset = new Date().getTimezoneOffset() * 60000
    const mes_contable = new Date(Date.now() - offset).toISOString().slice(0, 7)

    const { error } = await supabase.from('devoluciones_venta').insert({
      tienda_id,
      mes_contable,
      diferencia,
      ...payload,
    })
    if (error) return { error: error.message }

    if (payload.tipo === 'defectuoso') {
      // Ajuste atomico: descuenta stock y suma a defectuosas en un solo UPDATE.
      const { error: errStock } = await supabase.rpc('registrar_defectuoso_producto', {
        p_producto_id: payload.producto_original_id,
        p_cantidad: payload.cantidad,
      })
      if (errStock) console.error('Error actualizando stock:', errStock.message)
    }

    if (payload.tipo === 'cambio') {
      // El producto original vuelve al inventario.
      const { error: errStock } = await supabase.rpc('ajustar_stock_producto', {
        p_producto_id: payload.producto_original_id,
        p_delta: payload.cantidad,
      })
      if (errStock) console.error('Error actualizando stock:', errStock.message)

      if (payload.resolucion === 'cambio_otro' && payload.producto_cambio_id) {
        // El producto entregado a cambio sale del inventario.
        const { error: errCambio } = await supabase.rpc('ajustar_stock_producto', {
          p_producto_id: payload.producto_cambio_id,
          p_delta: -payload.cantidad,
        })
        if (errCambio) console.error('Error actualizando stock:', errCambio.message)
      }
    }

    revalidatePath('/ventas')
    revalidatePath('/productos')
    revalidatePath('/dashboard')
    return { ok: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function obtenerDevoluciones(ventaId: string) {
  try {
    const { tienda_id, supabase } = await getTienda()
    const { data, error } = await supabase
      .from('devoluciones_venta')
      .select(
        '*, productos_original:productos!producto_original_id(nombre), productos_cambio:productos!producto_cambio_id(nombre)',
      )
      .eq('venta_id', ventaId)
      .eq('tienda_id', tienda_id)
      .order('created_at', { ascending: false })

    if (error) return { error: error.message }
    return { ok: true as const, devoluciones: data ?? [] }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}
