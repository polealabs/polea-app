'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getClienteInfo() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: tienda } = await supabase.from('tiendas').select('id').eq('owner_id', user.id).maybeSingle()
  if (!tienda) throw new Error('Tienda no encontrada')
  return { tienda_id: tienda.id, supabase }
}

export async function crearCaso(titulo: string, mensaje: string) {
  try {
    const { tienda_id, supabase } = await getClienteInfo()
    const { data: caso, error: errorCaso } = await supabase
      .from('casos_soporte')
      .insert({ tienda_id, titulo, estado: 'abierto' })
      .select('id')
      .single()
    if (errorCaso) return { error: errorCaso.message }
    const { error: errorMsg } = await supabase
      .from('mensajes_soporte')
      .insert({ caso_id: caso.id, tienda_id, autor: 'cliente', mensaje })
    if (errorMsg) return { error: errorMsg.message }
    return { ok: true as const, caso_id: caso.id }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function enviarMensajeCliente(caso_id: string, mensaje: string) {
  try {
    const { tienda_id, supabase } = await getClienteInfo()
    const { error } = await supabase
      .from('mensajes_soporte')
      .insert({ caso_id, tienda_id, autor: 'cliente', mensaje })
    if (error) return { error: error.message }
    await supabase
      .from('casos_soporte')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', caso_id)
    return { ok: true as const }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function getCasos() {
  try {
    const { tienda_id, supabase } = await getClienteInfo()
    const { data, error } = await supabase
      .from('casos_soporte')
      .select('id, titulo, estado, created_at, updated_at')
      .eq('tienda_id', tienda_id)
      .order('updated_at', { ascending: false })
    if (error) return { error: error.message }
    return { ok: true as const, casos: data ?? [] }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function getMensajes(caso_id: string) {
  try {
    const { supabase } = await getClienteInfo()
    const { data, error } = await supabase
      .from('mensajes_soporte')
      .select('id, autor, mensaje, created_at')
      .eq('caso_id', caso_id)
      .order('created_at', { ascending: true })
    if (error) return { error: error.message }
    return { ok: true as const, mensajes: data ?? [] }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function marcarCasoResuelto(caso_id: string) {
  try {
    const { supabase } = await getClienteInfo()
    const { error } = await supabase
      .from('casos_soporte')
      .update({ estado: 'resuelto', updated_at: new Date().toISOString() })
      .eq('id', caso_id)
    if (error) return { error: error.message }
    revalidatePath('/dashboard')
    return { ok: true as const }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}
