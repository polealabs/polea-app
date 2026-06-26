import { createAdminClient } from '@/lib/supabase/admin'

type TiendaNombreEmbed = { nombre?: string } | { nombre?: string }[] | null

function nombreDesdeTiendas(tiendas: TiendaNombreEmbed): string {
  if (!tiendas) return '—'
  if (Array.isArray(tiendas)) return tiendas[0]?.nombre ?? '—'
  return tiendas.nombre ?? '—'
}

export default async function AdminUsuarios() {
  const supabase = createAdminClient()

  const { data: perfiles } = await supabase
    .from('perfiles')
    .select('id, nombre, updated_at')
    .order('updated_at', { ascending: false })

  const { data: miembros } = await supabase
    .from('miembros')
    .select('user_id, tienda_id, rol, email, tiendas(nombre)')

  const miembrosPorUsuario = new Map<string, { tienda: string; rol: string; email: string }>()
  ;(miembros ?? []).forEach((m) => {
    miembrosPorUsuario.set(m.user_id, {
      tienda: nombreDesdeTiendas(m.tiendas as TiendaNombreEmbed),
      rol: m.rol,
      email: m.email ?? '—',
    })
  })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Usuarios</h1>
        <p className="text-white/60 text-sm mt-1">{perfiles?.length ?? 0} usuarios registrados</p>
      </div>

      <div
        className="rounded-2xl border border-white/10 overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      >
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-6 py-3 text-left text-xs text-white/60 uppercase">Nombre</th>
              <th className="px-6 py-3 text-left text-xs text-white/60 uppercase">Tienda</th>
              <th className="px-6 py-3 text-left text-xs text-white/60 uppercase">Rol</th>
              <th className="px-6 py-3 text-left text-xs text-white/60 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs text-white/60 uppercase">Última actividad</th>
            </tr>
          </thead>
          <tbody>
            {(perfiles ?? []).map((p) => {
              const info = miembrosPorUsuario.get(p.id)
              return (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="px-6 py-3 text-sm text-white font-medium">{p.nombre || '—'}</td>
                  <td className="px-6 py-3 text-sm text-white/60">{info?.tienda ?? '—'}</td>
                  <td className="px-6 py-3 text-sm text-white/60 capitalize">{info?.rol ?? 'owner'}</td>
                  <td className="px-6 py-3 text-sm text-white/60">{info?.email ?? '—'}</td>
                  <td className="px-6 py-3 text-sm text-white/60">
                    {p.updated_at
                      ? new Date(p.updated_at).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
