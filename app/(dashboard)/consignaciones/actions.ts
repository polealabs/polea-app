'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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

// TIENDAS CONSIGNATARIAS
export async function crearConsignataria(formData: FormData) {
  try {
    const { tienda_id, supabase } = await getTienda()
    const nombre = (formData.get('nombre') as string)?.trim()
    if (!nombre) return { error: 'El nombre es obligatorio' }
    const { error } = await supabase.from('tiendas_consignatarias').insert({
      tienda_id,
      nombre,
      contacto: (formData.get('contacto') as string)?.trim() || null,
      telefono: (formData.get('telefono') as string)?.trim() || null,
      ciudad: (formData.get('ciudad') as string)?.trim() || null,
      nit: (formData.get('nit') as string)?.trim() || null,
      porcentaje_comision: Number(formData.get('porcentaje_comision')) || 0,
      activa: true,
    })
    if (error) return { error: error.message }
    revalidatePath('/consignaciones')
    return { ok: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function editarConsignataria(id: string, formData: FormData) {
  try {
    const { tienda_id, supabase } = await getTienda()
    const { error } = await supabase
      .from('tiendas_consignatarias')
      .update({
        nombre: (formData.get('nombre') as string)?.trim(),
        contacto: (formData.get('contacto') as string)?.trim() || null,
        telefono: (formData.get('telefono') as string)?.trim() || null,
        ciudad: (formData.get('ciudad') as string)?.trim() || null,
        nit: (formData.get('nit') as string)?.trim() || null,
        porcentaje_comision: Number(formData.get('porcentaje_comision')) || 0,
      })
      .eq('id', id)
      .eq('tienda_id', tienda_id)
    if (error) return { error: error.message }
    revalidatePath('/consignaciones')
    return { ok: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function eliminarConsignataria(id: string) {
  try {
    const { tienda_id, supabase } = await getTienda()
    await supabase.from('tiendas_consignatarias').delete().eq('id', id).eq('tienda_id', tienda_id)
    revalidatePath('/consignaciones')
    return { ok: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

// CONSIGNACIONES (SALIDAS)
export async function registrarSalida(payload: {
  consignataria_id: string
  producto_id: string
  cantidad: number
  precio_unitario: number
  fecha: string
}) {
  try {
    const { tienda_id, supabase } = await getTienda()
    if (payload.cantidad <= 0) return { error: 'La cantidad debe ser mayor a 0' }

    const { data: producto } = await supabase
      .from('productos')
      .select('stock_actual, nombre')
      .eq('id', payload.producto_id)
      .eq('tienda_id', tienda_id)
      .single()

    if (!producto) return { error: 'Producto no encontrado' }
    if (producto.stock_actual < payload.cantidad) {
      return { error: `Stock insuficiente. Disponible: ${producto.stock_actual} unidades de ${producto.nombre}` }
    }

    const { error } = await supabase.from('consignaciones').insert({
      tienda_id,
      estado: 'activa',
      unidades_disponibles: payload.cantidad,
      ...payload,
    })
    if (error) return { error: error.message }
    revalidatePath('/consignaciones')
    revalidatePath('/productos')
    return { ok: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function registrarMovimiento(payload: {
  consignacion_id: string
  tipo: 'devolucion' | 'liquidacion'
  cantidad: number
  precio_venta?: number
  fecha: string
  notas?: string
}) {
  try {
    const { tienda_id, supabase } = await getTienda()

    const { data: consig } = await supabase
      .from('consignaciones')
      .select('*, tiendas_consignatarias(porcentaje_comision)')
      .eq('id', payload.consignacion_id)
      .eq('tienda_id', tienda_id)
      .single()

    if (!consig) return { error: 'Consignación no encontrada' }
    if (payload.cantidad <= 0) return { error: 'La cantidad debe ser mayor a 0' }
    if (payload.cantidad > (consig.unidades_disponibles ?? 0)) {
      return { error: `Solo hay ${consig.unidades_disponibles} unidades disponibles` }
    }

    const porcentaje = (consig.tiendas_consignatarias as { porcentaje_comision?: number } | null)?.porcentaje_comision ?? 0
    const total_bruto =
      payload.tipo === 'liquidacion' && payload.precio_venta
        ? payload.precio_venta * payload.cantidad
        : null
    const comision = total_bruto ? Math.round(total_bruto * (porcentaje / 100)) : null
    const neto = total_bruto && comision !== null ? total_bruto - comision : null

    const { error: errMov } = await supabase.from('consignacion_movimientos').insert({
      tienda_id,
      consignacion_id: payload.consignacion_id,
      tipo: payload.tipo,
      cantidad: payload.cantidad,
      precio_venta: payload.precio_venta || null,
      total_bruto,
      comision,
      neto,
      fecha: payload.fecha,
      notas: payload.notas || null,
    })

    if (errMov) return { error: errMov.message }

    const nuevasDisponibles = (consig.unidades_disponibles ?? 0) - payload.cantidad
    const nuevoEstado = nuevasDisponibles === 0
      ? (payload.tipo === 'devolucion' ? 'devuelta' : 'liquidada')
      : 'activa'

    await supabase
      .from('consignaciones')
      .update({
        unidades_disponibles: nuevasDisponibles,
        estado: nuevoEstado,
      })
      .eq('id', payload.consignacion_id)
      .eq('tienda_id', tienda_id)

    if (payload.tipo === 'devolucion') {
      const { error: rpcError } = await supabase.rpc('increment_stock', {
        p_producto_id: consig.producto_id,
        p_cantidad: payload.cantidad,
      })

      if (rpcError) {
        const { data } = await supabase
          .from('productos')
          .select('stock_actual')
          .eq('id', consig.producto_id)
          .eq('tienda_id', tienda_id)
          .single()

        if (data) {
          await supabase
            .from('productos')
            .update({
              stock_actual: data.stock_actual + payload.cantidad,
            })
            .eq('id', consig.producto_id)
            .eq('tienda_id', tienda_id)
        }
      }
    }

    revalidatePath('/consignaciones')
    revalidatePath('/productos')
    return { ok: true, neto, comision, total_bruto }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function marcarDevuelta(id: string) {
  try {
    const { tienda_id, supabase } = await getTienda()
    const { error } = await supabase
      .from('consignaciones')
      .update({ estado: 'devuelta' })
      .eq('id', id)
      .eq('tienda_id', tienda_id)
    if (error) return { error: error.message }
    revalidatePath('/consignaciones')
    revalidatePath('/productos')
    return { ok: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

// LIQUIDACIONES
export async function registrarLiquidacion(payload: {
  consignataria_id: string
  mes: string
  total_vendido: number
  consignaciones_ids: string[]
  notas?: string
}) {
  try {
    const { tienda_id, supabase } = await getTienda()

    const { data: consignataria } = await supabase
      .from('tiendas_consignatarias')
      .select('porcentaje_comision')
      .eq('id', payload.consignataria_id)
      .eq('tienda_id', tienda_id)
      .single()

    if (!consignataria) return { error: 'Tienda consignataria no encontrada' }

    const porcentaje = consignataria.porcentaje_comision
    const comision = Math.round(payload.total_vendido * (porcentaje / 100))
    const neto = payload.total_vendido - comision

    const { error } = await supabase.from('liquidaciones').insert({
      tienda_id,
      fecha: new Date().toISOString().split('T')[0],
      porcentaje_comision: porcentaje,
      comision,
      neto,
      consignataria_id: payload.consignataria_id,
      mes: payload.mes,
      total_vendido: payload.total_vendido,
      consignaciones_ids: payload.consignaciones_ids,
      notas: payload.notas ?? null,
    })

    if (error) return { error: error.message }

    if (payload.consignaciones_ids.length > 0) {
      await supabase
        .from('consignaciones')
        .update({ estado: 'liquidada' })
        .in('id', payload.consignaciones_ids)
        .eq('tienda_id', tienda_id)
    }

    revalidatePath('/consignaciones')
    return { ok: true, comision, neto }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}
