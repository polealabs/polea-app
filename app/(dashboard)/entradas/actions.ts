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

export async function crearEntradas(
  lineas: {
    producto_id: string
    proveedor_id?: string
    cantidad: number
    costo_unitario: number
    fecha: string
  }[]
) {
  try {
    const supabase = await createClient()
    const tienda_id = await getTiendaId()
    const rows = lineas.map((l) => ({ ...l, proveedor_id: l.proveedor_id || null, tienda_id }))
    const { error } = await supabase.from('entradas').insert(rows)
    if (error) return { error: error.message }
    revalidatePath('/entradas')
    revalidatePath('/productos')
    revalidatePath('/gastos')
    return { success: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function eliminarEntrada(id: string) {
  try {
    const supabase = await createClient()
    const tienda_id = await getTiendaId()
    const { error } = await supabase
      .from('entradas')
      .delete()
      .eq('id', id)
      .eq('tienda_id', tienda_id)
    if (error) return { error: error.message }
    revalidatePath('/entradas')
    revalidatePath('/productos')
    return { success: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}
