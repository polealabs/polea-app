'use server'

import { revalidatePath } from 'next/cache'
import { getTiendaContext, requireEdit } from '@/lib/tienda-server'

export async function obtenerPreferencias() {
  let ctx
  try {
    ctx = await getTiendaContext()
  } catch {
    return null
  }
  const { tienda_id, supabase } = ctx

  const { data } = await supabase.from('preferencias').select('*').eq('tienda_id', tienda_id).maybeSingle()

  if (!data) {
    const { data: nuevas } = await supabase
      .from('preferencias')
      .insert({ tienda_id })
      .select()
      .single()
    return nuevas
  }
  return data
}

export async function guardarPreferencias(formData: FormData) {
  try {
    const { tienda_id, supabase } = await requireEdit()

    const updates = {
      dias_cliente_recurrente: Number(formData.get('dias_cliente_recurrente')) || 30,
      alerta_cliente_recurrente: formData.get('alerta_cliente_recurrente') === 'true',
      dias_sin_compra_alerta: Number(formData.get('dias_sin_compra_alerta')) || 35,
      alerta_stock_bajo: formData.get('alerta_stock_bajo') === 'true',
      alerta_sin_movimiento: formData.get('alerta_sin_movimiento') === 'true',
      dias_sin_movimiento: Number(formData.get('dias_sin_movimiento')) || 30,
      alerta_ventas_bajas: formData.get('alerta_ventas_bajas') === 'true',
      porcentaje_alerta_ventas: Number(formData.get('porcentaje_alerta_ventas')) || 80,
      dias_max_devolucion: Number(formData.get('dias_max_devolucion')) || 30,
      registros_por_pagina: Number(formData.get('registros_por_pagina')) || 20,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('preferencias')
      .upsert({ tienda_id, ...updates }, { onConflict: 'tienda_id' })

    if (error) return { error: error.message }
    revalidatePath('/preferencias')
    return { ok: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}
