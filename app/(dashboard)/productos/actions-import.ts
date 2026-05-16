'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const TIPOS_VALIDOS = ['Producto terminado', 'Materia prima', 'Empaque', 'Material POP']

const MENSAJE_ABORTO = (n: number) =>
  `Se encontraron ${n} error(es). No se importó ningún registro. Corrige los errores y vuelve a intentarlo.`

type Paso2Producto =
  | {
      t: 'base'
      fila: number
      nombre: string
      existingProductoId: string | null
      insert: {
        tienda_id: string
        nombre: string
        sku: string | null
        tipo: string
        precio_venta: number
        costo_produccion: number | null
        stock_actual: number
        stock_minimo: number
        tiene_variantes: boolean
      }
      varianteMismaFila: null | {
        nombre: string
        precio_venta: number
        stock_actual: number
      }
    }
  | {
      t: 'variante'
      fila: number
      nombre: string
      variante_nombre: string
      variante_precio: number
      variante_stock: number
    }
  | { t: 'noop'; fila: number }

export async function importarProductos(filas: Record<string, string>[]) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { exitosos: 0, errores: [{ fila: 0, mensaje: 'No autenticado' }] }

  const { data: tienda } = await supabase.from('tiendas').select('id').eq('owner_id', user.id).maybeSingle()
  if (!tienda) return { exitosos: 0, errores: [{ fila: 0, mensaje: 'Tienda no encontrada' }] }

  const { data: existentes } = await supabase.from('productos').select('id, nombre').eq('tienda_id', tienda.id)
  const idEnDbPorNombreLower = new Map((existentes ?? []).map((p) => [p.nombre.toLowerCase().trim(), p.id]))

  const errores: { fila: number; mensaje: string }[] = []
  const filasValidas: Paso2Producto[] = []
  const batchNombreBaseYa = new Set<string>()

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i]
    const numFila = i + 2
    const nombre = fila['nombre']?.trim()
    const precio_venta = Number(fila['precio_venta'])
    const stock_actual = Number(fila['stock_actual'] ?? '0')
    const stock_minimo = Number(fila['stock_minimo'] ?? '0')
    const tipo = fila['tipo']?.trim() || 'Producto terminado'
    const sku = fila['sku']?.trim() || null
    const costo_produccion = Number(fila['costo_produccion'] ?? '0')
    const variante_nombre = fila['variante_nombre']?.trim()
    const variante_precio = Number(fila['variante_precio'] ?? '0')
    const variante_stock = Number(fila['variante_stock'] ?? '0')

    if (!nombre) {
      errores.push({ fila: numFila, mensaje: 'El campo "nombre" es obligatorio' })
      continue
    }

    const esFilaVariante = batchNombreBaseYa.has(nombre)

    if (!esFilaVariante && (isNaN(precio_venta) || precio_venta < 0)) {
      errores.push({ fila: numFila, mensaje: 'El precio de venta debe ser un número mayor o igual a 0' })
      continue
    }
    if (!esFilaVariante && !TIPOS_VALIDOS.includes(tipo)) {
      errores.push({
        fila: numFila,
        mensaje: `tipo inválido: "${tipo}". Válidos: ${TIPOS_VALIDOS.join(', ')}`,
      })
      continue
    }

    if (esFilaVariante && !variante_nombre) {
      filasValidas.push({ t: 'noop', fila: numFila })
      continue
    }

    if (esFilaVariante && variante_nombre) {
      filasValidas.push({
        t: 'variante',
        fila: numFila,
        nombre,
        variante_nombre,
        variante_precio: !isNaN(variante_precio) && variante_precio > 0 ? variante_precio : precio_venta || 0,
        variante_stock: !isNaN(variante_stock) ? variante_stock : 0,
      })
      continue
    }

    const existingProductoId = idEnDbPorNombreLower.get(nombre.toLowerCase()) ?? null

    const insert = {
      tienda_id: tienda.id,
      nombre,
      sku,
      tipo,
      precio_venta,
      costo_produccion: isNaN(costo_produccion) || costo_produccion <= 0 ? null : costo_produccion,
      stock_actual: variante_nombre ? 0 : isNaN(stock_actual) ? 0 : stock_actual,
      stock_minimo: isNaN(stock_minimo) ? 0 : stock_minimo,
      tiene_variantes: Boolean(variante_nombre),
    }

    const varianteMismaFila =
      variante_nombre != null && variante_nombre !== ''
        ? {
            nombre: variante_nombre,
            precio_venta:
              !isNaN(variante_precio) && variante_precio > 0 ? variante_precio : precio_venta || 0,
            stock_actual: !isNaN(variante_stock) ? variante_stock : 0,
          }
        : null

    filasValidas.push({
      t: 'base',
      fila: numFila,
      nombre,
      existingProductoId: existingProductoId,
      insert,
      varianteMismaFila,
    })
    batchNombreBaseYa.add(nombre)
  }

  if (errores.length > 0) {
    return {
      exitosos: 0,
      errores,
      mensaje: MENSAJE_ABORTO(errores.length),
    }
  }

  const idByNombre = new Map<string, string>()
  let exitosos = 0
  const erroresPaso2: { fila: number; mensaje: string }[] = []

  for (const op of filasValidas) {
    if (op.t === 'noop') {
      exitosos++
      continue
    }

    if (op.t === 'base') {
      let productoId = op.existingProductoId

      if (!productoId) {
        const { data: prod, error } = await supabase.from('productos').insert(op.insert).select('id').single()

        if (error) {
          if (error.code === '23505') {
            const { data: existente } = await supabase
              .from('productos')
              .select('id')
              .eq('tienda_id', tienda.id)
              .eq('nombre', op.nombre)
              .maybeSingle()
            if (existente) {
              productoId = existente.id
            } else {
              erroresPaso2.push({
                fila: op.fila,
                mensaje: `El producto "${op.nombre}" ya existe pero no se pudo recuperar`,
              })
              continue
            }
          } else {
            erroresPaso2.push({
              fila: op.fila,
              mensaje: `No se pudo guardar "${op.nombre}": ${error.message}`,
            })
            continue
          }
        } else {
          productoId = prod!.id
        }
      }

      if (!productoId) {
        continue
      }

      idByNombre.set(op.nombre, productoId)

      if (op.varianteMismaFila) {
        const { error: errVar } = await supabase.from('producto_variantes').insert({
          tienda_id: tienda.id,
          producto_id: productoId,
          nombre: op.varianteMismaFila.nombre,
          atributos: {},
          precio_venta: op.varianteMismaFila.precio_venta,
          stock_actual: op.varianteMismaFila.stock_actual,
          stock_minimo: 0,
          activa: true,
        })
        if (errVar) {
          erroresPaso2.push({
            fila: op.fila,
            mensaje: `No se pudo guardar la variante "${op.varianteMismaFila.nombre}" del producto "${op.nombre}": ${errVar.message}`,
          })
        } else {
          const { error: errUpdate } = await supabase
            .from('productos')
            .update({ tiene_variantes: true, stock_actual: 0 })
            .eq('id', productoId)
          if (errUpdate) {
            console.error('Error actualizando tiene_variantes:', errUpdate.message)
          }
          exitosos++
        }
      } else {
        exitosos++
      }
      continue
    }

    if (op.t === 'variante') {
      const productoId = idByNombre.get(op.nombre)
      if (!productoId) {
        erroresPaso2.push({
          fila: op.fila,
          mensaje: `No hay producto base en el archivo para "${op.nombre}" antes de esta variante.`,
        })
        continue
      }
      const { error: errVar } = await supabase.from('producto_variantes').insert({
        tienda_id: tienda.id,
        producto_id: productoId,
        nombre: op.variante_nombre,
        atributos: {},
        precio_venta: op.variante_precio,
        stock_actual: op.variante_stock,
        stock_minimo: 0,
        activa: true,
      })
      if (errVar) {
        erroresPaso2.push({
          fila: op.fila,
          mensaje: `No se pudo guardar la variante "${op.variante_nombre}" del producto "${op.nombre}": ${errVar.message}`,
        })
      } else {
        const { error: errUpdate } = await supabase
          .from('productos')
          .update({ tiene_variantes: true, stock_actual: 0 })
          .eq('id', productoId)
        if (errUpdate) {
          console.error('Error actualizando tiene_variantes:', errUpdate.message)
        }
        exitosos++
      }
    }
  }

  if (exitosos > 0) {
    revalidatePath('/productos')
    revalidatePath('/dashboard')
  }
  return { exitosos, errores: erroresPaso2 }
}
