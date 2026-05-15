'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const MENSAJE_ABORTO = (n: number) =>
  `Se encontraron ${n} error(es). No se importó ningún registro. Corrige los errores y vuelve a intentarlo.`

const MEDIOS_VALIDOS = ['efectivo', 'transferencia', 'nequi', 'datafono']

async function getTiendaYEvento(eventoId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: tienda } = await supabase.from('tiendas').select('id').eq('owner_id', user.id).maybeSingle()
  if (!tienda) throw new Error('Tienda no encontrada')
  const { data: evento } = await supabase
    .from('eventos')
    .select('id, estado')
    .eq('id', eventoId)
    .eq('tienda_id', tienda.id)
    .maybeSingle()
  if (!evento) throw new Error('Evento no encontrado')
  if (evento.estado === 'cerrado') throw new Error('El evento ya está cerrado')
  return { tienda_id: tienda.id, supabase }
}

type FilaInventario = { producto_id: string; cantidad_llevada: number; numFila: number }
type FilaVenta = { producto_id: string; cantidad: number; precio_venta: number; medio_pago: string; numFila: number }
type FilaGasto = { descripcion: string; monto: number; categoria: string; numFila: number }

export async function importarInventarioEvento(eventoId: string, filas: Record<string, string>[]) {
  try {
    const { tienda_id, supabase } = await getTiendaYEvento(eventoId)

    const { data: productosDB } = await supabase.from('productos').select('id, nombre').eq('tienda_id', tienda_id)
    const porNombre = new Map((productosDB ?? []).map((p) => [p.nombre.toLowerCase().trim(), p.id]))

    const errores: { fila: number; mensaje: string }[] = []
    const validas: FilaInventario[] = []

    for (let i = 0; i < filas.length; i++) {
      const fila = filas[i]
      const numFila = i + 2
      const nombre = fila['producto']?.trim()
      const cantidad = Number(fila['cantidad_llevada'])

      if (!nombre) {
        errores.push({ fila: numFila, mensaje: 'El campo "producto" es obligatorio' })
        continue
      }
      const producto_id = porNombre.get(nombre.toLowerCase())
      if (!producto_id) {
        errores.push({ fila: numFila, mensaje: `Producto "${nombre}" no encontrado en tu inventario` })
        continue
      }
      if (isNaN(cantidad) || cantidad <= 0) {
        errores.push({ fila: numFila, mensaje: '"cantidad_llevada" debe ser un número mayor a 0' })
        continue
      }

      validas.push({ producto_id, cantidad_llevada: cantidad, numFila })
    }

    if (errores.length > 0) return { exitosos: 0, errores, mensaje: MENSAJE_ABORTO(errores.length) }

    let exitosos = 0
    const erroresPaso2: { fila: number; mensaje: string }[] = []

    for (const op of validas) {
      const { data: existing } = await supabase
        .from('evento_inventario')
        .select('id')
        .eq('evento_id', eventoId)
        .eq('producto_id', op.producto_id)
        .eq('tienda_id', tienda_id)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('evento_inventario')
          .update({ cantidad_llevada: op.cantidad_llevada })
          .eq('id', existing.id)
          .eq('tienda_id', tienda_id)
        if (error) {
          erroresPaso2.push({ fila: op.numFila, mensaje: error.message })
          continue
        }
      } else {
        const { error } = await supabase.from('evento_inventario').insert({
          tienda_id,
          evento_id: eventoId,
          producto_id: op.producto_id,
          cantidad_llevada: op.cantidad_llevada,
          cantidad_vendida: 0,
          cantidad_devuelta: 0,
        })
        if (error) {
          erroresPaso2.push({ fila: op.numFila, mensaje: error.message })
          continue
        }
      }
      exitosos++
    }

    if (exitosos > 0) revalidatePath(`/eventos/${eventoId}`)
    return { exitosos, errores: erroresPaso2 }
  } catch (e: unknown) {
    return { exitosos: 0, errores: [{ fila: 0, mensaje: e instanceof Error ? e.message : 'Error desconocido' }] }
  }
}

export async function importarVentasEvento(eventoId: string, filas: Record<string, string>[]) {
  try {
    const { tienda_id, supabase } = await getTiendaYEvento(eventoId)

    const { data: productosDB } = await supabase
      .from('productos')
      .select('id, nombre, precio_venta')
      .eq('tienda_id', tienda_id)
    const porNombre = new Map((productosDB ?? []).map((p) => [p.nombre.toLowerCase().trim(), p]))

    const errores: { fila: number; mensaje: string }[] = []
    const validas: FilaVenta[] = []

    for (let i = 0; i < filas.length; i++) {
      const fila = filas[i]
      const numFila = i + 2
      const nombre = fila['producto']?.trim()
      const cantidad = Number(fila['cantidad'])
      const precioRaw = fila['precio_venta']?.trim()
      const medio = fila['medio_pago']?.trim().toLowerCase() || 'efectivo'

      if (!nombre) {
        errores.push({ fila: numFila, mensaje: 'El campo "producto" es obligatorio' })
        continue
      }
      const prod = porNombre.get(nombre.toLowerCase())
      if (!prod) {
        errores.push({ fila: numFila, mensaje: `Producto "${nombre}" no encontrado` })
        continue
      }
      if (isNaN(cantidad) || cantidad <= 0) {
        errores.push({ fila: numFila, mensaje: '"cantidad" debe ser mayor a 0' })
        continue
      }
      if (!MEDIOS_VALIDOS.includes(medio)) {
        errores.push({
          fila: numFila,
          mensaje: `"medio_pago" inválido. Válidos: ${MEDIOS_VALIDOS.join(', ')}`,
        })
        continue
      }

      const precio_venta =
        precioRaw && !isNaN(Number(precioRaw)) && Number(precioRaw) > 0
          ? Number(precioRaw)
          : Number(prod.precio_venta ?? 0)
      if (precio_venta <= 0) {
        errores.push({
          fila: numFila,
          mensaje: '"precio_venta" debe ser mayor a 0 o el producto debe tener precio de venta en inventario',
        })
        continue
      }

      validas.push({ producto_id: prod.id, cantidad, precio_venta, medio_pago: medio, numFila })
    }

    if (errores.length > 0) return { exitosos: 0, errores, mensaje: MENSAJE_ABORTO(errores.length) }

    let exitosos = 0
    const erroresPaso2: { fila: number; mensaje: string }[] = []

    for (const row of validas) {
      const { error } = await supabase.from('evento_ventas').insert({
        tienda_id,
        evento_id: eventoId,
        producto_id: row.producto_id,
        cantidad: row.cantidad,
        precio_venta: row.precio_venta,
        medio_pago: row.medio_pago,
      })
      if (error) {
        erroresPaso2.push({ fila: row.numFila, mensaje: error.message })
        continue
      }
      exitosos++
    }

    if (exitosos > 0) revalidatePath(`/eventos/${eventoId}`)
    return { exitosos, errores: erroresPaso2 }
  } catch (e: unknown) {
    return { exitosos: 0, errores: [{ fila: 0, mensaje: e instanceof Error ? e.message : 'Error desconocido' }] }
  }
}

export async function importarGastosEvento(eventoId: string, filas: Record<string, string>[]) {
  try {
    const { tienda_id, supabase } = await getTiendaYEvento(eventoId)

    const errores: { fila: number; mensaje: string }[] = []
    const validas: FilaGasto[] = []

    for (let i = 0; i < filas.length; i++) {
      const fila = filas[i]
      const numFila = i + 2
      const descripcion = fila['descripcion']?.trim()
      const monto = Number(fila['monto'])
      const categoria = fila['categoria']?.trim() || 'Otro'

      if (!descripcion) {
        errores.push({ fila: numFila, mensaje: 'El campo "descripcion" es obligatorio' })
        continue
      }
      if (isNaN(monto) || monto <= 0) {
        errores.push({ fila: numFila, mensaje: '"monto" debe ser mayor a 0' })
        continue
      }

      validas.push({ descripcion, monto, categoria, numFila })
    }

    if (errores.length > 0) return { exitosos: 0, errores, mensaje: MENSAJE_ABORTO(errores.length) }

    let exitosos = 0
    const erroresPaso2: { fila: number; mensaje: string }[] = []

    for (const row of validas) {
      const { error } = await supabase.from('evento_gastos').insert({
        tienda_id,
        evento_id: eventoId,
        descripcion: row.descripcion,
        monto: row.monto,
        categoria: row.categoria,
      })
      if (error) {
        erroresPaso2.push({ fila: row.numFila, mensaje: error.message })
        continue
      }
      exitosos++
    }

    if (exitosos > 0) revalidatePath(`/eventos/${eventoId}`)
    return { exitosos, errores: erroresPaso2 }
  } catch (e: unknown) {
    return { exitosos: 0, errores: [{ fila: 0, mensaje: e instanceof Error ? e.message : 'Error desconocido' }] }
  }
}
