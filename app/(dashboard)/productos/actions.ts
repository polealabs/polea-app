'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getTiendaId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data } = await supabase
    .from('tiendas')
    .select('id')
    .eq('owner_id', user.id)
    .single()
  if (!data) throw new Error('Tienda no encontrada')
  return data.id
}

function normalizarNombre(v: FormDataEntryValue | null) {
  return String(v ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

function normalizarSku(v: FormDataEntryValue | null) {
  const s = String(v ?? '').trim()
  return s === '' ? null : s
}

async function assertNombreYSKUUnicos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tienda_id: string,
  nombre: string,
  sku: string | null,
  excluirProductoId?: string,
) {
  const base = () =>
    supabase.from('productos').select('id').eq('tienda_id', tienda_id).limit(1)

  const qNombre = base().ilike('nombre', nombre)
  const { data: dupNombre, error: e1 } = excluirProductoId
    ? await qNombre.neq('id', excluirProductoId)
    : await qNombre
  if (e1) return { error: e1.message as string }
  if (dupNombre && dupNombre.length > 0) {
    return {
      error: 'Ya existe otro producto con el mismo nombre en tu tienda.',
      warning: true as const,
    }
  }

  if (sku) {
    const qSku = base().eq('sku', sku)
    const { data: dupSku, error: e2 } = excluirProductoId
      ? await qSku.neq('id', excluirProductoId)
      : await qSku
    if (e2) return { error: e2.message as string }
    if (dupSku && dupSku.length > 0) {
      return {
        error: 'Ya existe otro producto con el mismo SKU en tu tienda.',
        warning: true as const,
      }
    }
  }

  return null
}

export async function crearProducto(formData: FormData) {
  try {
    const supabase = await createClient()
    const tienda_id = await getTiendaId()
    const nombre = normalizarNombre(formData.get('nombre'))
    const sku = normalizarSku(formData.get('sku'))
    if (!nombre) return { error: 'El nombre es obligatorio' }

    const duplicado = await assertNombreYSKUUnicos(supabase, tienda_id, nombre, sku)
    if (duplicado) return duplicado

    const { error } = await supabase.from('productos').insert({
      tienda_id,
      nombre,
      sku,
      tipo: formData.get('tipo') as string,
      precio_venta: Number(formData.get('precio_venta')),
      stock_minimo: Number(formData.get('stock_minimo')),
    })
    if (error) return { error: error.message }
    revalidatePath('/productos')
    return { success: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function editarProducto(id: string, formData: FormData) {
  try {
    const supabase = await createClient()
    const tienda_id = await getTiendaId()
    const nombre = normalizarNombre(formData.get('nombre'))
    const sku = normalizarSku(formData.get('sku'))
    if (!nombre) return { error: 'El nombre es obligatorio' }

    const duplicado = await assertNombreYSKUUnicos(supabase, tienda_id, nombre, sku, id)
    if (duplicado) return duplicado

    const { error } = await supabase
      .from('productos')
      .update({
        nombre,
        sku,
        tipo: formData.get('tipo') as string,
        precio_venta: Number(formData.get('precio_venta')),
        stock_minimo: Number(formData.get('stock_minimo')),
      })
      .eq('id', id)
      .eq('tienda_id', tienda_id)
    if (error) return { error: error.message }
    revalidatePath('/productos')
    return { success: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function eliminarProducto(id: string) {
  try {
    const supabase = await createClient()
    const tienda_id = await getTiendaId()
    const { error } = await supabase
      .from('productos')
      .delete()
      .eq('id', id)
      .eq('tienda_id', tienda_id)
    if (error) return { error: error.message }
    revalidatePath('/productos')
    return { success: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}
