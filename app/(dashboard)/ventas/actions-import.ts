'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { calcularComisionMedioPago } from '@/lib/utils'
import { normalizarFecha } from '@/lib/csv'

const CANALES_VALIDOS = ['WhatsApp', 'Instagram', 'Web', 'Presencial', 'Tienda multimarca']

const MENSAJE_ABORTO = (n: number) =>
  `Se encontraron ${n} error(es). No se importó ningún registro. Corrige los errores y vuelve a intentarlo.`

type LineaVentaCalculada = {
  fila: number
  producto_id: string
  variante_id: string | null
  cantidad: number
  precio_venta: number
  descuento: number
  costo_transaccion: number
  neto: number
}

type GrupoVentaValido = {
  filasGrupo: number[]
  cabecera: {
    tienda_id: string
    cliente_id: string | null
    canal: string
    plataforma_pago: string
    medio_pago_id: string | null
    fecha: string
    total_bruto: number
    total_costo_transaccion: number
    total_neto: number
  }
  items: Omit<LineaVentaCalculada, 'fila'>[]
  /** Una fila CSV por ítem (para reportar errores de insert de ítems) */
  filasPorItem: number[]
}

export async function importarVentas(filas: Record<string, string>[]) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { exitosos: 0, errores: [{ fila: 0, mensaje: 'No autenticado' }] }

  const { data: tienda } = await supabase.from('tiendas').select('id').eq('owner_id', user.id).maybeSingle()
  if (!tienda) return { exitosos: 0, errores: [{ fila: 0, mensaje: 'Tienda no encontrada' }] }

  const { data: productos } = await supabase.from('productos').select('id, nombre').eq('tienda_id', tienda.id)
  const { data: clientes } = await supabase.from('clientes').select('id, nombre').eq('tienda_id', tienda.id)

  const mapProductos = new Map((productos ?? []).map((p) => [p.nombre.toLowerCase().trim(), p.id]))
  const mapClientes = new Map((clientes ?? []).map((c) => [c.nombre.toLowerCase().trim(), c.id]))

  const { data: mediosPago } = await supabase
    .from('medios_pago')
    .select('id, nombre, comision_porcentaje, tarifa_fija, cobra_iva')
    .eq('tienda_id', tienda.id)

  const nombresMedios = new Set((mediosPago ?? []).map((m) => m.nombre.toLowerCase().trim()))

  const mediosLegacy = new Set([
    'wompi',
    'bold',
    'transferencia',
    'efectivo',
    'nequi',
    'daviplata',
    'contraentrada',
    'contraentrega',
    'addi',
    'sistecredito',
    'redeban',
  ])

  const errores: { fila: number; mensaje: string }[] = []
  const gruposValidos: GrupoVentaValido[] = []

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
    const plataformaLower = plataforma.toLowerCase().trim()
    if (!plataformaLower) {
      erroresCabecera.push(
        'El campo "plataforma_pago" es obligatorio en la primera línea de cada venta (CSV).',
      )
    } else if (!nombresMedios.has(plataformaLower) && !mediosLegacy.has(plataformaLower)) {
      erroresCabecera.push(
        `La plataforma "${plataforma}" no está configurada en tus medios de pago. Verifica en Configuración → Medios de pago.`,
      )
    }
    if (!fechaNorm) {
      erroresCabecera.push('Fecha inválida. Formatos aceptados: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY')
    }

    if (erroresCabecera.length > 0) {
      lineas.forEach((l) => errores.push({ fila: l.fila, mensaje: erroresCabecera.join(', ') }))
      continue
    }

    const medioEncontrado = (mediosPago ?? []).find(
      (m) => m.nombre.toLowerCase().trim() === plataformaLower,
    )
    const medio_pago_id = medioEncontrado?.id ?? null

    const cliente_id = clienteNombre ? (mapClientes.get(clienteNombre.toLowerCase()) ?? null) : null

    const lineasCalculadas: LineaVentaCalculada[] = []
    let hayErrorLinea = false

    for (const { fila: numFila, datos } of lineas) {
      const productoNombre = datos['producto_nombre']?.trim()
      const variante_nombre = datos['variante_nombre']?.trim()
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
            mensaje: `No se encontró la variante "${variante_nombre}" para el producto "${productoNombre}".`,
          })
          hayErrorLinea = true
          continue
        }
      }

      const bruto = precio_venta * cantidad
      const descuentoTotal = Math.round(bruto * (descuento / 100))
      const base_neta = bruto - descuentoTotal
      lineasCalculadas.push({
        fila: numFila,
        producto_id,
        variante_id: variante_id || null,
        cantidad,
        precio_venta,
        descuento,
        costo_transaccion: 0,
        neto: base_neta,
      })
    }

    if (hayErrorLinea) continue

    // Calcular comisión a nivel de transacción con el medio de pago real configurado
    const subtotal = lineasCalculadas.reduce((s, l) => s + l.neto, 0)
    let comisionTotal = 0
    if (medioEncontrado && 'comision_porcentaje' in medioEncontrado) {
      const calc = calcularComisionMedioPago(subtotal, 0, medioEncontrado as {
        comision_porcentaje: number
        tarifa_fija: number
        cobra_iva: boolean
      })
      comisionTotal = calc.comision_total
    }
    const ratio = subtotal > 0 ? comisionTotal / subtotal : 0
    for (const l of lineasCalculadas) {
      l.costo_transaccion = Math.round(l.neto * ratio)
      l.neto = l.neto - l.costo_transaccion
    }

    const total_bruto = lineasCalculadas.reduce((s, l) => s + l.precio_venta * l.cantidad, 0)
    const total_costo_transaccion = comisionTotal
    const total_neto = subtotal - comisionTotal

    gruposValidos.push({
      filasGrupo: lineas.map((l) => l.fila),
      cabecera: {
        tienda_id: tienda.id,
        cliente_id,
        canal,
        plataforma_pago: plataforma,
        medio_pago_id,
        fecha: fechaNorm!,
        total_bruto,
        total_costo_transaccion,
        total_neto,
      },
      items: lineasCalculadas.map((l) => ({
        producto_id: l.producto_id,
        variante_id: l.variante_id,
        cantidad: l.cantidad,
        precio_venta: l.precio_venta,
        descuento: l.descuento,
        costo_transaccion: l.costo_transaccion,
        neto: l.neto,
      })),
      filasPorItem: lineasCalculadas.map((l) => l.fila),
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

  for (const g of gruposValidos) {
    const { data: cabecera, error: errCab } = await supabase
      .from('ventas_cabecera')
      .insert(g.cabecera)
      .select('id')
      .single()

    if (errCab) {
      g.filasGrupo.forEach((fila) =>
        erroresPaso2.push({
          fila,
          mensaje: errCab.message || 'No se pudo crear la venta. Intenta de nuevo.',
        }),
      )
      continue
    }

    const items = g.items.map((l) => ({
      ...l,
      cabecera_id: cabecera.id,
      tienda_id: tienda.id,
    }))
    const { error: errItems } = await supabase.from('venta_items').insert(items)
    if (errItems) {
      g.filasPorItem.forEach((fila) =>
        erroresPaso2.push({
          fila,
          mensaje: errItems.message || 'La venta se creó pero falló al guardar los productos. Contacta soporte.',
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
  return { exitosos, errores: erroresPaso2 }
}
