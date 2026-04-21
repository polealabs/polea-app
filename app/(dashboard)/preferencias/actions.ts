'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function obtenerPreferencias() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: tienda } = await supabase.from('tiendas').select('id').eq('owner_id', user.id).single()
  if (!tienda) return null

  const { data } = await supabase.from('preferencias').select('*').eq('tienda_id', tienda.id).maybeSingle()

  if (!data) {
    const { data: nuevas } = await supabase
      .from('preferencias')
      .insert({ tienda_id: tienda.id })
      .select()
      .single()
    return nuevas
  }
  return data
}

export async function guardarPreferencias(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: tienda } = await supabase.from('tiendas').select('id').eq('owner_id', user.id).single()
  if (!tienda) return { error: 'Tienda no encontrada' }

  const updates = {
    dias_cliente_recurrente: Number(formData.get('dias_cliente_recurrente')) || 30,
    alerta_cliente_recurrente: formData.get('alerta_cliente_recurrente') === 'true',
    dias_sin_compra_alerta: Number(formData.get('dias_sin_compra_alerta')) || 35,
    alerta_stock_bajo: formData.get('alerta_stock_bajo') === 'true',
    alerta_sin_movimiento: formData.get('alerta_sin_movimiento') === 'true',
    dias_sin_movimiento: Number(formData.get('dias_sin_movimiento')) || 30,
    alerta_ventas_bajas: formData.get('alerta_ventas_bajas') === 'true',
    porcentaje_alerta_ventas: Number(formData.get('porcentaje_alerta_ventas')) || 80,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('preferencias')
    .upsert({ tienda_id: tienda.id, ...updates }, { onConflict: 'tienda_id' })

  if (error) return { error: error.message }
  revalidatePath('/preferencias')
  return { ok: true }
}
