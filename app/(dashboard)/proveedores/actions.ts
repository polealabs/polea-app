'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getTienda() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data } = await supabase.from('tiendas').select('id').eq('owner_id', user.id).single()
  if (!data) throw new Error('Tienda no encontrada')
  return { tienda_id: data.id, supabase }
}

export async function crearProveedor(formData: FormData) {
  try {
    const { tienda_id, supabase } = await getTienda()
    const nombre = (formData.get('nombre') as string)?.trim()
    if (!nombre) return { error: 'El nombre del proveedor es obligatorio' }
    const categorias = formData.getAll('categorias') as string[]
    if (!categorias.length || !categorias[0]) {
      return { error: 'Debes seleccionar al menos una categoría' }
    }

    const { error } = await supabase.from('proveedores').insert({
      tienda_id,
      nombre,
      categorias: categorias.filter((c) => c.trim() !== ''),
      telefono: (formData.get('telefono') as string)?.trim() || null,
      nit: (formData.get('nit') as string)?.trim() || null,
      ciudad: (formData.get('ciudad') as string)?.trim() || null,
    })
    if (error) return { error: error.message }
    revalidatePath('/proveedores')
    return { ok: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function editarProveedor(id: string, formData: FormData) {
  try {
    const { tienda_id, supabase } = await getTienda()
    const nombre = (formData.get('nombre') as string)?.trim()
    if (!nombre) return { error: 'El nombre del proveedor es obligatorio' }
    const categorias = formData.getAll('categorias') as string[]
    if (!categorias.length || !categorias[0]) {
      return { error: 'Debes seleccionar al menos una categoría' }
    }

    const { error } = await supabase
      .from('proveedores')
      .update({
        nombre,
        categorias: categorias.filter((c) => c.trim() !== ''),
        telefono: (formData.get('telefono') as string)?.trim() || null,
        nit: (formData.get('nit') as string)?.trim() || null,
        ciudad: (formData.get('ciudad') as string)?.trim() || null,
      })
      .eq('id', id)
      .eq('tienda_id', tienda_id)
    if (error) return { error: error.message }
    revalidatePath('/proveedores')
    return { ok: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function eliminarProveedor(id: string) {
  try {
    const { tienda_id, supabase } = await getTienda()
    await supabase.from('proveedores').delete().eq('id', id).eq('tienda_id', tienda_id)
    revalidatePath('/proveedores')
    return { ok: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}
