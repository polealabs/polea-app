'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { TEMAS } from '@/lib/temas'

export async function actualizarTienda(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: tienda } = await supabase
    .from('tiendas')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!tienda) return { error: 'Tienda no encontrada' }

  const temaRecibido = (formData.get('tema') as string) || 'bosque'
  const temasValidos = new Set(TEMAS.map((t) => t.id))

  const updates: Record<string, string> = {
    nombre: (formData.get('nombre') as string)?.trim(),
    ciudad: (formData.get('ciudad') as string)?.trim() || '',
    whatsapp: (formData.get('whatsapp') as string)?.trim() || '',
    nit: (formData.get('nit') as string)?.trim() || '',
    representante: (formData.get('representante') as string)?.trim() || '',
    telefono: (formData.get('telefono') as string)?.trim() || '',
    email: (formData.get('email') as string)?.trim() || '',
    direccion: (formData.get('direccion') as string)?.trim() || '',
    categoria: (formData.get('categoria') as string)?.trim() || '',
    moneda: (formData.get('moneda') as string)?.trim() || 'COP',
    tema: temasValidos.has(temaRecibido) ? temaRecibido : 'bosque',
    tamano_letra: (formData.get('tamano_letra') as string) || 'normal',
  }

  if (!updates.nombre) return { error: 'El nombre de la tienda es obligatorio' }

  // El logo se sube desde el cliente (evita problemas de serialización de File en server actions).
  // El cliente pasa la URL resultante como campo logo_url (string).
  const logoUrl = (formData.get('logo_url') as string)?.trim()
  if (logoUrl) updates.logo_url = logoUrl

  const cobraIva = formData.get('cobra_iva') === 'true'

  const { error } = await supabase
    .from('tiendas')
    .update({ ...updates, cobra_iva: cobraIva })
    .eq('id', tienda.id)
  if (error) return { error: error.message }

  revalidatePath('/perfil')
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function actualizarPerfil(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase.from('perfiles').upsert({
    id: user.id,
    nombre: (formData.get('nombre_usuario') as string)?.trim() || null,
    updated_at: new Date().toISOString(),
  })

  if (error) return { error: error.message }
  revalidatePath('/perfil')
  return { ok: true }
}

export async function eliminarCuenta() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Eliminar tienda del owner (cascade debería limpiar datos relacionados)
  await supabase.from('tiendas').delete().eq('owner_id', user.id)

  // Eliminar membresías del usuario en otras tiendas
  await supabase.from('miembros').delete().eq('user_id', user.id)

  // Eliminar perfil
  await supabase.from('perfiles').delete().eq('id', user.id)

  // Eliminar usuario de Supabase Auth con cliente admin
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return { error: 'No se pudo eliminar la cuenta. Contacta soporte.' }

  redirect('/cuenta-eliminada')
}
