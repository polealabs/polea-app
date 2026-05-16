'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { normalizarFecha } from '@/lib/csv'

const MENSAJE_ABORTO = (n: number) =>
  `Se encontraron ${n} error(es). No se importó ningún registro. Corrige los errores y vuelve a intentarlo.`

type FilaEntradaValida = {
  fila: number
  insert: {
    tienda_id: string
    producto_id: string
    variante_id: string | null
    cantidad: number
    costo_unitario: number
    fecha: string
    proveedor_id: string | null
    notas: string | null
  }
  bumpVarianteStock: boolean
}

export async function importarEntradas(filas: Record<string, string>[]) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { exitosos: 0, errores: [{ fila: 0, mensaje: 'No autenticado' }] }

  const { data: tienda } = await supabase.from('tiendas').select('id').eq('owner_id', user.id).maybeSingle()
  if (!tienda) return { exitosos: 0, errores: [{ fila: 0, mensaje: 'Tienda no encontrada' }] }

  const { data: productos } = await supabase.from('productos').select('id, nombre').eq('tienda_id', tienda.id)
  const { data: proveedores } = await supabase.from('proveedores').select('id, nombre').eq('tienda_id', tienda.id)
  const mapProductos = new Map((productos ?? []).map((p) => [p.nombre.toLowerCase().trim(), p.id]))
  const mapProveedores = new Map((proveedores ?? []).map((p) => [p.nombre.toLowerCase().trim(), p.id]))

  const errores: { fila: number; mensaje: string }[] = []
  const filasValidas: FilaEntradaValida[] = []

  for (let i = 0; i < filas.length; i++) {
    const numFila = i + 2
    const fila = filas[i]
    const productoNombre = fila['producto_nombre']?.trim()
    const variante_nombre = fila['variante_nombre']?.trim() ?? ''
    const proveedorNombre = fila['proveedor_nombre']?.trim() ?? ''
    const notasRaw = fila['notas']?.trim() ?? ''
    const cantidad = Number(fila['cantidad'])
    const costo_unitario = Number(fila['costo_unitario'])
    const fechaNorm = normalizarFecha(fila['fecha'])

    if (!productoNombre) {
      errores.push({ fila: numFila, mensaje: 'El campo "producto_nombre" es obligatorio' })
      continue
    }
    if (isNaN(cantidad) || cantidad <= 0 || !Number.isInteger(cantidad)) {
      errores.push({ fila: numFila, mensaje: 'La cantidad debe ser un número entero mayor a 0' })
      continue
    }
    if (isNaN(costo_unitario) || costo_unitario < 0) {
      errores.push({ fila: numFila, mensaje: 'El costo unitario debe ser un número mayor o igual a 0' })
      continue
    }
    if (!fechaNorm) {
      errores.push({
        fila: numFila,
        mensaje: 'Fecha inválida. Formatos aceptados: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY',
      })
      continue
    }

    const producto_id = mapProductos.get(productoNombre.toLowerCase())
    if (!producto_id) {
      errores.push({
        fila: numFila,
        mensaje: `No se encontró ningún producto con el nombre "${productoNombre}". Verifica que el nombre coincida exactamente con el registrado en Productos.`,
      })
      continue
    }

    let variante_id: string | null = null
    if (variante_nombre) {
      const { data: variante } = await supabase
        .from('producto_variantes')
        .select('id')
        .eq('producto_id', producto_id)
        .eq('nombre', variante_nombre)
        .maybeSingle()
      if (variante) {
        variante_id = variante.id
      } else {
        errores.push({
          fila: numFila,
          mensaje: `Variante "${variante_nombre}" no encontrada para "${productoNombre}"`,
        })
        continue
      }
    }

    let proveedor_id: string | null = null
    if (proveedorNombre) {
      const idProv = mapProveedores.get(proveedorNombre.toLowerCase())
      if (!idProv) {
        errores.push({
          fila: numFila,
          mensaje: `No se encontró ningún proveedor con el nombre "${proveedorNombre}". Verifica que el nombre coincida exactamente con el registrado en Proveedores.`,
        })
        continue
      }
      proveedor_id = idProv
    }

    filasValidas.push({
      fila: numFila,
      insert: {
        tienda_id: tienda.id,
        producto_id,
        variante_id: variante_id || null,
        cantidad,
        costo_unitario,
        fecha: fechaNorm,
        proveedor_id,
        notas: notasRaw || null,
      },
      bumpVarianteStock: Boolean(variante_id),
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
    const { data: entradaInsertada, error } = await supabase
      .from('entradas')
      .insert(fv.insert)
      .select('id')
      .single()

    if (error) {
      erroresPaso2.push({
        fila: fv.fila,
        mensaje: error.message || 'No se pudo guardar la entrada. Intenta de nuevo.',
      })
      continue
    }

    if (fv.bumpVarianteStock && fv.insert.variante_id && entradaInsertada) {
      const vid = fv.insert.variante_id
      const { data: variante } = await supabase
        .from('producto_variantes')
        .select('stock_actual')
        .eq('id', vid)
        .single()
      if (variante) {
        await supabase
          .from('producto_variantes')
          .update({
            stock_actual: variante.stock_actual + fv.insert.cantidad,
          })
          .eq('id', vid)
      }
    }
    exitosos++
  }

  if (exitosos > 0) {
    revalidatePath('/entradas')
    revalidatePath('/productos')
    revalidatePath('/dashboard')
  }
  return { exitosos, errores: erroresPaso2 }
}
