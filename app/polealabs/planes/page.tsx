import { createAdminClient } from '@/lib/supabase/admin'
import type { Plan } from '@/lib/types'
import PlanesAdmin from './PlanesAdmin'

export default async function AdminPlanes() {
  const supabase = createAdminClient()
  const { data: planes } = await supabase.from('planes').select('*').order('orden')

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Planes de suscripción</h1>
        <p className="text-white/40 text-sm mt-1">Gestiona los planes disponibles y sus precios</p>
      </div>
      <PlanesAdmin planes={(planes ?? []) as Plan[]} />
    </div>
  )
}
