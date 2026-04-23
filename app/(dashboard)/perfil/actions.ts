'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
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
    .single()
  if (!tienda) return { error: 'Tienda no encontrada' }

  const temaRecibido = (formData.get('tema') as string) || 'bosque'
  const temasValidos = new Set(TEMAS.map((t) => t.id))

  const updates: Record<string, string> = {
    nombre: (formData.get('nombre') as string)?.trim(),
    ciudad: (formData.get('ciudad') as string)?.trim() || '',
    whatsapp: (formData.get('whatsapp') as string)?.trim() || '',
    categoria: (formData.get('categoria') as string)?.trim() || '',
    moneda: (formData.get('moneda') as string)?.trim() || 'COP',
    tema: temasValidos.has(temaRecibido) ? temaRecibido : 'bosque',
  }

  if (!updates.nombre) return { error: 'El nombre de la tienda es obligatorio' }

  const logoFile = formData.get('logo') as File | null
  if (logoFile && logoFile.size > 0) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(logoFile.type)) {
      return { error: 'El logo debe ser JPG, PNG o WebP' }
    }
    if (logoFile.size > 2 * 1024 * 1024) {
      return { error: 'El logo no puede superar 2MB' }
    }

    const ext = logoFile.name.split('.').pop()
    const path = `${tienda.id}/logo.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(path, logoFile, { upsert: true })

    if (uploadError) return { error: 'Error al subir el logo' }

    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
    updates.logo_url = urlData.publicUrl
  }

  const { error } = await supabase.from('tiendas').update(updates).eq('id', tienda.id)
  if (error) return { error: error.message }

  revalidatePath('/perfil')
  revalidatePath('/dashboard')
  return { ok: true }
}
