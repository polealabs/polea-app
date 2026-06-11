import { createClient } from '@/lib/supabase/server'
import type { Rol } from '@/lib/types'

export interface TiendaContext {
  supabase: Awaited<ReturnType<typeof createClient>>
  tienda_id: string
  user_id: string
  email: string | null
  rol: Rol
  isOwner: boolean
  isAdmin: boolean
  isVendedor: boolean
  isReadonly: boolean
  canEdit: boolean
  canDelete: boolean
  canViewFinanzas: boolean
}

/**
 * Resuelve la tienda del usuario actual buscando primero como owner y luego
 * como miembro, y devuelve su rol + permisos derivados.
 *
 * Reemplaza los helpers locales `getTienda`/`getTiendaId` que resolvian solo
 * con `owner_id = user.id`, lo que dejaba a los miembros invitados sin poder
 * operar ("Tienda no encontrada"). Los permisos espejan a `useTienda` (cliente)
 * para que el gate del servidor coincida con lo que ve la UI.
 */
export async function getTiendaContext(): Promise<TiendaContext> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  let tienda_id: string
  let rol: Rol

  const { data: tiendaOwner } = await supabase
    .from('tiendas')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (tiendaOwner) {
    tienda_id = tiendaOwner.id
    rol = 'owner'
  } else {
    const { data: membresia } = await supabase
      .from('miembros')
      .select('tienda_id, rol')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!membresia) throw new Error('Tienda no encontrada')
    tienda_id = membresia.tienda_id
    rol = membresia.rol as Rol
  }

  const isOwner = rol === 'owner'
  const isAdmin = rol === 'admin'
  const isVendedor = rol === 'vendedor'
  const isReadonly = rol === 'readonly'

  return {
    supabase,
    tienda_id,
    user_id: user.id,
    email: user.email ?? null,
    rol,
    isOwner,
    isAdmin,
    isVendedor,
    isReadonly,
    canEdit: isOwner || isAdmin || isVendedor,
    canDelete: isOwner || isAdmin,
    canViewFinanzas: isOwner || isAdmin,
  }
}

/** Resuelve la tienda y exige permiso de edición (bloquea readonly). */
export async function requireEdit(): Promise<TiendaContext> {
  const ctx = await getTiendaContext()
  if (!ctx.canEdit) throw new Error('No tienes permisos para realizar esta acción')
  return ctx
}

/** Resuelve la tienda y exige permiso de eliminación (bloquea vendedor y readonly). */
export async function requireDelete(): Promise<TiendaContext> {
  const ctx = await getTiendaContext()
  if (!ctx.canDelete) throw new Error('No tienes permisos para eliminar')
  return ctx
}

/** Resuelve la tienda y exige acceso a finanzas (solo owner/admin). */
export async function requireFinanzas(): Promise<TiendaContext> {
  const ctx = await getTiendaContext()
  if (!ctx.canViewFinanzas) throw new Error('No tienes permisos para ver finanzas')
  return ctx
}

/** Resuelve la tienda y exige ser el dueño. */
export async function requireOwner(): Promise<TiendaContext> {
  const ctx = await getTiendaContext()
  if (!ctx.isOwner) throw new Error('Solo el dueño puede realizar esta acción')
  return ctx
}
