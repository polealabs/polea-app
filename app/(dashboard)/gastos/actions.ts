'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function crearGasto(formData: FormData) {
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

  const tipo_gasto = (formData.get('tipo_gasto') as string)?.trim() || null
  const subcategoria = (formData.get('subcategoria') as string)?.trim() || null
  const categoriaLibre = (formData.get('categoria') as string)?.trim() || null

  const { error } = await supabase.from('gastos').insert({
    tienda_id: tienda.id,
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
  return { ok: true }
}

export async function eliminarGasto(id: string) {
  const supabase = await createClient()
  await supabase.from('gastos').delete().eq('id', id)
  revalidatePath('/gastos')
}
