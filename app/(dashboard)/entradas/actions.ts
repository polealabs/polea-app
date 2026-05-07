'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getTiendaId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data } = await supabase.from('tiendas').select('id').eq('owner_id', user.id).single()
  if (!data) throw new Error('Tienda no encontrada')
  return data.id
}

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

export async function crearEntradas(
  lineas: {
    producto_id: string
    proveedor_id?: string
    cantidad: number
    costo_unitario: number
    fecha: string
  }[],
) {
  try {
    const supabase = await createClient()
    const tienda_id = await getTiendaId()
    const rows = lineas.map((l) => ({ ...l, proveedor_id: l.proveedor_id || null, tienda_id }))
    const { error } = await supabase.from('entradas').insert(rows)
    if (error) return { error: error.message }
    revalidatePath('/entradas')
    revalidatePath('/productos')
    revalidatePath('/gastos')
    return { success: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function eliminarEntrada(id: string) {
  try {
    const supabase = await createClient()
    const tienda_id = await getTiendaId()
    const { error } = await supabase.from('entradas').delete().eq('id', id).eq('tienda_id', tienda_id)
    if (error) return { error: error.message }
    revalidatePath('/entradas')
    revalidatePath('/productos')
    return { success: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function registrarEntradaCompleta(payload: {
  producto_id?: string
  variante_id?: string
  nuevo_producto?: {
    nombre: string
    precio_venta: number
    costo_produccion?: number
    tipo: string
    sku?: string
  }
  cantidad: number
  costo_unitario: number
  proveedor_id?: string
  fecha: string
  notas?: string
  tipo_pago: 'contado' | 'contado_pendiente' | 'cuotas'
  fecha_pago?: string
  numero_cuotas?: number
  frecuencia_cuotas?: 'semanal' | 'quincenal' | 'mensual'
  fecha_primera_cuota?: string
}) {
  try {
    const { tienda_id, supabase } = await getTienda()

    let producto_id = payload.producto_id
    if (payload.nuevo_producto) {
      const { data: nuevoProd, error: errProd } = await supabase
        .from('productos')
        .insert({
          tienda_id,
          nombre: payload.nuevo_producto.nombre,
          precio_venta: payload.nuevo_producto.precio_venta,
          costo_produccion: payload.nuevo_producto.costo_produccion ?? null,
          tipo: payload.nuevo_producto.tipo || 'Producto terminado',
          sku: payload.nuevo_producto.sku?.trim() ? payload.nuevo_producto.sku.trim() : null,
          stock_actual: 0,
          stock_minimo: 0,
        })
        .select()
        .single()
      if (errProd) return { error: errProd.message }
      producto_id = nuevoProd.id
    }

    if (!producto_id) return { error: 'Debes seleccionar o crear un producto' }

    const { data: entrada, error: errEntrada } = await supabase
      .from('entradas')
      .insert({
        tienda_id,
        producto_id,
        cantidad: payload.cantidad,
        costo_unitario: payload.costo_unitario,
        proveedor_id: payload.proveedor_id || null,
        fecha: payload.fecha,
        notas: payload.notas || null,
      })
      .select()
      .single()
    if (errEntrada) return { error: errEntrada.message }

    if (payload.variante_id) {
      const { data: variante } = await supabase
        .from('producto_variantes')
        .select('stock_actual')
        .eq('id', payload.variante_id)
        .single()

      if (variante) {
        await supabase
          .from('producto_variantes')
          .update({
            stock_actual: variante.stock_actual + payload.cantidad,
          })
          .eq('id', payload.variante_id)
      }
    }

    const montoTotal = payload.cantidad * payload.costo_unitario
    const frecuencia = payload.frecuencia_cuotas ?? 'mensual'

    if (payload.tipo_pago === 'contado') {
      await supabase.from('gastos').insert({
        tienda_id,
        descripcion: 'Compra de inventario',
        monto: montoTotal,
        fecha: payload.fecha_pago || payload.fecha,
        categoria: 'Compra de inventario',
        tipo_gasto: 'compra_inventario',
        subcategoria: 'Producto terminado',
        proveedor_id: payload.proveedor_id || null,
      })
    } else if (payload.tipo_pago === 'contado_pendiente') {
      const { error: errCuenta } = await supabase.from('cuentas_por_pagar').insert({
        tienda_id,
        proveedor_id: payload.proveedor_id || null,
        entrada_id: entrada.id,
        descripcion: 'Compra de inventario pendiente de pago',
        monto_total: montoTotal,
        monto_pagado: 0,
        fecha_vencimiento: payload.fecha_pago || null,
        tipo_pago: 'contado_pendiente',
        numero_cuotas: 1,
        estado: 'pendiente',
      })
      if (errCuenta) return { error: errCuenta.message }
    } else if (payload.tipo_pago === 'cuotas') {
      const numCuotas = Math.min(12, Math.max(2, payload.numero_cuotas ?? 2))
      const montoCuota = Math.round(montoTotal / numCuotas)

      const { data: cuenta, error: errCuenta } = await supabase
        .from('cuentas_por_pagar')
        .insert({
          tienda_id,
          proveedor_id: payload.proveedor_id || null,
          entrada_id: entrada.id,
          descripcion: `Compra de inventario en ${numCuotas} cuotas`,
          monto_total: montoTotal,
          monto_pagado: 0,
          tipo_pago: 'cuotas',
          numero_cuotas: numCuotas,
          frecuencia_cuotas: frecuencia,
          estado: 'pendiente',
        })
        .select()
        .single()
      if (errCuenta) return { error: errCuenta.message }

      const cuotas: {
        tienda_id: string
        cuenta_id: string
        numero_cuota: number
        monto: number
        fecha_vencimiento: string
        estado: 'pendiente'
      }[] = []
      const fechaBase = payload.fecha_primera_cuota || payload.fecha
      const fechaCuota = new Date(fechaBase + 'T12:00:00')
      for (let i = 1; i <= numCuotas; i++) {
        const montoFila = i === numCuotas ? montoTotal - montoCuota * (numCuotas - 1) : montoCuota
        cuotas.push({
          tienda_id,
          cuenta_id: cuenta.id,
          numero_cuota: i,
          monto: montoFila,
          fecha_vencimiento: fechaCuota.toISOString().split('T')[0],
          estado: 'pendiente',
        })
        if (frecuencia === 'semanal') fechaCuota.setDate(fechaCuota.getDate() + 7)
        else if (frecuencia === 'quincenal') fechaCuota.setDate(fechaCuota.getDate() + 15)
        else fechaCuota.setMonth(fechaCuota.getMonth() + 1)
      }
      const { error: errCuotas } = await supabase.from('cuotas_pago').insert(cuotas)
      if (errCuotas) return { error: errCuotas.message }
    }

    revalidatePath('/entradas')
    revalidatePath('/productos')
    revalidatePath('/gastos')
    return { ok: true as const, producto_id, entrada_id: entrada.id }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

type CuentaConCuotas = {
  id: string
  monto_total: number
  monto_pagado: number
  descripcion: string
  proveedor_id?: string | null
  cuotas_pago?: { id: string; numero_cuota: number; monto: number; estado: string }[] | null
}

export async function registrarPagoCuenta(cuentaId: string, cuotaId?: string, fechaPago?: string) {
  try {
    const { tienda_id, supabase } = await getTienda()
    const fecha = fechaPago || new Date().toISOString().split('T')[0]

    const { data: cuentaRaw } = await supabase
      .from('cuentas_por_pagar')
      .select('*, cuotas_pago(*)')
      .eq('id', cuentaId)
      .eq('tienda_id', tienda_id)
      .single()

    const cuenta = cuentaRaw as CuentaConCuotas | null
    if (!cuenta) return { error: 'Cuenta no encontrada' }

    const cuotasList = Array.isArray(cuenta.cuotas_pago)
      ? cuenta.cuotas_pago
      : cuenta.cuotas_pago
        ? [cuenta.cuotas_pago]
        : []

    let montoPagado = cuenta.monto_pagado

    if (cuotaId) {
      const cuota = cuotasList.find((c) => c.id === cuotaId)
      if (!cuota) return { error: 'Cuota no encontrada' }
      if (cuota.estado === 'pagada') return { error: 'Esta cuota ya está pagada' }

      await supabase.from('cuotas_pago').update({ estado: 'pagada', fecha_pago: fecha }).eq('id', cuotaId)
      montoPagado = cuenta.monto_pagado + cuota.monto

      await supabase.from('gastos').insert({
        tienda_id,
        descripcion: `Cuota ${cuota.numero_cuota} de ${cuenta.descripcion}`,
        monto: cuota.monto,
        fecha,
        categoria: 'Compra de inventario',
        tipo_gasto: 'compra_inventario',
        subcategoria: 'Producto terminado',
        proveedor_id: cuenta.proveedor_id || null,
      })
    } else {
      const pendiente = cuenta.monto_total - cuenta.monto_pagado
      if (pendiente <= 0) return { error: 'La cuenta ya está saldada' }

      montoPagado = cuenta.monto_total
      await supabase
        .from('cuotas_pago')
        .update({ estado: 'pagada', fecha_pago: fecha })
        .eq('cuenta_id', cuentaId)
        .eq('tienda_id', tienda_id)

      await supabase.from('gastos').insert({
        tienda_id,
        descripcion: cuenta.descripcion,
        monto: pendiente,
        fecha,
        categoria: 'Compra de inventario',
        tipo_gasto: 'compra_inventario',
        subcategoria: 'Producto terminado',
        proveedor_id: cuenta.proveedor_id || null,
      })
    }

    const nuevoEstado: 'pendiente' | 'parcial' | 'pagada' =
      montoPagado >= cuenta.monto_total ? 'pagada' : 'parcial'
    await supabase
      .from('cuentas_por_pagar')
      .update({ monto_pagado: montoPagado, estado: nuevoEstado })
      .eq('id', cuentaId)
      .eq('tienda_id', tienda_id)

    revalidatePath('/entradas')
    revalidatePath('/gastos')
    return { ok: true as const }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}
