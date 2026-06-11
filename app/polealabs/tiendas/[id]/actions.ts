'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verificarAdmin } from '@/lib/auth-admin'
import { revalidatePath } from 'next/cache'

export async function actualizarBeta(tiendaId: string, data: { es_beta: boolean; beta_hasta: string | null }) {
  try {
    await verificarAdmin()
    const supabase = createAdminClient()
    const { error } = await supabase.from('tiendas').update(data).eq('id', tiendaId)
    if (error) return { error: error.message }
    revalidatePath(`/polealabs/tiendas/${tiendaId}`)
    revalidatePath('/polealabs/tiendas')
    return { ok: true as const }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}
