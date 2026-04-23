'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { EstadoDocumento, ItemDocumento, TipoDocumento } from '@/lib/types'

async function getTienda() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data } = await supabase.from('tiendas').select('*').eq('owner_id', user.id).maybeSingle()
  if (!data) throw new Error('Tienda no encontrada')
  return { tienda: data, supabase }
}

async function generarNumero(
  tiendaId: string,
  tipo: string,
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
): Promise<string> {
  const anio = new Date().getFullYear()
  let { data: contador } = await supabase
    .from('contadores_documentos')
    .select('*')
    .eq('tienda_id', tiendaId)
    .maybeSingle()

  if (!contador) {
    const { data: nuevo } = await supabase
      .from('contadores_documentos')
      .insert({ tienda_id: tiendaId, cotizaciones: 0, cuentas_cobro: 0 })
      .select()
      .single()
    contador = nuevo
  }

  const campo = tipo === 'cotizacion' ? 'cotizaciones' : 'cuentas_cobro'
  const nuevoValor = (contador[campo] ?? 0) + 1

  await supabase.from('contadores_documentos').update({ [campo]: nuevoValor }).eq('tienda_id', tiendaId)
  const prefijo = tipo === 'cotizacion' ? 'COT' : 'CC'
  return `${prefijo}-${anio}-${String(nuevoValor).padStart(3, '0')}`
}

export async function crearDocumento(payload: {
  tipo: TipoDocumento
  cliente_id?: string
  destinatario_nombre: string
  destinatario_nit?: string
  destinatario_email?: string
  destinatario_telefono?: string
  destinatario_ciudad?: string
  concepto?: string
  items: ItemDocumento[]
  subtotal: number
  descuento: number
  total: number
  banco?: string
  tipo_cuenta?: string
  numero_cuenta?: string
  titular_cuenta?: string
  cedula_titular?: string
  fecha: string
  fecha_vencimiento?: string
  notas?: string
}) {
  try {
    const { tienda, supabase } = await getTienda()
    const numero = await generarNumero(tienda.id, payload.tipo, supabase)
    const { data: doc, error } = await supabase
      .from('documentos')
      .insert({
        tienda_id: tienda.id,
        numero,
        estado: 'borrador',
        ...payload,
        cliente_id: payload.cliente_id || null,
        destinatario_nit: payload.destinatario_nit || null,
        cedula_titular: payload.cedula_titular || null,
        items: JSON.stringify(payload.items),
      })
      .select()
      .single()

    if (error) return { error: error.message }
    revalidatePath('/documentos')
    return { ok: true, id: doc.id, numero }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function actualizarEstado(id: string, estado: EstadoDocumento) {
  try {
    const { tienda, supabase } = await getTienda()
    const { error } = await supabase
      .from('documentos')
      .update({ estado })
      .eq('id', id)
      .eq('tienda_id', tienda.id)
    if (error) return { error: error.message }
    revalidatePath('/documentos')
    return { ok: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function eliminarDocumento(id: string) {
  try {
    const { tienda, supabase } = await getTienda()
    await supabase.from('documentos').delete().eq('id', id).eq('tienda_id', tienda.id)
    revalidatePath('/documentos')
    return { ok: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function obtenerDocumento(id: string) {
  try {
    const { tienda, supabase } = await getTienda()
    const { data, error } = await supabase
      .from('documentos')
      .select('*')
      .eq('id', id)
      .eq('tienda_id', tienda.id)
      .single()
    if (error) return { error: error.message }
    return {
      ok: true,
      documento: {
        ...data,
        items: typeof data.items === 'string' ? JSON.parse(data.items) : data.items,
      },
      tienda,
    }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}
