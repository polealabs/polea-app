'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ResolucionDevolucion, TipoDevolucion } from '@/lib/types'

async function getTienda() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data } = await supabase.from('tiendas').select('id').eq('owner_id', user.id).maybeSingle()
  if (!data) throw new Error('Tienda no encontrada')
  return { tienda_id: data.id, supabase }
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
    const { tienda_id, supabase } = await getTienda()

    const diferencia =
      payload.resolucion === 'cambio_otro' && payload.precio_cambio != null
        ? payload.precio_cambio - payload.precio_original
        : 0

    const mes_contable = new Date().toISOString().slice(0, 7)

    const { error } = await supabase.from('devoluciones_venta').insert({
      tienda_id,
      mes_contable,
      diferencia,
      ...payload,
    })
    if (error) return { error: error.message }

    if (payload.tipo === 'defectuoso') {
      const { data: prod } = await supabase
        .from('productos')
        .select('stock_actual, unidades_defectuosas')
        .eq('id', payload.producto_original_id)
        .single()

      if (prod) {
        await supabase
          .from('productos')
          .update({
            stock_actual: Math.max(0, prod.stock_actual - payload.cantidad),
            unidades_defectuosas: (prod.unidades_defectuosas ?? 0) + payload.cantidad,
          })
          .eq('id', payload.producto_original_id)
      }
    }

    if (payload.tipo === 'cambio') {
      const { data: prodOriginal } = await supabase
        .from('productos')
        .select('stock_actual')
        .eq('id', payload.producto_original_id)
        .single()

      if (prodOriginal) {
        await supabase
          .from('productos')
          .update({
            stock_actual: prodOriginal.stock_actual + payload.cantidad,
          })
          .eq('id', payload.producto_original_id)
      }

      if (payload.resolucion === 'cambio_otro' && payload.producto_cambio_id) {
        const { data: prodCambio } = await supabase
          .from('productos')
          .select('stock_actual')
          .eq('id', payload.producto_cambio_id)
          .single()

        if (prodCambio) {
          await supabase
            .from('productos')
            .update({
              stock_actual: Math.max(0, prodCambio.stock_actual - payload.cantidad),
            })
            .eq('id', payload.producto_cambio_id)
        }
      }
    }

    revalidatePath('/ventas')
    revalidatePath('/productos')
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
