import { createClient } from '@/lib/supabase/server'

/**
 * Lanza si el usuario actual no es un admin de Polea (tabla `admins`).
 *
 * CRÍTICO: los server actions son POST con header `Next-Action` y el `proxy.ts`
 * los deja pasar sin interceptar (early return). Por eso el gate de admin del
 * proxy NO corre para acciones, y cada server action de `/polealabs` que use
 * `createAdminClient()` (service role) debe llamar a esta función primero.
 */
export async function verificarAdmin(): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: admin } = await supabase
    .from('admins')
    .select('id')
    .eq('email', user.email ?? '')
    .maybeSingle()
  if (!admin) throw new Error('No autorizado')
}
