'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { normalizarFecha } from '@/lib/csv'

const MENSAJE_ABORTO = (n: number) =>
  `Se encontraron ${n} error(es). No se importó ningún registro. Corrige los errores y vuelve a intentarlo.`

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

// ─── SALIDAS ───────────────────────────────────────────────────────────────────
export async function importarSalidasConsignacion(filas: Record<string, string>[]) {
  try {
    const { tienda_id, supabase } = await getTienda()

    const { data: consignatarias } = await supabase
      .from('tiendas_consignatarias')
      .select('id, nombre')
      .eq('tienda_id', tienda_id)
    const porNombreConsig = new Map((consignatarias ?? []).map((c) => [c.nombre.toLowerCase().trim(), c.id]))

    const { data: productosDB } = await supabase.from('productos').select('id, nombre').eq('tienda_id', tienda_id)
    const porNombreProd = new Map((productosDB ?? []).map((p) => [p.nombre.toLowerCase().trim(), p.id]))

    const errores: { fila: number; mensaje: string }[] = []

    type FilaValida = {
      fecha: string
      consignataria_id: string
      producto_id: string
      cantidad: number
      precio_unitario: number
    }
    const validas: FilaValida[] = []

    for (let i = 0; i < filas.length; i++) {
      const fila = filas[i]
      const numFila = i + 2
      const fecha = normalizarFecha(fila['fecha'])
      const tiendaNombre = fila['tienda_aliada']?.trim()
      const productoNombre = fila['producto']?.trim()
      const cantidad = Number(fila['cantidad'])
      const precio = Number(fila['precio_unitario'])

      if (!fecha) {
        errores.push({ fila: numFila, mensaje: 'Fecha inválida' })
        continue
      }
      if (!tiendaNombre) {
        errores.push({ fila: numFila, mensaje: '"tienda_aliada" es obligatorio' })
        continue
      }
      const consignataria_id = porNombreConsig.get(tiendaNombre.toLowerCase())
      if (!consignataria_id) {
        errores.push({ fila: numFila, mensaje: `Tienda aliada "${tiendaNombre}" no encontrada` })
        continue
      }
      if (!productoNombre) {
        errores.push({ fila: numFila, mensaje: '"producto" es obligatorio' })
        continue
      }
      const producto_id = porNombreProd.get(productoNombre.toLowerCase())
      if (!producto_id) {
        errores.push({ fila: numFila, mensaje: `Producto "${productoNombre}" no encontrado` })
        continue
      }
      if (isNaN(cantidad) || cantidad <= 0) {
        errores.push({ fila: numFila, mensaje: '"cantidad" debe ser mayor a 0' })
        continue
      }
      if (isNaN(precio) || precio <= 0) {
        errores.push({ fila: numFila, mensaje: '"precio_unitario" debe ser mayor a 0' })
        continue
      }

      validas.push({ fecha, consignataria_id, producto_id, cantidad, precio_unitario: precio })
    }

    if (errores.length > 0) return { exitosos: 0, errores, mensaje: MENSAJE_ABORTO(errores.length) }

    const grupos = new Map<string, FilaValida[]>()
    for (const v of validas) {
      const key = `${v.fecha}__${v.consignataria_id}`
      if (!grupos.has(key)) grupos.set(key, [])
      grupos.get(key)!.push(v)
    }

    let exitosos = 0
    const erroresPaso2: { fila: number; mensaje: string }[] = []

    for (const [, items] of grupos.entries()) {
      const { fecha, consignataria_id } = items[0]

      const { data: salida, error: errSalida } = await supabase
        .from('consignacion_salidas')
        .insert({ tienda_id, consignataria_id, fecha, notas: null })
        .select('id')
        .single()

      if (errSalida || !salida) {
        erroresPaso2.push({ fila: 0, mensaje: `Error creando salida para ${fecha}: ${errSalida?.message}` })
        continue
      }

      for (const item of items) {
        const { error: errConsig } = await supabase.from('consignaciones').insert({
          tienda_id,
          consignataria_id,
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          unidades_disponibles: item.cantidad,
          fecha,
          salida_id: salida.id,
          estado: 'activa',
        })
        if (errConsig) {
          erroresPaso2.push({ fila: 0, mensaje: `Error en consignación: ${errConsig.message}` })
        } else {
          exitosos++
        }
      }
    }

    if (exitosos > 0) {
      revalidatePath('/consignaciones')
      revalidatePath('/productos')
    }
    return { exitosos, errores: erroresPaso2 }
  } catch (e: unknown) {
    return { exitosos: 0, errores: [{ fila: 0, mensaje: e instanceof Error ? e.message : 'Error desconocido' }] }
  }
}

// ─── DEVOLUCIONES ──────────────────────────────────────────────────────────────
export async function importarDevolucionesConsignacion(filas: Record<string, string>[]) {
  try {
    const { tienda_id, supabase } = await getTienda()

    const { data: consignatarias } = await supabase
      .from('tiendas_consignatarias')
      .select('id, nombre')
      .eq('tienda_id', tienda_id)
    const porNombreConsig = new Map((consignatarias ?? []).map((c) => [c.nombre.toLowerCase().trim(), c.id]))

    const { data: productosDB } = await supabase.from('productos').select('id, nombre').eq('tienda_id', tienda_id)
    const porNombreProd = new Map((productosDB ?? []).map((p) => [p.nombre.toLowerCase().trim(), p.id]))

    const errores: { fila: number; mensaje: string }[] = []
    type FilaDev = {
      fila: number
      fecha: string
      consignataria_id: string
      producto_id: string
      productoNombre: string
      cantidad: number
      notas: string | null
    }
    const validas: FilaDev[] = []

    for (let i = 0; i < filas.length; i++) {
      const fila = filas[i]
      const numFila = i + 2
      const fecha = normalizarFecha(fila['fecha'])
      const tiendaNombre = fila['tienda_aliada']?.trim()
      const productoNombre = fila['producto']?.trim()
      const cantidad = Number(fila['cantidad'])
      const notas = fila['notas']?.trim() || null

      if (!fecha) {
        errores.push({ fila: numFila, mensaje: 'Fecha inválida' })
        continue
      }
      const consignataria_id = porNombreConsig.get(tiendaNombre?.toLowerCase() ?? '')
      if (!consignataria_id) {
        errores.push({ fila: numFila, mensaje: `Tienda aliada "${tiendaNombre}" no encontrada` })
        continue
      }
      const producto_id = porNombreProd.get(productoNombre?.toLowerCase() ?? '')
      if (!producto_id) {
        errores.push({ fila: numFila, mensaje: `Producto "${productoNombre}" no encontrado` })
        continue
      }
      if (isNaN(cantidad) || cantidad <= 0) {
        errores.push({ fila: numFila, mensaje: '"cantidad" debe ser mayor a 0' })
        continue
      }

      validas.push({
        fila: numFila,
        fecha,
        consignataria_id,
        producto_id,
        productoNombre: productoNombre ?? '',
        cantidad,
        notas,
      })
    }

    if (errores.length > 0) return { exitosos: 0, errores, mensaje: MENSAJE_ABORTO(errores.length) }

    let exitosos = 0
    const erroresPaso2: { fila: number; mensaje: string }[] = []

    for (const op of validas) {
      const { data: consig } = await supabase
        .from('consignaciones')
        .select('id, unidades_disponibles')
        .eq('tienda_id', tienda_id)
        .eq('consignataria_id', op.consignataria_id)
        .eq('producto_id', op.producto_id)
        .eq('estado', 'activa')
        .gt('unidades_disponibles', 0)
        .order('fecha', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (!consig) {
        erroresPaso2.push({
          fila: op.fila,
          mensaje: `No hay consignación activa de "${op.productoNombre}" en esa tienda`,
        })
        continue
      }
      if (op.cantidad > (consig.unidades_disponibles ?? 0)) {
        erroresPaso2.push({
          fila: op.fila,
          mensaje: `Solo hay ${consig.unidades_disponibles} unidades disponibles`,
        })
        continue
      }

      const nuevasDisponibles = (consig.unidades_disponibles ?? 0) - op.cantidad
      const nuevoEstado = nuevasDisponibles === 0 ? 'devuelta' : 'activa'

      await supabase.from('consignacion_movimientos').insert({
        tienda_id,
        consignacion_id: consig.id,
        consignataria_id: op.consignataria_id,
        tipo: 'devolucion',
        cantidad: op.cantidad,
        fecha: op.fecha,
        notas: op.notas,
        total_bruto: null,
        comision: null,
        neto: null,
      })

      await supabase
        .from('consignaciones')
        .update({
          unidades_disponibles: nuevasDisponibles,
          estado: nuevoEstado,
        })
        .eq('id', consig.id)

      const { data: prod } = await supabase
        .from('productos')
        .select('stock_actual')
        .eq('id', op.producto_id)
        .single()
      if (prod) {
        await supabase
          .from('productos')
          .update({ stock_actual: prod.stock_actual + op.cantidad })
          .eq('id', op.producto_id)
      }

      exitosos++
    }

    if (exitosos > 0) {
      revalidatePath('/consignaciones')
      revalidatePath('/productos')
    }
    return { exitosos, errores: erroresPaso2 }
  } catch (e: unknown) {
    return { exitosos: 0, errores: [{ fila: 0, mensaje: e instanceof Error ? e.message : 'Error desconocido' }] }
  }
}

// ─── LIQUIDACIONES ─────────────────────────────────────────────────────────────
export async function importarLiquidacionesConsignacion(filas: Record<string, string>[]) {
  try {
    const { tienda_id, supabase } = await getTienda()

    const { data: consignatarias } = await supabase
      .from('tiendas_consignatarias')
      .select('id, nombre, porcentaje_comision')
      .eq('tienda_id', tienda_id)
    const porNombreConsig = new Map(
      (consignatarias ?? []).map((c) => [c.nombre.toLowerCase().trim(), c]),
    )

    const errores: { fila: number; mensaje: string }[] = []
    type FilaLiq = {
      fila: number
      fecha: string
      consignataria_id: string
      porcentaje_comision: number
      mes: string
      total_vendido: number
      notas: string | null
    }
    const validas: FilaLiq[] = []

    for (let i = 0; i < filas.length; i++) {
      const fila = filas[i]
      const numFila = i + 2
      const fecha = normalizarFecha(fila['fecha'])
      const tiendaNombre = fila['tienda_aliada']?.trim()
      const mes = fila['mes']?.trim()
      const total_vendido = Number(fila['total_vendido'])
      const notas = fila['notas']?.trim() || null

      if (!fecha) {
        errores.push({ fila: numFila, mensaje: 'Fecha inválida' })
        continue
      }
      const consig = porNombreConsig.get(tiendaNombre?.toLowerCase() ?? '')
      if (!consig) {
        errores.push({ fila: numFila, mensaje: `Tienda aliada "${tiendaNombre}" no encontrada` })
        continue
      }
      if (!mes) {
        errores.push({ fila: numFila, mensaje: '"mes" es obligatorio (ej: 2025-03)' })
        continue
      }
      if (isNaN(total_vendido) || total_vendido <= 0) {
        errores.push({ fila: numFila, mensaje: '"total_vendido" debe ser mayor a 0' })
        continue
      }

      validas.push({
        fila: numFila,
        fecha,
        consignataria_id: consig.id,
        porcentaje_comision: consig.porcentaje_comision,
        mes,
        total_vendido,
        notas,
      })
    }

    if (errores.length > 0) return { exitosos: 0, errores, mensaje: MENSAJE_ABORTO(errores.length) }

    let exitosos = 0
    const erroresPaso2: { fila: number; mensaje: string }[] = []

    for (const op of validas) {
      const comision = Math.round(op.total_vendido * (op.porcentaje_comision / 100))
      const neto = op.total_vendido - comision

      const { error } = await supabase.from('liquidaciones').insert({
        tienda_id,
        consignataria_id: op.consignataria_id,
        fecha: op.fecha,
        mes: op.mes,
        total_vendido: op.total_vendido,
        porcentaje_comision: op.porcentaje_comision,
        comision,
        neto,
        notas: op.notas,
        consignaciones_ids: [],
      })
      if (error) {
        erroresPaso2.push({ fila: op.fila, mensaje: error.message })
        continue
      }
      exitosos++
    }

    if (exitosos > 0) revalidatePath('/consignaciones')
    return { exitosos, errores: erroresPaso2 }
  } catch (e: unknown) {
    return { exitosos: 0, errores: [{ fila: 0, mensaje: e instanceof Error ? e.message : 'Error desconocido' }] }
  }
}
