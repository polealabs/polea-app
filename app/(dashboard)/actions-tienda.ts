'use server'

import { createClient } from '@/lib/supabase/server'

export async function crearTienda(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Sesión expirada. Recarga la página e inicia sesión de nuevo.' }

  const payload: {
    owner_id: string
    nombre: string
    ciudad: string
    direccion: string
    categoria: string
    whatsapp: string
    moneda: string
    cobra_iva: boolean
    logo_url?: string
  } = {
    owner_id: user.id,
    nombre: String(formData.get('nombre') ?? '').trim(),
    ciudad: String(formData.get('ciudad') ?? '').trim(),
    direccion: String(formData.get('direccion') ?? '').trim(),
    categoria: String(formData.get('categoria') ?? '').trim(),
    whatsapp: String(formData.get('whatsapp') ?? '').trim(),
    moneda: String(formData.get('moneda') ?? 'COP').trim() || 'COP',
    cobra_iva: formData.get('cobra_iva') === 'true',
  }

  if (!payload.nombre) return { error: 'El nombre de la tienda es obligatorio' }
  if (!payload.categoria) return { error: 'La categoría de la tienda es obligatoria' }

  // El logo se sube desde el cliente (evita problemas de serialización de File en server actions).
  // El onboarding pasa la URL resultante como campo logo_url (string).
  const logoUrl = (formData.get('logo_url') as string)?.trim()
  if (logoUrl) payload.logo_url = logoUrl

  const { error } = await supabase.from('tiendas').insert(payload)

  if (error) return { error: error.message }
  return { ok: true as const }
}
