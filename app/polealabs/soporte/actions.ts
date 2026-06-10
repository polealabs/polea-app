'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function verificarAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: admin } = await supabase.from('admins').select('id').eq('email', user.email ?? '').maybeSingle()
  if (!admin) throw new Error('No autorizado')
}

export async function responderCaso(caso_id: string, tienda_id: string, mensaje: string) {
  try {
    await verificarAdmin()
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('mensajes_soporte')
      .insert({ caso_id, tienda_id, autor: 'admin', mensaje })
    if (error) return { error: error.message }
    await supabase
      .from('casos_soporte')
      .update({ estado: 'en_proceso', updated_at: new Date().toISOString() })
      .eq('id', caso_id)
      .eq('estado', 'abierto')
    revalidatePath('/polealabs/soporte')
    revalidatePath(`/polealabs/soporte/${caso_id}`)
    return { ok: true as const }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function cambiarEstadoCaso(caso_id: string, estado: 'abierto' | 'en_proceso' | 'resuelto') {
  try {
    await verificarAdmin()
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('casos_soporte')
      .update({ estado, updated_at: new Date().toISOString() })
      .eq('id', caso_id)
    if (error) return { error: error.message }
    revalidatePath('/polealabs/soporte')
    revalidatePath(`/polealabs/soporte/${caso_id}`)
    return { ok: true as const }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}
