'use server'

import { revalidatePath } from 'next/cache'
import { normalizarFecha } from '@/lib/csv'
import { requireFinanzas } from '@/lib/tienda-server'

const TIPOS_VALIDOS = ['variable', 'fijo', 'financiero', 'compra_inventario']

const MENSAJE_ABORTO = (n: number) =>
  `Se encontraron ${n} error(es). No se importó ningún registro. Corrige los errores y vuelve a intentarlo.`

type FilaGastoValida = {
  fila: number
  insert: {
    tienda_id: string
    descripcion: string
    monto: number
    categoria: string
    tipo_gasto: string
    fecha: string
  }
}

export async function importarGastos(filas: Record<string, string>[]) {
  let ctx
  try {
    ctx = await requireFinanzas()
  } catch (e) {
    return { exitosos: 0, errores: [{ fila: 0, mensaje: e instanceof Error ? e.message : 'No autorizado' }] }
  }
  const { tienda_id, supabase } = ctx
  const tienda = { id: tienda_id }

  const errores: { fila: number; mensaje: string }[] = []
  const filasValidas: FilaGastoValida[] = []

  for (let i = 0; i < filas.length; i++) {
    const numFila = i + 2
    const fila = filas[i]
    const fechaNorm = normalizarFecha(fila['fecha'])
    const descripcion = fila['descripcion']?.trim()
    const categoria = fila['categoria']?.trim() || 'Otro'
    const tipo = fila['tipo']?.trim().toLowerCase()
    const monto = Number(fila['monto'])

    if (!fechaNorm) {
      errores.push({
        fila: numFila,
        mensaje: 'Fecha inválida. Formatos aceptados: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY',
      })
      continue
    }
    if (!descripcion) {
      errores.push({ fila: numFila, mensaje: 'El campo "descripcion" es obligatorio' })
      continue
    }
    if (!tipo || !TIPOS_VALIDOS.includes(tipo)) {
      errores.push({
        fila: numFila,
        mensaje: `El tipo "${tipo ?? ''}" no es válido. Debe ser: variable, fijo, financiero o compra_inventario`,
      })
      continue
    }
    if (isNaN(monto) || monto < 0) {
      errores.push({ fila: numFila, mensaje: 'El monto debe ser un número mayor o igual a 0' })
      continue
    }

    filasValidas.push({
      fila: numFila,
      insert: {
        tienda_id: tienda.id,
        descripcion,
        monto,
        categoria,
        tipo_gasto: tipo,
        fecha: fechaNorm,
      },
    })
  }

  if (errores.length > 0) {
    return { exitosos: 0, errores, mensaje: MENSAJE_ABORTO(errores.length) }
  }

  let exitosos = 0
  const erroresPaso2: { fila: number; mensaje: string }[] = []

  for (const fv of filasValidas) {
    const { error } = await supabase.from('gastos').insert(fv.insert)
    if (error) {
      erroresPaso2.push({ fila: fv.fila, mensaje: error.message || 'No se pudo guardar el gasto.' })
    } else {
      exitosos++
    }
  }

  if (exitosos > 0) {
    revalidatePath('/gastos')
    revalidatePath('/dashboard')
  }
  return { exitosos, errores: erroresPaso2 }
}
