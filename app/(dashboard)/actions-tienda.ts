'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function crearTienda(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const payload: {
    owner_id: string
    nombre: string
    ciudad: string
    categoria: string
    whatsapp: string
    moneda: string
    logo_url?: string
  } = {
    owner_id: user.id,
    nombre: String(formData.get('nombre') ?? '').trim(),
    ciudad: String(formData.get('ciudad') ?? '').trim(),
    categoria: String(formData.get('categoria') ?? '').trim(),
    whatsapp: String(formData.get('whatsapp') ?? '').trim(),
    moneda: String(formData.get('moneda') ?? 'COP').trim() || 'COP',
  }

  if (!payload.nombre) return { error: 'El nombre de la tienda es obligatorio' }
  if (!payload.categoria) return { error: 'La categoría de la tienda es obligatoria' }

  const logoFile = formData.get('logo') as File | null
  if (logoFile && logoFile.size > 0) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(logoFile.type)) {
      return { error: 'El logo debe ser JPG, PNG o WebP' }
    }
    if (logoFile.size > 2 * 1024 * 1024) {
      return { error: 'El logo no puede superar 2MB' }
    }

    const ext = logoFile.name.split('.').pop()
    const path = `${user.id}/logo.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(path, logoFile, { upsert: true })
    if (uploadError) return { error: 'Error al subir el logo' }

    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
    payload.logo_url = urlData.publicUrl
  }

  const { error } = await supabase.from('tiendas').insert(payload)

  if (error) return { error: error.message }
  redirect('/dashboard')
}
