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
      variante_id: string | null
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

      const varianteNombre = fila['variante']?.trim() || null
      let variante_id: string | null = null

      if (varianteNombre && producto_id) {
        const { data: variante } = await supabase
          .from('producto_variantes')
          .select('id')
          .eq('tienda_id', tienda_id)
          .eq('producto_id', producto_id)
          .ilike('nombre', varianteNombre)
          .eq('activa', true)
          .maybeSingle()
        if (!variante) {
          errores.push({
            fila: numFila,
            mensaje: `Variante "${varianteNombre}" no encontrada para "${productoNombre}"`,
          })
          continue
        }
        variante_id = variante.id
      }

      validas.push({
        fecha,
        consignataria_id,
        producto_id,
        variante_id,
        cantidad,
        precio_unitario: precio,
      })
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
          variante_id: item.variante_id,
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
          if (item.variante_id) {
            const { data: varStock } = await supabase
              .from('producto_variantes')
              .select('stock_actual')
              .eq('id', item.variante_id)
              .single()
            if (varStock) {
              await supabase
                .from('producto_variantes')
                .update({ stock_actual: Math.max(0, varStock.stock_actual - item.cantidad) })
                .eq('id', item.variante_id)
            }
            // El trigger trg_consignacion_resta_stock resta del padre (incorrecto para variantes).
            await supabase.from('productos').update({ stock_actual: 0 }).eq('id', item.producto_id)
          }
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
      variante_id: string | null
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

      const varianteNombre = fila['variante']?.trim() || null
      let variante_id: string | null = null

      if (varianteNombre && producto_id) {
        const { data: variante } = await supabase
          .from('producto_variantes')
          .select('id')
          .eq('tienda_id', tienda_id)
          .eq('producto_id', producto_id)
          .ilike('nombre', varianteNombre)
          .eq('activa', true)
          .maybeSingle()
        if (!variante) {
          errores.push({
            fila: numFila,
            mensaje: `Variante "${varianteNombre}" no encontrada para "${productoNombre}"`,
          })
          continue
        }
        variante_id = variante.id
      }

      validas.push({
        fila: numFila,
        fecha,
        consignataria_id,
        producto_id,
        variante_id,
        productoNombre: productoNombre ?? '',
        cantidad,
        notas,
      })
    }

    if (errores.length > 0) return { exitosos: 0, errores, mensaje: MENSAJE_ABORTO(errores.length) }

    let exitosos = 0
    const erroresPaso2: { fila: number; mensaje: string }[] = []

    for (const op of validas) {
      let query = supabase
        .from('consignaciones')
        .select('id, unidades_disponibles, producto_id')
        .eq('tienda_id', tienda_id)
        .eq('consignataria_id', op.consignataria_id)
        .eq('producto_id', op.producto_id)
        .eq('estado', 'activa')
        .gt('unidades_disponibles', 0)
        .order('fecha', { ascending: true })
        .limit(1)

      if (op.variante_id) {
        query = query.eq('variante_id', op.variante_id)
      }

      const { data: consig } = await query.maybeSingle()

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

      const { error: errMov } = await supabase.from('consignacion_movimientos').insert({
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
      if (errMov) {
        erroresPaso2.push({ fila: op.fila, mensaje: errMov.message })
        continue
      }

      const { error: errConsig } = await supabase
        .from('consignaciones')
        .update({
          unidades_disponibles: nuevasDisponibles,
          estado: nuevoEstado,
        })
        .eq('id', consig.id)
      if (errConsig) {
        erroresPaso2.push({ fila: op.fila, mensaje: errConsig.message })
        continue
      }

      if (op.variante_id) {
        const { data: varStock } = await supabase
          .from('producto_variantes')
          .select('stock_actual')
          .eq('id', op.variante_id)
          .single()
        if (varStock) {
          await supabase
            .from('producto_variantes')
            .update({ stock_actual: varStock.stock_actual + op.cantidad })
            .eq('id', op.variante_id)
        }
        // El trigger trg_consignacion_devolucion_stock suma al padre (incorrecto para variantes).
        await supabase.from('productos').update({ stock_actual: 0 }).eq('id', op.producto_id)
      } else {
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

    const { data: productosDB } = await supabase.from('productos').select('id, nombre').eq('tienda_id', tienda_id)
    const porNombreProd = new Map((productosDB ?? []).map((p) => [p.nombre.toLowerCase().trim(), p.id]))

    const errores: { fila: number; mensaje: string }[] = []
    type FilaLiq = {
      fila: number
      fecha: string
      consignataria_id: string
      porcentaje_comision: number
      mes: string
      producto_id: string
      variante_id: string | null
      cant_vendida: number
      precio_venta: number
      notas: string | null
      productoNombre: string
    }
    const validas: FilaLiq[] = []

    for (let i = 0; i < filas.length; i++) {
      const fila = filas[i]
      const numFila = i + 2
      const fecha = normalizarFecha(fila['fecha'])
      const tiendaNombre = fila['tienda_aliada']?.trim()
      const mes = fila['mes']?.trim()
      const productoNombre = fila['producto']?.trim()
      const varianteNombre = fila['variante']?.trim() || null
      const cant_vendida = Number(fila['cant_vendida'])
      const precio_venta = Number(fila['precio_venta'])
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

      const producto_id = porNombreProd.get(productoNombre?.toLowerCase() ?? '')
      if (!producto_id) {
        errores.push({ fila: numFila, mensaje: `Producto "${productoNombre}" no encontrado` })
        continue
      }
      if (isNaN(cant_vendida) || cant_vendida <= 0) {
        errores.push({ fila: numFila, mensaje: '"cant_vendida" debe ser mayor a 0' })
        continue
      }
      if (isNaN(precio_venta) || precio_venta <= 0) {
        errores.push({ fila: numFila, mensaje: '"precio_venta" debe ser mayor a 0' })
        continue
      }

      let variante_id: string | null = null
      if (varianteNombre) {
        const { data: variante } = await supabase
          .from('producto_variantes')
          .select('id')
          .eq('tienda_id', tienda_id)
          .eq('producto_id', producto_id)
          .ilike('nombre', varianteNombre)
          .eq('activa', true)
          .maybeSingle()
        if (!variante) {
          errores.push({ fila: numFila, mensaje: `Variante "${varianteNombre}" no encontrada` })
          continue
        }
        variante_id = variante.id
      }

      validas.push({
        fila: numFila,
        fecha,
        consignataria_id: consig.id,
        porcentaje_comision: consig.porcentaje_comision,
        mes,
        producto_id,
        variante_id,
        cant_vendida,
        precio_venta,
        notas,
        productoNombre: productoNombre ?? '',
      })
    }

    if (errores.length > 0) return { exitosos: 0, errores, mensaje: MENSAJE_ABORTO(errores.length) }

    const grupos = new Map<string, FilaLiq[]>()
    for (const v of validas) {
      const key = `${v.fecha}__${v.consignataria_id}__${v.mes}`
      if (!grupos.has(key)) grupos.set(key, [])
      grupos.get(key)!.push(v)
    }

    let exitosos = 0
    const erroresPaso2: { fila: number; mensaje: string }[] = []

    for (const [, items] of grupos.entries()) {
      const { fecha, consignataria_id, mes, porcentaje_comision } = items[0]
      const consignaciones_ids: string[] = []
      let total_vendido = 0
      let grupoOk = true

      for (const op of items) {
        let query = supabase
          .from('consignaciones')
          .select('id, unidades_disponibles')
          .eq('tienda_id', tienda_id)
          .eq('consignataria_id', op.consignataria_id)
          .eq('producto_id', op.producto_id)
          .eq('estado', 'activa')
          .gt('unidades_disponibles', 0)
          .order('fecha', { ascending: true })
          .limit(1)

        if (op.variante_id) {
          query = query.eq('variante_id', op.variante_id)
        } else {
          query = query.is('variante_id', null)
        }

        const { data: consig } = await query.maybeSingle()

        if (!consig) {
          erroresPaso2.push({
            fila: op.fila,
            mensaje: `No hay consignación activa de "${op.productoNombre}" en esa tienda`,
          })
          grupoOk = false
          continue
        }
        if (op.cant_vendida > (consig.unidades_disponibles ?? 0)) {
          erroresPaso2.push({
            fila: op.fila,
            mensaje: `Solo hay ${consig.unidades_disponibles} unidades disponibles`,
          })
          grupoOk = false
          continue
        }

        const total_bruto = op.precio_venta * op.cant_vendida
        const comisionMov = Math.round(total_bruto * (op.porcentaje_comision / 100))
        const netoMov = total_bruto - comisionMov
        const nuevasDisponibles = (consig.unidades_disponibles ?? 0) - op.cant_vendida
        const nuevoEstado = nuevasDisponibles === 0 ? 'liquidada' : 'activa'

        const { error: errMov } = await supabase.from('consignacion_movimientos').insert({
          tienda_id,
          consignacion_id: consig.id,
          consignataria_id: op.consignataria_id,
          tipo: 'liquidacion',
          cantidad: op.cant_vendida,
          precio_venta: op.precio_venta,
          total_bruto,
          comision: comisionMov,
          neto: netoMov,
          fecha: op.fecha,
          notas: op.notas,
        })

        if (errMov) {
          erroresPaso2.push({ fila: op.fila, mensaje: errMov.message })
          grupoOk = false
          continue
        }

        await supabase
          .from('consignaciones')
          .update({
            unidades_disponibles: nuevasDisponibles,
            estado: nuevoEstado,
          })
          .eq('id', consig.id)

        total_vendido += total_bruto
        consignaciones_ids.push(consig.id)
      }

      if (!grupoOk || consignaciones_ids.length === 0) continue

      const comision = Math.round(total_vendido * (porcentaje_comision / 100))
      const neto = total_vendido - comision
      const notasGrupo = items.map((i) => i.notas).filter(Boolean).join(' | ') || null

      const { error } = await supabase.from('liquidaciones').insert({
        tienda_id,
        consignataria_id,
        fecha,
        mes,
        total_vendido,
        porcentaje_comision,
        comision,
        neto,
        notas: notasGrupo,
        consignaciones_ids,
      })

      if (error) {
        erroresPaso2.push({ fila: items[0].fila, mensaje: error.message })
        continue
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
