'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verificarAdmin } from '@/lib/auth-admin'
import { revalidatePath } from 'next/cache'

export async function crearPlan(data: {
  nombre: string
  descripcion: string
  precio_mensual: number
  precio_anual: number
  descuento_anual_porcentaje: number
  max_productos: number | null
  max_miembros: number | null
  funcionalidades: string[]
  orden: number
}) {
  try {
    await verificarAdmin()
    const supabase = createAdminClient()
    const { error } = await supabase.from('planes').insert({ ...data, activo: true })
    if (error) return { error: error.message }
    revalidatePath('/polealabs/planes')
    return { ok: true as const }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function actualizarPlan(
  id: string,
  data: {
    nombre: string
    descripcion: string
    precio_mensual: number
    precio_anual: number
    descuento_anual_porcentaje: number
    max_productos: number | null
    max_miembros: number | null
    funcionalidades: string[]
    activo: boolean
    orden: number
  },
) {
  try {
    await verificarAdmin()
    const supabase = createAdminClient()
    const { error } = await supabase.from('planes').update(data).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/polealabs/planes')
    return { ok: true as const }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function eliminarPlan(id: string) {
  try {
    await verificarAdmin()
    const supabase = createAdminClient()
    const { error } = await supabase.from('planes').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/polealabs/planes')
    return { ok: true as const }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}
