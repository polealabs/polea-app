'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTienda } from '@/lib/hooks/useTienda'
import { invitarMiembro, cambiarRol, eliminarMiembro, cancelarInvitacion } from './actions'
import Toast from '@/components/ui/Toast'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { useToast } from '@/lib/hooks/useToast'
import type { Miembro, Invitacion, Rol } from '@/lib/types'

type MiembroConPerfil = Miembro & {
  email?: string
  nombre?: string
}

function badgeRol(rol: Rol) {
  switch (rol) {
    case 'owner':
      return 'bg-[#1E3A2F] text-white'
    case 'admin':
      return 'bg-[#C4622D] text-white'
    case 'vendedor':
      return 'bg-[#D4A853] text-[#1A1510]'
    case 'readonly':
      return 'bg-[#6B7280] text-white'
    default:
      return 'bg-[#6B7280] text-white'
  }
}

function labelRol(rol: Rol) {
  switch (rol) {
    case 'owner':
      return 'Dueño'
    case 'admin':
      return 'Admin'
    case 'vendedor':
      return 'Vendedor'
    case 'readonly':
      return 'Solo lectura'
    default:
      return rol
  }
}

export default function EquipoPage() {
  const { tienda, loading: tiendaLoading, isOwner } = useTienda()
  const [miembros, setMiembros] = useState<MiembroConPerfil[]>([])
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [linkInvitacion, setLinkInvitacion] = useState<string | null>(null)
  const [emailInvitado, setEmailInvitado] = useState('')
  const [confirmDeleteMiembroId, setConfirmDeleteMiembroId] = useState<string | null>(null)
  const { toasts, showToast, removeToast } = useToast()

  const cargarDatos = useCallback(async () => {
    if (!tienda || !isOwner) {
      setLoading(false)
      return
    }

    const supabase = createClient()
    setLoading(true)

    const [{ data: miembrosData }, { data: invitacionesData }, { data: userData }] = await Promise.all([
      supabase
        .from('miembros')
        .select('*, perfiles(nombre)')
        .eq('tienda_id', tienda.id)
        .order('created_at'),
      supabase
        .from('invitaciones')
        .select('*')
        .eq('tienda_id', tienda.id)
        .eq('aceptada', false)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false }),
      supabase.auth.getUser(),
    ])

    let perfilData: { nombre?: string } | null = null
    if (userData?.user) {
      const { data } = await supabase
        .from('perfiles')
        .select('nombre')
        .eq('id', userData.user.id)
        .maybeSingle()
      perfilData = data
    }

    const ownerRow: MiembroConPerfil | null = userData?.user
      ? {
          id: `owner-${userData.user.id}`,
          tienda_id: tienda.id,
          user_id: userData.user.id,
          rol: 'owner',
          created_at: userData.user.created_at ?? new Date().toISOString(),
          email: userData.user.email ?? '—',
          nombre: perfilData?.nombre ?? userData.user.email ?? 'Dueño',
        }
      : null

    const miembrosMapeados: MiembroConPerfil[] = ((miembrosData ?? []) as Array<
      Miembro & {
        perfiles?: { nombre?: string } | { nombre?: string }[] | null
      }
    >).map((m) => {
      const perfil = Array.isArray(m.perfiles) ? m.perfiles[0] : m.perfiles
      return {
        ...m,
        email: m.email ?? '—',
        nombre: perfil?.nombre ?? undefined,
      }
    })

    setMiembros(ownerRow ? [ownerRow, ...miembrosMapeados] : miembrosMapeados)
    setInvitaciones((invitacionesData ?? []) as Invitacion[])
    setLoading(false)
  }, [isOwner, tienda])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void cargarDatos()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [cargarDatos])

  const miembrosNoOwner = useMemo(() => miembros.filter((m) => m.rol !== 'owner'), [miembros])

  async function handleInvitar(formData: FormData) {
    setSubmitting(true)
    setError(null)
    const email = String(formData.get('email') ?? '').trim().toLowerCase()
    const result = await invitarMiembro(formData)
    if (result?.error) {
      setError(result.error)
      showToast(result.error, 'error')
    } else if (result?.ok && result.token) {
      setEmailInvitado(email)
      setLinkInvitacion(`${window.location.origin}/invitacion/${result.token}`)
      showToast('Invitación enviada')
      setShowForm(false)
      await cargarDatos()
    }
    setSubmitting(false)
  }

  async function handleCambiarRol(miembroId: string, nuevoRol: string) {
    const result = await cambiarRol(miembroId, nuevoRol)
    if (result?.error) {
      showToast(result.error, 'error')
      return
    }
    showToast('Rol actualizado')
    await cargarDatos()
  }

  async function handleEliminarMiembro() {
    if (!confirmDeleteMiembroId) return
    const result = await eliminarMiembro(confirmDeleteMiembroId)
    if (result?.error) {
      showToast(result.error, 'error')
      return
    }
    setConfirmDeleteMiembroId(null)
    showToast('Miembro eliminado')
    await cargarDatos()
  }

  async function handleCancelarInvitacion(id: string) {
    const result = await cancelarInvitacion(id)
    if (result?.error) {
      showToast(result.error, 'error')
      return
    }
    showToast('Invitación cancelada')
    await cargarDatos()
  }

  async function copiarLink() {
    if (!linkInvitacion) return
    await navigator.clipboard.writeText(linkInvitacion)
    showToast('Link copiado')
  }

  if (tiendaLoading || loading) {
    return <div className="p-6 text-sm text-[#8A7D72]">Cargando equipo...</div>
  }

  if (!isOwner) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-[#8A7D72] text-sm">No tienes permisos para gestionar el equipo.</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <ConfirmModal
        open={confirmDeleteMiembroId !== null}
        title="Eliminar miembro"
        message="¿Seguro que quieres quitar este colaborador del equipo?"
        confirmLabel="Eliminar"
        danger
        onCancel={() => setConfirmDeleteMiembroId(null)}
        onConfirm={() => void handleEliminarMiembro()}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>Equipo</h1>
          <p className="text-sm text-[#8A7D72] mt-1">Invita colaboradores y administra sus roles.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="bg-[#C4622D] hover:bg-[#E8845A] text-white text-sm font-semibold px-4 py-2 rounded-lg transition self-start sm:self-auto"
        >
          {showForm ? 'Cerrar' : 'Invitar colaborador'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-[#EDE5DC] p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#1A1510] mb-4">Enviar invitación</h2>
          <form action={handleInvitar} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#8A7D72] mb-1">Email</label>
              <input
                name="email"
                type="email"
                required
                className="w-full px-3 py-2 rounded-lg border border-[#EDE5DC] text-sm"
                placeholder="colaborador@correo.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8A7D72] mb-1">Rol</label>
              <select
                name="rol"
                defaultValue="vendedor"
                className="w-full px-3 py-2 rounded-lg border border-[#EDE5DC] text-sm"
              >
                <option value="admin">Administrador (admin) — acceso total excepto eliminar tienda</option>
                <option value="vendedor">Vendedor (vendedor) — puede registrar ventas, ver productos y clientes</option>
                <option value="readonly">Solo lectura (readonly) — puede ver todo pero no modificar</option>
              </select>
            </div>
            {error && <p className="text-sm text-[#C44040] bg-[#FDEAEA] px-3 py-2 rounded-lg">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#1E3A2F] hover:bg-[#2d4a3e] text-white text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              {submitting ? 'Enviando...' : 'Enviar invitación'}
            </button>
          </form>
        </div>
      )}

      {linkInvitacion && (
        <div className="bg-[#E8F5EE] border border-[#3A7D5A]/30 rounded-2xl p-5">
          <p className="text-sm text-[#1E3A2F] font-medium">Invitación creada. Comparte este link con {emailInvitado}:</p>
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <code className="flex-1 text-xs bg-white border border-[#CFE7D9] rounded-lg px-3 py-2 break-all">{linkInvitacion}</code>
            <button
              type="button"
              onClick={() => void copiarLink()}
              className="text-sm bg-[#3A7D5A] text-white px-4 py-2 rounded-lg hover:bg-[#2f664a] transition"
            >
              Copiar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#EDE5DC] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#EDE5DC]">
          <h2 className="text-sm font-semibold text-[#1A1510]">Miembros actuales</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-[#FAF6F0] border-b border-[#EDE5DC]">
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#8A7D72]">Miembro</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#8A7D72]">Correo</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#8A7D72]">Rol</th>
                <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#8A7D72]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {miembros.map((m) => (
                <tr key={m.id} className="border-b border-[#EDE5DC]/70 last:border-b-0">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>
                      {m.nombre || m.email || 'Sin nombre'}
                    </p>
                    {m.nombre && (
                      <p className="text-xs" style={{ color: 'var(--color-text-soft)' }}>
                        {m.email}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-[#1A1510]">
                    {m.email || '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeRol(m.rol)}`}>
                      {labelRol(m.rol)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {m.rol === 'owner' ? (
                      <span className="text-xs text-[#8A7D72]">Sin acciones</span>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={m.rol}
                          onChange={(e) => void handleCambiarRol(m.id, e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-[#EDE5DC] text-xs"
                        >
                          <option value="admin">Admin</option>
                          <option value="vendedor">Vendedor</option>
                          <option value="readonly">Solo lectura</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteMiembroId(m.id)}
                          className="text-xs text-[#C44040] hover:underline"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {miembrosNoOwner.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-[#8A7D72] text-sm">
                    No hay colaboradores todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#EDE5DC] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#EDE5DC]">
          <h2 className="text-sm font-semibold text-[#1A1510]">Invitaciones pendientes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-[#FAF6F0] border-b border-[#EDE5DC]">
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#8A7D72]">Email</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#8A7D72]">Rol</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#8A7D72]">Expira</th>
                <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#8A7D72]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {invitaciones.map((inv) => (
                <tr key={inv.id} className="border-b border-[#EDE5DC]/70 last:border-b-0">
                  <td className="px-5 py-3.5 text-[#1A1510]">{inv.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeRol(inv.rol)}`}>
                      {labelRol(inv.rol)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[#8A7D72]">{new Date(inv.expires_at).toLocaleString('es-CO')}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => void handleCancelarInvitacion(inv.id)}
                      className="text-xs text-[#C44040] hover:underline"
                    >
                      Cancelar invitación
                    </button>
                  </td>
                </tr>
              ))}
              {invitaciones.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-[#8A7D72] text-sm">
                    No hay invitaciones pendientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
