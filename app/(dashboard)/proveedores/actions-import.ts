'use server'

import { requireEdit } from '@/lib/tienda-server'
import { revalidatePath } from 'next/cache'

const CATEGORIAS_VALIDAS = ['Producción', 'Empaque', 'Envíos', 'Marketing y publicidad', 'Otro']

const MENSAJE_ABORTO = (n: number) =>
  `Se encontraron ${n} error(es). No se importó ningún registro. Corrige los errores y vuelve a intentarlo.`

type FilaProveedorValida = {
  fila: number
  insert: {
    tienda_id: string
    nombre: string
    categorias: string[]
    telefono: string | null
    nit: string | null
    ciudad: string | null
  }
}

export async function importarProveedores(filas: Record<string, string>[]) {
  let ctx
  try {
    ctx = await requireEdit()
  } catch (e) {
    return { exitosos: 0, errores: [{ fila: 0, mensaje: e instanceof Error ? e.message : 'No autorizado' }] }
  }
  const { tienda_id, supabase } = ctx
  const tienda = { id: tienda_id }

  const errores: { fila: number; mensaje: string }[] = []
  const filasValidas: FilaProveedorValida[] = []

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i]
    const numFila = i + 2

    const nombre = fila['nombre']?.trim()
    if (!nombre) {
      errores.push({ fila: numFila, mensaje: 'El campo nombre es obligatorio' })
      continue
    }

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

    filasValidas.push({
      fila: numFila,
      insert: {
        tienda_id: tienda.id,
        nombre,
        categorias,
        telefono: fila['telefono']?.trim() || null,
        nit: fila['nit']?.trim() || null,
        ciudad: fila['ciudad']?.trim() || null,
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
    const { error } = await supabase.from('proveedores').insert(fv.insert)
    if (error) {
      erroresPaso2.push({
        fila: fv.fila,
        mensaje: error.message || `No se pudo guardar el proveedor "${fv.insert.nombre}". Intenta de nuevo.`,
      })
    } else {
      exitosos++
    }
  }

  if (exitosos > 0) revalidatePath('/proveedores')
  return { exitosos, errores: erroresPaso2 }
}
