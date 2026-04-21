'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { normalizarFecha } from '@/lib/csv'

const CATEGORIAS_VALIDAS = ['Producción', 'Empaque', 'Envíos', 'Marketing', 'Plataformas', 'Otro']

export async function importarGastos(filas: Record<string, string>[]) {
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
    const numFila = i + 2
    const fila = filas[i]
    const descripcion = fila['descripcion']?.trim()
    const monto = Number(fila['monto'])
    const categoria = fila['categoria']?.trim()
    const fechaNorm = normalizarFecha(fila['fecha'])

    if (!descripcion) {
      errores.push({ fila: numFila, mensaje: 'El campo "descripcion" es obligatorio' })
      continue
    }
    if (isNaN(monto) || monto < 0) {
      errores.push({ fila: numFila, mensaje: 'El monto debe ser un número mayor o igual a 0' })
      continue
    }
    if (!categoria || !CATEGORIAS_VALIDAS.includes(categoria)) {
      errores.push({
        fila: numFila,
        mensaje: `La categoría "${categoria ?? ''}" no es válida. Debe ser una de: Producción, Empaque, Envíos, Marketing, Plataformas, Otro`,
      })
      continue
    }
    if (!fechaNorm) {
      errores.push({
        fila: numFila,
        mensaje: 'Fecha inválida. Formatos aceptados: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY',
      })
      continue
    }

    const { error } = await supabase.from('gastos').insert({
      tienda_id: tienda.id,
      descripcion,
      monto,
      categoria,
      fecha: fechaNorm,
    })

    if (error) {
      errores.push({ fila: numFila, mensaje: 'No se pudo guardar el gasto. Intenta de nuevo.' })
    } else {
      exitosos++
    }
  }

  if (exitosos > 0) {
    revalidatePath('/gastos')
    revalidatePath('/dashboard')
  }
  return { exitosos, errores }
}
