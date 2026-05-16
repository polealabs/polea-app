'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const MENSAJE_ABORTO = (n: number) =>
  `Se encontraron ${n} error(es). No se importó ningún registro. Corrige los errores y vuelve a intentarlo.`

export async function importarConsignatarias(filas: Record<string, string>[]) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { exitosos: 0, errores: [{ fila: 0, mensaje: 'No autenticado' }] }

  const { data: tienda } = await supabase.from('tiendas').select('id').eq('owner_id', user.id).maybeSingle()
  if (!tienda) return { exitosos: 0, errores: [{ fila: 0, mensaje: 'Tienda no encontrada' }] }

  const { data: existentes } = await supabase
    .from('tiendas_consignatarias')
    .select('nombre')
    .eq('tienda_id', tienda.id)
  const nombresExistentes = new Set((existentes ?? []).map((c) => c.nombre.toLowerCase().trim()))

  const errores: { fila: number; mensaje: string }[] = []
  const validas: {
    fila: number
    insert: {
      tienda_id: string
      nombre: string
      contacto: string | null
      telefono: string | null
      ciudad: string | null
      nit: string | null
      porcentaje_comision: number
      activa: boolean
    }
  }[] = []

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i]
    const numFila = i + 2

    const nombre = fila['nombre']?.trim()
    const contacto = fila['contacto']?.trim() || null
    const telefono = fila['telefono']?.trim() || null
    const ciudad = fila['ciudad']?.trim() || null
    const nit = fila['nit']?.trim() || null
    const comision = Number(fila['porcentaje_comision'] ?? '0')

    if (!nombre) {
      errores.push({ fila: numFila, mensaje: 'El campo "nombre" es obligatorio' })
      continue
    }
    if (nombresExistentes.has(nombre.toLowerCase())) {
      errores.push({ fila: numFila, mensaje: `La tienda "${nombre}" ya existe` })
      continue
    }
    if (isNaN(comision) || comision < 0 || comision > 100) {
      errores.push({
        fila: numFila,
        mensaje: `"porcentaje_comision" debe ser un número entre 0 y 100`,
      })
      continue
    }

    validas.push({
      fila: numFila,
      insert: {
        tienda_id: tienda.id,
        nombre,
        contacto,
        telefono,
        ciudad,
        nit,
        porcentaje_comision: comision,
        activa: true,
      },
    })
  }

  if (errores.length > 0) {
    return { exitosos: 0, errores, mensaje: MENSAJE_ABORTO(errores.length) }
  }

  let exitosos = 0
  const erroresPaso2: { fila: number; mensaje: string }[] = []

  for (const op of validas) {
    const { error } = await supabase.from('tiendas_consignatarias').insert(op.insert)
    if (error) {
      erroresPaso2.push({
        fila: op.fila,
        mensaje: `No se pudo guardar "${op.insert.nombre}": ${error.message}`,
      })
    } else {
      exitosos++
    }
  }

  if (exitosos > 0) revalidatePath('/consignaciones')
  return { exitosos, errores: erroresPaso2 }
}
