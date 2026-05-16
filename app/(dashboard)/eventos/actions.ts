'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { calcularComisionMedioPago } from '@/lib/utils'
import type { TipoMedioPago } from '@/lib/types'

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

type EventoVentaRow = {
  id: string
  producto_id: string
  cantidad: number
  precio_venta: number
  medio_pago: string | null
}

function mapEventoMedioATipo(medioKey: string): TipoMedioPago | null {
  const k = medioKey.toLowerCase()
  if (k === 'efectivo') return 'efectivo'
  if (k === 'transferencia') return 'transferencia'
  if (k === 'nequi' || k === 'nequi / daviplata') return 'nequi_daviplata'
  if (k === 'datafono' || k === 'datáfono') return 'datafono'
  return null
}

export async function crearEvento(formData: FormData) {
  try {
    const { tienda_id, supabase } = await getTienda()
    const nombre = (formData.get('nombre') as string)?.trim()
    if (!nombre) return { error: 'El nombre es obligatorio' }
    const fecha_fin_raw = (formData.get('fecha_fin') as string)?.trim()
    const { data, error } = await supabase
      .from('eventos')
      .insert({
        tienda_id,
        nombre,
        lugar: (formData.get('lugar') as string)?.trim() || null,
        fecha_inicio: formData.get('fecha_inicio') as string,
        fecha_fin: fecha_fin_raw || null,
        tipo: formData.get('tipo') as string,
        notas: (formData.get('notas') as string)?.trim() || null,
        estado: 'activo',
      })
      .select('id')
      .single()
    if (error) return { error: error.message }
    revalidatePath('/eventos')
    return { ok: true as const, id: data.id }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function cerrarEvento(eventoId: string) {
  try {
    const { tienda_id, supabase } = await getTienda()

    const { data: evento, error: errEvento } = await supabase
      .from('eventos')
      .select('*')
      .eq('id', eventoId)
      .eq('tienda_id', tienda_id)
      .maybeSingle()

    if (errEvento) return { error: errEvento.message }
    if (!evento) return { error: 'Evento no encontrado' }
    if (evento.estado === 'cerrado') return { error: 'El evento ya está cerrado' }

    const { data: ventas } = await supabase
      .from('evento_ventas')
      .select('id, producto_id, cantidad, precio_venta, medio_pago')
      .eq('evento_id', eventoId)
      .eq('tienda_id', tienda_id)

    const { data: gastos } = await supabase
      .from('evento_gastos')
      .select('*')
      .eq('evento_id', eventoId)
      .eq('tienda_id', tienda_id)

    const { data: mediosActivos } = await supabase
      .from('medios_pago')
      .select('id, tipo, comision_porcentaje, tarifa_fija, cobra_iva')
      .eq('tienda_id', tienda_id)
      .eq('activo', true)

    function resolveMedioPagoId(medioKey: string): string | null {
      const tipo = mapEventoMedioATipo(medioKey)
      if (!tipo) return null
      const row = mediosActivos?.find((m) => m.tipo === tipo)
      return row?.id ?? null
    }

    const fechaEvento = (evento.fecha_fin as string | null) || (evento.fecha_inicio as string)

    const ventasPorMedio = new Map<string, EventoVentaRow[]>()
    for (const v of ventas ?? []) {
      const medio = (v.medio_pago as string | null)?.trim() || 'efectivo'
      if (!ventasPorMedio.has(medio)) ventasPorMedio.set(medio, [])
      ventasPorMedio.get(medio)!.push(v as EventoVentaRow)
    }

    for (const [medio, items] of ventasPorMedio.entries()) {
      const subtotal = items.reduce((s, v) => s + v.cantidad * v.precio_venta, 0)
      const envio = 0
      const medio_pago_id = resolveMedioPagoId(medio)

      let comisionTotal = 0
      let ivaComision = 0
      let netoFinal = subtotal
      if (medio_pago_id) {
        const medioRow = mediosActivos?.find((m) => m.id === medio_pago_id)
        if (medioRow) {
          const calc = calcularComisionMedioPago(subtotal, envio, medioRow)
          comisionTotal = calc.comision_total
          ivaComision = calc.iva_comision
          netoFinal = calc.neto
        }
      }

      const { data: cabecera, error: errCab } = await supabase
        .from('ventas_cabecera')
        .insert({
          tienda_id,
          cliente_id: null,
          canal: `Evento: ${evento.nombre as string}`,
          plataforma_pago: medio,
          medio_pago_id,
          fecha: fechaEvento,
          total_bruto: subtotal,
          total_neto: netoFinal,
          total_costo_transaccion: comisionTotal,
          comision_iva: ivaComision,
          envio: 0,
        })
        .select('id')
        .single()

      if (errCab || !cabecera) {
        return { error: errCab?.message ?? 'No se pudo exportar una venta del evento' }
      }

      const ratio = subtotal > 0 ? comisionTotal / subtotal : 0
      const itemsInsert = items.map((v) => {
        const baseNeta = v.cantidad * v.precio_venta
        const costoLinea = Math.round(baseNeta * ratio)
        return {
          tienda_id,
          cabecera_id: cabecera.id,
          producto_id: v.producto_id,
          variante_id: null as string | null,
          cantidad: v.cantidad,
          precio_venta: v.precio_venta,
          descuento: 0,
          costo_transaccion: costoLinea,
          neto: baseNeta - costoLinea,
        }
      })
      const { error: errItems } = await supabase.from('venta_items').insert(itemsInsert)
      if (errItems) return { error: errItems.message }
    }

    for (const g of gastos ?? []) {
      const { error: errG } = await supabase.from('gastos').insert({
        tienda_id,
        descripcion: `[Evento: ${evento.nombre as string}] ${g.descripcion as string}`,
        monto: g.monto as number,
        categoria: g.categoria as string,
        tipo_gasto: 'variable',
        fecha: fechaEvento,
      })
      if (errG) return { error: errG.message }
    }

    const vendidoPorProducto = new Map<string, number>()
    for (const v of ventas ?? []) {
      vendidoPorProducto.set(v.producto_id, (vendidoPorProducto.get(v.producto_id) ?? 0) + v.cantidad)
    }

    const { data: inventarioEvento } = await supabase
      .from('evento_inventario')
      .select('producto_id, variante_id, cantidad_llevada')
      .eq('evento_id', eventoId)
      .eq('tienda_id', tienda_id)

    const inventarioPorProducto = new Map<string, { variante_id: string | null; cantidad_llevada: number }[]>()
    for (const inv of inventarioEvento ?? []) {
      if (!inventarioPorProducto.has(inv.producto_id)) inventarioPorProducto.set(inv.producto_id, [])
      inventarioPorProducto.get(inv.producto_id)!.push({
        variante_id: inv.variante_id as string | null,
        cantidad_llevada: inv.cantidad_llevada as number,
      })
    }

    for (const [producto_id, cantidad_vendida] of vendidoPorProducto.entries()) {
      const invRows = inventarioPorProducto.get(producto_id) ?? []
      const hasVariante = invRows.some((inv) => inv.variante_id)

      if (!hasVariante) {
        // Producto sin variantes: reducir productos.stock_actual
        const { data: prod } = await supabase
          .from('productos')
          .select('stock_actual')
          .eq('id', producto_id)
          .eq('tienda_id', tienda_id)
          .maybeSingle()
        if (prod) {
          await supabase
            .from('productos')
            .update({ stock_actual: Math.max(0, (prod.stock_actual ?? 0) - cantidad_vendida) })
            .eq('id', producto_id)
            .eq('tienda_id', tienda_id)
        }
      } else if (invRows.length === 1 && invRows[0].variante_id) {
        // Una sola variante en el inventario del evento: reducir esa variante
        const { data: varStock } = await supabase
          .from('producto_variantes')
          .select('stock_actual')
          .eq('id', invRows[0].variante_id)
          .maybeSingle()
        if (varStock) {
          await supabase
            .from('producto_variantes')
            .update({ stock_actual: Math.max(0, varStock.stock_actual - cantidad_vendida) })
            .eq('id', invRows[0].variante_id)
        }
        // evento_ventas no registra variante_id, así que el padre siempre va a 0
        await supabase.from('productos').update({ stock_actual: 0 }).eq('id', producto_id)
      }
      // Múltiples variantes: no se puede saber cuál se vendió sin variante_id en evento_ventas

      await supabase
        .from('evento_inventario')
        .update({ cantidad_vendida })
        .eq('evento_id', eventoId)
        .eq('producto_id', producto_id)
        .eq('tienda_id', tienda_id)
    }

    const { error: errUpd } = await supabase
      .from('eventos')
      .update({ estado: 'cerrado' })
      .eq('id', eventoId)
      .eq('tienda_id', tienda_id)
    if (errUpd) return { error: errUpd.message }

    revalidatePath('/eventos')
    revalidatePath(`/eventos/${eventoId}`)
    revalidatePath('/ventas')
    revalidatePath('/gastos')
    revalidatePath('/dashboard')
    revalidatePath('/productos')
    return { ok: true as const }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function eliminarEvento(id: string) {
  try {
    const { tienda_id, supabase } = await getTienda()
    const { error } = await supabase.from('eventos').delete().eq('id', id).eq('tienda_id', tienda_id)
    if (error) return { error: error.message }
    revalidatePath('/eventos')
    return { ok: true as const }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function agregarInventarioEvento(
  eventoId: string,
  productoId: string,
  cantidadLlevada: number,
  varianteId?: string | null,
) {
  try {
    const { tienda_id, supabase } = await getTienda()
    const vid = varianteId?.trim() || null

    let q = supabase
      .from('evento_inventario')
      .select('id, cantidad_llevada')
      .eq('evento_id', eventoId)
      .eq('producto_id', productoId)
      .eq('tienda_id', tienda_id)
    q = vid ? q.eq('variante_id', vid) : q.is('variante_id', null)
    const { data: existing } = await q.maybeSingle()

    if (existing) {
      const nueva = (existing.cantidad_llevada ?? 0) + cantidadLlevada
      const { error } = await supabase
        .from('evento_inventario')
        .update({ cantidad_llevada: nueva })
        .eq('id', existing.id)
        .eq('tienda_id', tienda_id)
      if (error) return { error: error.message }
    } else {
      const { error } = await supabase.from('evento_inventario').insert({
        tienda_id,
        evento_id: eventoId,
        producto_id: productoId,
        variante_id: vid,
        cantidad_llevada: cantidadLlevada,
        cantidad_vendida: 0,
        cantidad_devuelta: 0,
      })
      if (error) return { error: error.message }
    }
    revalidatePath('/eventos')
    revalidatePath(`/eventos/${eventoId}`)
    return { ok: true as const }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function eliminarInventarioEvento(id: string) {
  try {
    const { tienda_id, supabase } = await getTienda()
    const { data: row } = await supabase
      .from('evento_inventario')
      .select('evento_id')
      .eq('id', id)
      .eq('tienda_id', tienda_id)
      .maybeSingle()
    const { error } = await supabase.from('evento_inventario').delete().eq('id', id).eq('tienda_id', tienda_id)
    if (error) return { error: error.message }
    if (row?.evento_id) revalidatePath(`/eventos/${row.evento_id}`)
    revalidatePath('/eventos')
    return { ok: true as const }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function actualizarDevueltaEvento(
  eventoId: string,
  productoId: string,
  cantidadDevuelta: number,
  varianteId?: string | null,
) {
  try {
    const { tienda_id, supabase } = await getTienda()
    const vid = varianteId?.trim() || null
    let q = supabase
      .from('evento_inventario')
      .update({ cantidad_devuelta: cantidadDevuelta })
      .eq('evento_id', eventoId)
      .eq('producto_id', productoId)
      .eq('tienda_id', tienda_id)
    q = vid ? q.eq('variante_id', vid) : q.is('variante_id', null)
    const { error } = await q
    if (error) return { error: error.message }
    revalidatePath(`/eventos/${eventoId}`)
    return { ok: true as const }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function registrarVentaEvento(
  eventoId: string,
  productoId: string,
  cantidad: number,
  precioVenta: number,
  medioPago: string,
) {
  try {
    const { tienda_id, supabase } = await getTienda()
    const { error } = await supabase.from('evento_ventas').insert({
      tienda_id,
      evento_id: eventoId,
      producto_id: productoId,
      cantidad,
      precio_venta: precioVenta,
      medio_pago: medioPago,
    })
    if (error) return { error: error.message }
    revalidatePath(`/eventos/${eventoId}`)
    return { ok: true as const }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function eliminarVentaEvento(id: string) {
  try {
    const { tienda_id, supabase } = await getTienda()
    const { error } = await supabase.from('evento_ventas').delete().eq('id', id).eq('tienda_id', tienda_id)
    if (error) return { error: error.message }
    revalidatePath('/eventos')
    return { ok: true as const }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function registrarGastoEvento(eventoId: string, descripcion: string, monto: number, categoria: string) {
  try {
    const { tienda_id, supabase } = await getTienda()
    const { error } = await supabase.from('evento_gastos').insert({
      tienda_id,
      evento_id: eventoId,
      descripcion,
      monto,
      categoria,
    })
    if (error) return { error: error.message }
    revalidatePath(`/eventos/${eventoId}`)
    return { ok: true as const }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function eliminarGastoEvento(id: string) {
  try {
    const { tienda_id, supabase } = await getTienda()
    const { error } = await supabase.from('evento_gastos').delete().eq('id', id).eq('tienda_id', tienda_id)
    if (error) return { error: error.message }
    revalidatePath('/eventos')
    return { ok: true as const }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}
