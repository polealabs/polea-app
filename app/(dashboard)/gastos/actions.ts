'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getTienda() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data } = await supabase.from('tiendas').select('id').eq('owner_id', user.id).maybeSingle()
  if (!data) throw new Error('Tienda no encontrada')
  return { tienda_id: data.id, supabase }
}

export async function crearGasto(formData: FormData) {
  try {
    const { tienda_id, supabase } = await getTienda()
    const tipo_gasto = (formData.get('tipo_gasto') as string)?.trim() || null
    const subcategoria = (formData.get('subcategoria') as string)?.trim() || null
    const categoriaLibre = (formData.get('categoria') as string)?.trim() || null

    const { error } = await supabase.from('gastos').insert({
      tienda_id,
      descripcion: formData.get('descripcion') as string,
      monto: Number(formData.get('monto')),
      categoria: categoriaLibre || subcategoria || 'Otro',
      fecha: formData.get('fecha') as string,
      proveedor_id: (formData.get('proveedor_id') as string) || null,
      tipo_gasto: tipo_gasto || null,
      subcategoria: subcategoria || null,
    })

    if (error) return { error: error.message }
    revalidatePath('/gastos')
    revalidatePath('/dashboard')
    return { ok: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function actualizarGasto(id: string, formData: FormData) {
  try {
    const { tienda_id, supabase } = await getTienda()
    const tipo_gasto = (formData.get('tipo_gasto') as string)?.trim() || null
    const subcategoria = (formData.get('subcategoria') as string)?.trim() || null
    const categoriaLibre = (formData.get('categoria') as string)?.trim() || null

    const { error } = await supabase
      .from('gastos')
      .update({
        descripcion: (formData.get('descripcion') as string)?.trim(),
        monto: Number(formData.get('monto')),
        fecha: formData.get('fecha') as string,
        categoria: categoriaLibre || subcategoria || 'Otro',
        tipo_gasto: tipo_gasto || null,
        subcategoria: subcategoria || null,
        proveedor_id: (formData.get('proveedor_id') as string)?.trim() || null,
      })
      .eq('id', id)
      .eq('tienda_id', tienda_id)

    if (error) return { error: error.message }
    revalidatePath('/gastos')
    revalidatePath('/dashboard')
    return { ok: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function eliminarGasto(id: string) {
  try {
    const { tienda_id, supabase } = await getTienda()
    const { error } = await supabase
      .from('gastos')
      .delete()
      .eq('id', id)
      .eq('tienda_id', tienda_id)
    if (error) return { error: error.message }
    revalidatePath('/gastos')
    revalidatePath('/dashboard')
    return { ok: true as const }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}
