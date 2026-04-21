'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { calcularNetoConDescuento } from '@/lib/utils'
import { normalizarFecha } from '@/lib/csv'

const CANALES_VALIDOS = ['WhatsApp', 'Instagram', 'Web', 'Presencial', 'Tienda multimarca']
const PLATAFORMAS_VALIDAS = [
  'Wompi',
  'Bold',
  'Transferencia',
  'Efectivo',
  'Nequi',
  'Daviplata',
  'Contraentrega',
]

export async function importarVentas(filas: Record<string, string>[]) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { exitosos: 0, errores: [{ fila: 0, mensaje: 'No autenticado' }] }

  const { data: tienda } = await supabase.from('tiendas').select('id').eq('owner_id', user.id).single()
  if (!tienda) return { exitosos: 0, errores: [{ fila: 0, mensaje: 'Tienda no encontrada' }] }

  const { data: productos } = await supabase.from('productos').select('id, nombre').eq('tienda_id', tienda.id)
  const { data: clientes } = await supabase.from('clientes').select('id, nombre').eq('tienda_id', tienda.id)

  const mapProductos = new Map((productos ?? []).map((p) => [p.nombre.toLowerCase().trim(), p.id]))
  const mapClientes = new Map((clientes ?? []).map((c) => [c.nombre.toLowerCase().trim(), c.id]))

  const errores: { fila: number; mensaje: string }[] = []
  let exitosos = 0

  const grupos = new Map<string, { fila: number; datos: Record<string, string> }[]>()
  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i]
    const ventaId = fila['venta_id']?.trim()
    if (!ventaId) {
      errores.push({
        fila: i + 2,
        mensaje: 'El campo "venta_id" es obligatorio. Agrupa los productos de una misma venta con el mismo número.',
      })
      continue
    }
    if (!grupos.has(ventaId)) grupos.set(ventaId, [])
    grupos.get(ventaId)!.push({ fila: i + 2, datos: fila })
  }

  for (const [, lineas] of grupos) {
    const primera = lineas[0].datos
    const canal = primera['canal']?.trim() ?? ''
    const plataforma = primera['plataforma_pago']?.trim() ?? ''
    const fechaNorm = normalizarFecha(primera['fecha'])
    const clienteNombre = primera['cliente_nombre']?.trim()

    const erroresCabecera: string[] = []
    if (!CANALES_VALIDOS.includes(canal)) {
      erroresCabecera.push(
        `El canal "${canal}" no es válido. Debe ser uno de: WhatsApp, Instagram, Web, Presencial, Tienda multimarca`,
      )
    }
    if (!PLATAFORMAS_VALIDAS.includes(plataforma)) {
      erroresCabecera.push(
        `La plataforma "${plataforma}" no es válida. Debe ser una de: Wompi, Bold, Transferencia, Efectivo, Nequi, Daviplata, Contraentrega`,
      )
    }
    if (!fechaNorm) {
      erroresCabecera.push('Fecha inválida. Formatos aceptados: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY')
    }

    if (erroresCabecera.length > 0) {
      lineas.forEach((l) => errores.push({ fila: l.fila, mensaje: erroresCabecera.join(', ') }))
      continue
    }

    const cliente_id = clienteNombre ? (mapClientes.get(clienteNombre.toLowerCase()) ?? null) : null

    const lineasCalculadas: {
      producto_id: string
      cantidad: number
      precio_venta: number
      descuento: number
      costo_transaccion: number
      neto: number
    }[] = []
    let hayErrorLinea = false

    for (const { fila: numFila, datos } of lineas) {
      const productoNombre = datos['producto_nombre']?.trim()
      const cantidad = Number(datos['cantidad'])
      const precio_venta = Number(datos['precio_venta'])
      const descuento = Number(datos['descuento'] ?? 0)

      if (!productoNombre) {
        errores.push({ fila: numFila, mensaje: 'El campo "producto_nombre" es obligatorio' })
        hayErrorLinea = true
        continue
      }
      if (isNaN(cantidad) || cantidad <= 0 || !Number.isInteger(cantidad)) {
        errores.push({ fila: numFila, mensaje: 'La cantidad debe ser un número entero mayor a 0' })
        hayErrorLinea = true
        continue
      }
      if (isNaN(precio_venta) || precio_venta < 0) {
        errores.push({ fila: numFila, mensaje: 'El precio de venta debe ser un número mayor o igual a 0' })
        hayErrorLinea = true
        continue
      }
      if (isNaN(descuento) || descuento < 0 || descuento > 100) {
        errores.push({ fila: numFila, mensaje: 'El descuento debe ser un porcentaje entre 0 y 100' })
        hayErrorLinea = true
        continue
      }

      const producto_id = mapProductos.get(productoNombre.toLowerCase())
      if (!producto_id) {
        errores.push({
          fila: numFila,
          mensaje: `No se encontró ningún producto con el nombre "${productoNombre}". Verifica que el nombre coincida exactamente con el registrado en Productos.`,
        })
        hayErrorLinea = true
        continue
      }

      const { costoTransaccion, neto } = calcularNetoConDescuento(
        precio_venta,
        cantidad,
        descuento,
        plataforma
      )
      lineasCalculadas.push({
        producto_id,
        cantidad,
        precio_venta,
        descuento,
        costo_transaccion: costoTransaccion,
        neto,
      })
    }

    if (hayErrorLinea) continue

    const total_bruto = lineasCalculadas.reduce((s, l) => s + l.precio_venta * l.cantidad, 0)
    const total_costo_transaccion = lineasCalculadas.reduce((s, l) => s + l.costo_transaccion, 0)
    const total_neto = lineasCalculadas.reduce((s, l) => s + l.neto, 0)

    const { data: cabecera, error: errCab } = await supabase
      .from('ventas_cabecera')
      .insert({
        tienda_id: tienda.id,
        cliente_id,
        canal,
        plataforma_pago: plataforma,
        fecha: fechaNorm,
        total_bruto,
        total_costo_transaccion,
        total_neto,
      })
      .select('id')
      .single()

    if (errCab) {
      lineas.forEach((l) =>
        errores.push({ fila: l.fila, mensaje: 'No se pudo crear la venta. Intenta de nuevo.' }),
      )
      continue
    }

    const items = lineasCalculadas.map((l) => ({
      ...l,
      cabecera_id: cabecera.id,
      tienda_id: tienda.id,
    }))
    const { error: errItems } = await supabase.from('venta_items').insert(items)
    if (errItems) {
      lineas.forEach((l) =>
        errores.push({
          fila: l.fila,
          mensaje: 'La venta se creó pero falló al guardar los productos. Contacta soporte.',
        }),
      )
      continue
    }

    exitosos++
  }

  if (exitosos > 0) {
    revalidatePath('/ventas')
    revalidatePath('/productos')
    revalidatePath('/dashboard')
  }
  return { exitosos, errores }
}
