'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const TIPOS_VALIDOS = ['Producto terminado', 'Materia prima', 'Empaque', 'Material POP']

export async function importarProductos(filas: Record<string, string>[]) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { exitosos: 0, errores: [{ fila: 0, mensaje: 'No autenticado' }] }

  const { data: tienda } = await supabase.from('tiendas').select('id').eq('owner_id', user.id).single()
  if (!tienda) return { exitosos: 0, errores: [{ fila: 0, mensaje: 'Tienda no encontrada' }] }

  const errores: { fila: number; mensaje: string }[] = []
  let exitosos = 0
  const productoIdMap = new Map<string, string>()

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i]
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
      errores.push({ fila: i + 2, mensaje: 'El campo "nombre" es obligatorio' })
      continue
    }

    const esFilaVariante = productoIdMap.has(nombre)

    if (!esFilaVariante && (isNaN(precio_venta) || precio_venta < 0)) {
      errores.push({ fila: i + 2, mensaje: 'El precio de venta debe ser un número mayor o igual a 0' })
      continue
    }
    if (!esFilaVariante && !TIPOS_VALIDOS.includes(tipo)) {
      errores.push({
        fila: i + 2,
        mensaje: `tipo inválido: "${tipo}". Válidos: ${TIPOS_VALIDOS.join(', ')}`,
      })
      continue
    }

    let productoId: string
    if (productoIdMap.has(nombre)) {
      productoId = productoIdMap.get(nombre)!
    } else {
      const { data: prod, error } = await supabase
        .from('productos')
        .insert({
          tienda_id: tienda.id,
          nombre,
          sku,
          tipo,
          precio_venta,
          costo_produccion: isNaN(costo_produccion) || costo_produccion <= 0 ? null : costo_produccion,
          stock_actual: variante_nombre ? 0 : isNaN(stock_actual) ? 0 : stock_actual,
          stock_minimo: isNaN(stock_minimo) ? 0 : stock_minimo,
          tiene_variantes: Boolean(variante_nombre),
        })
        .select('id')
        .single()

      if (error) {
        if (error.code === '23505') {
          const { data: existente } = await supabase
            .from('productos')
            .select('id')
            .eq('tienda_id', tienda.id)
            .eq('nombre', nombre)
            .maybeSingle()

          if (existente) {
            productoId = existente.id
            productoIdMap.set(nombre, productoId)
          } else {
            errores.push({
              fila: i + 2,
              mensaje: `El producto "${nombre}" ya existe pero no se pudo recuperar`,
            })
            continue
          }
        } else {
          errores.push({ fila: i + 2, mensaje: `No se pudo guardar "${nombre}": ${error.message}` })
          continue
        }
      } else {
        productoId = prod!.id
        productoIdMap.set(nombre, productoId)
      }
    }

    if (esFilaVariante && !variante_nombre) {
      exitosos++
      continue
    }

    if (variante_nombre) {
      const { error: errVar } = await supabase.from('producto_variantes').insert({
        tienda_id: tienda.id,
        producto_id: productoId,
        nombre: variante_nombre,
        atributos: {},
        precio_venta: !isNaN(variante_precio) && variante_precio > 0 ? variante_precio : precio_venta || 0,
        stock_actual: !isNaN(variante_stock) ? variante_stock : 0,
        stock_minimo: 0,
        activa: true,
      })
      if (errVar) {
        errores.push({
          fila: i + 2,
          mensaje: `No se pudo guardar la variante "${variante_nombre}" del producto "${nombre}": ${errVar.message}`,
        })
        continue
      }
      await supabase.from('productos').update({ tiene_variantes: true, stock_actual: 0 }).eq('id', productoId)
    }
    exitosos++
  }

  if (exitosos > 0) {
    revalidatePath('/productos')
    revalidatePath('/dashboard')
  }
  return { exitosos, errores }
}
