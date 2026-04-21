'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function crearCliente(formData: FormData) {
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

  const fechaCreacion = (formData.get('fecha_creacion') as string) || new Date().toISOString().split('T')[0]

  const { error } = await supabase.from('clientes').insert({
    tienda_id: tienda.id,
    nombre: formData.get('nombre') as string,
    telefono: (formData.get('telefono') as string) || null,
    ciudad: (formData.get('ciudad') as string) || null,
    correo: (formData.get('correo') as string) || null,
    fecha_creacion: fechaCreacion,
  })

  if (error) return { error: error.message }
  revalidatePath('/clientes')
  return { ok: true }
}

export async function editarCliente(id: string, formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('clientes')
    .update({
      nombre: formData.get('nombre') as string,
      telefono: (formData.get('telefono') as string) || null,
      ciudad: (formData.get('ciudad') as string) || null,
      correo: (formData.get('correo') as string) || null,
    })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/clientes')
  return { ok: true }
}

export async function eliminarCliente(id: string) {
  const supabase = await createClient()
  await supabase.from('clientes').delete().eq('id', id)
  revalidatePath('/clientes')
}
