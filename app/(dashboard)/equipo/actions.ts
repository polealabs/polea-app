'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'crypto'

async function getOwnerTienda() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: tienda } = await supabase.from('tiendas').select('id').eq('owner_id', user.id).single()
  if (!tienda) throw new Error('Solo el dueño puede gestionar el equipo')
  return { tienda_id: tienda.id, user_id: user.id, supabase }
}

export async function invitarMiembro(formData: FormData) {
  try {
    const { tienda_id, user_id, supabase } = await getOwnerTienda()
    const email = (formData.get('email') as string)?.trim().toLowerCase()
    const rol = formData.get('rol') as string

    if (!email) return { error: 'El email es obligatorio' }
    if (!['admin', 'vendedor', 'readonly'].includes(rol)) return { error: 'Rol inválido' }

    // Verificar si ya existe una invitación pendiente para este email
    const { data: invExistente } = await supabase
      .from('invitaciones')
      .select('id')
      .eq('tienda_id', tienda_id)
      .eq('email', email)
      .eq('aceptada', false)
      .maybeSingle()

    if (invExistente) return { error: 'Ya existe una invitación pendiente para este email' }

    // Verificar si el usuario ya existe en Auth (dato opcional informativo)
    const { data: userExistente } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    const yaRegistrado = Boolean(userExistente)
    void yaRegistrado

    const token = randomBytes(32).toString('hex')

    const { error } = await supabase.from('invitaciones').insert({
      tienda_id,
      email,
      rol,
      token,
      invitado_por: user_id,
    })

    if (error) return { error: error.message }
    revalidatePath('/equipo')
    return { ok: true, token }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function cambiarRol(miembroId: string, nuevoRol: string) {
  try {
    const { tienda_id, supabase } = await getOwnerTienda()
    if (!['admin', 'vendedor', 'readonly'].includes(nuevoRol)) return { error: 'Rol inválido' }

    const { error } = await supabase
      .from('miembros')
      .update({ rol: nuevoRol })
      .eq('id', miembroId)
      .eq('tienda_id', tienda_id)

    if (error) return { error: error.message }
    revalidatePath('/equipo')
    return { ok: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function eliminarMiembro(miembroId: string) {
  try {
    const { tienda_id, supabase } = await getOwnerTienda()
    const { error } = await supabase
      .from('miembros')
      .delete()
      .eq('id', miembroId)
      .eq('tienda_id', tienda_id)

    if (error) return { error: error.message }
    revalidatePath('/equipo')
    return { ok: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function cancelarInvitacion(invitacionId: string) {
  try {
    const { tienda_id, supabase } = await getOwnerTienda()
    const { error } = await supabase
      .from('invitaciones')
      .delete()
      .eq('id', invitacionId)
      .eq('tienda_id', tienda_id)

    if (error) return { error: error.message }
    revalidatePath('/equipo')
    return { ok: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function aceptarInvitacion(token: string) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: 'Debes iniciar sesión para aceptar la invitación' }

    const { data: inv } = await supabase
      .from('invitaciones')
      .select('*')
      .eq('token', token)
      .eq('aceptada', false)
      .maybeSingle()

    if (!inv) return { error: 'Invitación inválida o ya fue usada' }
    if (new Date(inv.expires_at) < new Date()) return { error: 'La invitación expiró' }
    if (inv.email !== user.email) return { error: `Esta invitación es para ${inv.email}` }

    // Verificar que no sea ya miembro
    const { data: yaEsMiembro } = await supabase
      .from('miembros')
      .select('id')
      .eq('tienda_id', inv.tienda_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (yaEsMiembro) return { error: 'Ya eres miembro de esta tienda' }

    // Crear membresía
    const { error: errMiembro } = await supabase.from('miembros').insert({
      tienda_id: inv.tienda_id,
      user_id: user.id,
      rol: inv.rol,
      invitado_por: inv.invitado_por,
    })

    if (errMiembro) return { error: errMiembro.message }

    // Marcar invitación como aceptada
    await supabase.from('invitaciones').update({ aceptada: true }).eq('id', inv.id)

    return { ok: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}
