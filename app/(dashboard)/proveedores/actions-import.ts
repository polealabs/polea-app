'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const CATEGORIAS_VALIDAS = ['Producción', 'Empaque', 'Envíos', 'Marketing', 'Plataformas', 'Otro']

export async function importarProveedores(filas: Record<string, string>[]) {
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
    const numFila = i + 2

    const nombre = fila['nombre']?.trim()
    if (!nombre) {
      errores.push({ fila: numFila, mensaje: 'El campo nombre es obligatorio' })
      continue
    }

    // categorias viene como string separado por | ej: "Producción|Empaque"
    const categoriasRaw = fila['categorias']?.trim() || ''
    const categorias = categoriasRaw
      .split('|')
      .map((c) => c.trim())
      .filter((c) => c !== '')

    if (categorias.length === 0) {
      errores.push({ fila: numFila, mensaje: 'Debes indicar al menos una categoría' })
      continue
    }

    const invalidas = categorias.filter((c) => !CATEGORIAS_VALIDAS.includes(c))
    if (invalidas.length > 0) {
      errores.push({
        fila: numFila,
        mensaje: `Categorías inválidas: ${invalidas.join(', ')}. Válidas: ${CATEGORIAS_VALIDAS.join(', ')}`,
      })
      continue
    }

    const { error } = await supabase.from('proveedores').insert({
      tienda_id: tienda.id,
      nombre,
      categorias,
      telefono: fila['telefono']?.trim() || null,
      nit: fila['nit']?.trim() || null,
      ciudad: fila['ciudad']?.trim() || null,
    })

    if (error) {
      errores.push({
        fila: numFila,
        mensaje: `No se pudo guardar el proveedor "${nombre}". Intenta de nuevo.`,
      })
      continue
    }
    exitosos++
  }

  if (exitosos > 0) revalidatePath('/proveedores')
  return { exitosos, errores }
}
