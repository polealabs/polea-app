'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const MENSAJE_ABORTO = (n: number) =>
  `Se encontraron ${n} error(es). No se importó ningún registro. Corrige los errores y vuelve a intentarlo.`

type FilaClienteValida = {
  fila: number
  insert: {
    tienda_id: string
    nombre: string
    telefono: string | null
    ciudad: string | null
    correo: string | null
    direccion: string | null
  }
}

export async function importarClientes(filas: Record<string, string>[]) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { exitosos: 0, errores: [{ fila: 0, mensaje: 'No autenticado' }] }

  const { data: tienda } = await supabase.from('tiendas').select('id').eq('owner_id', user.id).single()
  if (!tienda) return { exitosos: 0, errores: [{ fila: 0, mensaje: 'Tienda no encontrada' }] }

  const errores: { fila: number; mensaje: string }[] = []
  const filasValidas: FilaClienteValida[] = []

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i]
    const numFila = i + 2
    const nombre = fila['nombre']?.trim()
    if (!nombre) {
      errores.push({ fila: numFila, mensaje: 'El campo "nombre" es obligatorio' })
      continue
    }
    filasValidas.push({
      fila: numFila,
      insert: {
        tienda_id: tienda.id,
        nombre,
        telefono: fila['telefono']?.trim() || null,
        ciudad: fila['ciudad']?.trim() || null,
        correo: fila['correo']?.trim() || fila['email']?.trim() || null,
        direccion: fila['direccion']?.trim() || null,
      },
    })
  }

  if (errores.length > 0) {
    return {
      exitosos: 0,
      errores,
      mensaje: MENSAJE_ABORTO(errores.length),
    }
  }

  let exitosos = 0
  const erroresPaso2: { fila: number; mensaje: string }[] = []

  for (const fv of filasValidas) {
    const { error } = await supabase.from('clientes').insert(fv.insert)
    if (error) {
      erroresPaso2.push({
        fila: fv.fila,
        mensaje: `No se pudo guardar "${fv.insert.nombre}": ${error.message}`,
      })
    } else {
      exitosos++
    }
  }

  if (exitosos > 0) {
    revalidatePath('/clientes')
    revalidatePath('/dashboard')
  }
  return { exitosos, errores: erroresPaso2 }
}
