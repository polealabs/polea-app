'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function importarClientes(filas: Record<string, string>[]) {
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
    if (!nombre) {
      errores.push({ fila: i + 2, mensaje: 'El campo "nombre" es obligatorio' })
      continue
    }
    const { error } = await supabase.from('clientes').insert({
      tienda_id: tienda.id,
      nombre,
      telefono: fila['telefono']?.trim() || null,
      ciudad: fila['ciudad']?.trim() || null,
      correo: fila['correo']?.trim() || null,
    })
    if (error) {
      errores.push({
        fila: i + 2,
        mensaje: `No se pudo guardar el cliente "${fila['nombre']}". Intenta de nuevo.`,
      })
    } else {
      exitosos++
    }
  }

  if (exitosos > 0) {
    revalidatePath('/clientes')
    revalidatePath('/dashboard')
  }
  return { exitosos, errores }
}
