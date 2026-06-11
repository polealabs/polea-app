'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TipoMedioPago } from '@/lib/types'
import { requireEdit } from '@/lib/tienda-server'

async function getTienda() {
  const { tienda_id, supabase, canDelete } = await requireEdit()
  return { tienda_id, supabase, canDelete }
}

export async function crearMedioPago(payload: {
  nombre: string
  tipo: TipoMedioPago
  comision_porcentaje: number
  tarifa_fija: number
  cobra_iva: boolean
}) {
  try {
    const { tienda_id, supabase } = await getTienda()
    if (!payload.nombre.trim()) return { error: 'El nombre es obligatorio' }
    const { error } = await supabase.from('medios_pago').insert({
      tienda_id,
      ...payload,
    })
    if (error) return { error: error.message }
    revalidatePath('/configuracion/medios-pago')
    return { ok: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function editarMedioPago(
  id: string,
  payload: {
    nombre: string
    tipo: TipoMedioPago
    comision_porcentaje: number
    tarifa_fija: number
    cobra_iva: boolean
    activo: boolean
  },
) {
  try {
    const { tienda_id, supabase } = await getTienda()
    const { error } = await supabase.from('medios_pago').update(payload).eq('id', id).eq('tienda_id', tienda_id)
    if (error) return { error: error.message }
    revalidatePath('/configuracion/medios-pago')
    return { ok: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function eliminarMedioPago(id: string) {
  try {
    const { tienda_id, supabase, canDelete } = await getTienda()
    if (!canDelete) return { error: 'No tienes permisos para eliminar medios de pago' }
    await supabase.from('medios_pago').delete().eq('id', id).eq('tienda_id', tienda_id)
    revalidatePath('/configuracion/medios-pago')
    return { ok: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function getMediosPago(tienda_id: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('medios_pago')
      .select('*')
      .eq('tienda_id', tienda_id)
      .eq('activo', true)
      .order('nombre')
    if (error) return { error: error.message }
    return { ok: true as const, medios: data ?? [] }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function seedMediosPagoDefecto(tienda_id: string) {
  const supabase = await createClient()
  const defaults: {
    nombre: string
    tipo: TipoMedioPago
    comision_porcentaje: number
    tarifa_fija: number
    cobra_iva: boolean
  }[] = [
    { nombre: 'Efectivo', tipo: 'efectivo', comision_porcentaje: 0, tarifa_fija: 0, cobra_iva: false },
    { nombre: 'Transferencia', tipo: 'transferencia', comision_porcentaje: 0, tarifa_fija: 0, cobra_iva: false },
    { nombre: 'Nequi', tipo: 'nequi_daviplata', comision_porcentaje: 0, tarifa_fija: 0, cobra_iva: false },
    { nombre: 'Daviplata', tipo: 'nequi_daviplata', comision_porcentaje: 0, tarifa_fija: 0, cobra_iva: false },
    { nombre: 'Wompi', tipo: 'pasarela_web', comision_porcentaje: 2.99, tarifa_fija: 900, cobra_iva: true },
    { nombre: 'Bold', tipo: 'datafono', comision_porcentaje: 2.99, tarifa_fija: 0, cobra_iva: true },
  ]
  await supabase.from('medios_pago').insert(defaults.map((d) => ({ ...d, tienda_id })))
}
