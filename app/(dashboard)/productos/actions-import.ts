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

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i]
    const nombre = fila['nombre']?.trim()
    const precio_venta = Number(fila['precio_venta'])
    const stock_actual = Number(fila['stock_inicial'] ?? '0')
    const stock_minimo = Number(fila['stock_minimo'] ?? '0')
    const tipo = fila['tipo']?.trim() || 'Producto terminado'
    const sku = fila['sku']?.trim() || null

    if (!nombre) {
      errores.push({ fila: i + 2, mensaje: 'El campo "nombre" es obligatorio' })
      continue
    }
    if (isNaN(precio_venta) || precio_venta < 0) {
      errores.push({ fila: i + 2, mensaje: 'El precio de venta debe ser un número mayor o igual a 0' })
      continue
    }
    if (!TIPOS_VALIDOS.includes(tipo)) {
      errores.push({
        fila: i + 2,
        mensaje: `tipo inválido: "${tipo}". Válidos: ${TIPOS_VALIDOS.join(', ')}`,
      })
      continue
    }

    const { error } = await supabase.from('productos').insert({
      tienda_id: tienda.id,
      nombre,
      sku,
      tipo,
      precio_venta,
      stock_actual: isNaN(stock_actual) ? 0 : stock_actual,
      stock_minimo: isNaN(stock_minimo) ? 0 : stock_minimo,
    })

    if (error) {
      if (error.code === '23505') {
        errores.push({ fila: i + 2, mensaje: `El producto "${nombre}" ya existe en tu catálogo` })
      } else {
        errores.push({ fila: i + 2, mensaje: `No se pudo guardar el producto "${nombre}". Intenta de nuevo.` })
      }
    } else {
      exitosos++
    }
  }

  if (exitosos > 0) {
    revalidatePath('/productos')
    revalidatePath('/dashboard')
  }
  return { exitosos, errores }
}
