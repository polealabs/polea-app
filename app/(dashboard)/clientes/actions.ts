'use server'

import { revalidatePath } from 'next/cache'
import { requireEdit, requireDelete } from '@/lib/tienda-server'

export async function crearCliente(formData: FormData) {
  try {
    const { tienda_id, supabase } = await requireEdit()

    const fechaCreacion = (formData.get('fecha_creacion') as string) || new Date().toISOString().split('T')[0]

    const { error } = await supabase.from('clientes').insert({
      tienda_id,
      nombre: formData.get('nombre') as string,
      telefono: (formData.get('telefono') as string) || null,
      direccion: (formData.get('direccion') as string)?.trim() || null,
      ciudad: (formData.get('ciudad') as string) || null,
      correo: (formData.get('correo') as string) || null,
      fecha_creacion: fechaCreacion,
    })

    if (error) return { error: error.message }
    revalidatePath('/clientes')
    return { ok: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function editarCliente(id: string, formData: FormData) {
  try {
    const { tienda_id, supabase } = await requireEdit()

    const { error } = await supabase
      .from('clientes')
      .update({
        nombre: formData.get('nombre') as string,
        telefono: (formData.get('telefono') as string) || null,
        direccion: (formData.get('direccion') as string)?.trim() || null,
        ciudad: (formData.get('ciudad') as string) || null,
        correo: (formData.get('correo') as string) || null,
      })
      .eq('id', id)
      .eq('tienda_id', tienda_id)

    if (error) return { error: error.message }
    revalidatePath('/clientes')
    return { ok: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function eliminarCliente(id: string) {
  try {
    const { tienda_id, supabase } = await requireDelete()
    await supabase.from('clientes').delete().eq('id', id).eq('tienda_id', tienda_id)
    revalidatePath('/clientes')
  } catch {
    // sin permisos o sin sesión: no-op
  }
}
