'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTienda } from '@/lib/hooks/useTienda'
import { crearEvento, eliminarEvento } from './actions'
import { ModuleTableSkeleton } from '@/components/skeletons/ModuleTableSkeleton'
import Toast from '@/components/ui/Toast'
import { useToast } from '@/lib/hooks/useToast'
import { toLocalISODateString } from '@/lib/utils'
import ConfirmModal from '@/components/ui/ConfirmModal'

type Evento = {
  id: string
  nombre: string
  lugar: string | null
  fecha_inicio: string
  fecha_fin: string | null
  tipo: 'feria' | 'consignacion'
  estado: 'activo' | 'cerrado'
  notas: string | null
}

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-[#1A1510]/20 bg-white text-[#1A1510] placeholder:text-[#1A1510]/40 focus:outline-none focus:ring-2 focus:ring-[#C4622D]/40 focus:border-[#C4622D] transition text-sm'
const labelClass = 'block text-xs font-medium text-[#1A1510]/60 mb-1'

function formatFecha(f: string) {
  return new Date(`${f}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function EventosPage() {
  const router = useRouter()
  const { tienda, loading: tiendaLoading, canEdit, canDelete } = useTienda()
  const { toasts, showToast, removeToast } = useToast()
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchEventos = useCallback(async (tiendaId: string) => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('eventos')
      .select('*')
      .eq('tienda_id', tiendaId)
      .order('fecha_inicio', { ascending: false })
    setEventos((data ?? []) as Evento[])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (tiendaLoading || !tienda) return
    const tid = window.setTimeout(() => {
      void fetchEventos(tienda.id)
    }, 0)
    return () => window.clearTimeout(tid)
  }, [tienda, tiendaLoading, fetchEventos])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const result = await crearEvento(new FormData(e.currentTarget))
    if (result && 'error' in result && result.error) {
      setError(result.error)
      setSubmitting(false)
      return
    }
    setShowForm(false)
    showToast('Evento creado')
    if (tienda) await fetchEventos(tienda.id)
    setSubmitting(false)
    if (result && 'id' in result && result.id) router.push(`/eventos/${result.id}`)
  }

  async function handleEliminar(id: string) {
    const res = await eliminarEvento(id)
    if (res && 'error' in res && res.error) {
      showToast(res.error, 'error')
      return
    }
    showToast('Evento eliminado')
    if (tienda) await fetchEventos(tienda.id)
  }

  if (tiendaLoading) return <ModuleTableSkeleton />
  if (!tienda) {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <p className="text-sm text-[#8A7D72]">No se encontró la tienda.</p>
      </div>
    )
  }
  if (loading) return <ModuleTableSkeleton />

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A2F]" style={{ fontFamily: 'Fraunces, serif' }}>
            Eventos
          </h1>
          <p className="text-sm text-[#8A7D72] mt-0.5">
            {eventos.length} evento{eventos.length !== 1 ? 's' : ''} registrado{eventos.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-sm font-semibold px-4 py-2 rounded-xl transition"
            style={{ background: 'var(--color-accent)', color: 'white' }}
          >
            + Nuevo evento
          </button>
        )}
      </div>

      {showForm && (
        <div
          className="bg-white rounded-2xl border border-[#1A1510]/8 p-6 mb-6 shadow-sm"
          style={{ background: 'var(--color-surface)' }}
        >
          <h2 className="text-base font-semibold text-[#1E3A2F] mb-4">Nuevo evento</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Nombre del evento *</label>
              <input name="nombre" type="text" required placeholder="Ej: Feria Artesanal Cali" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Lugar</label>
              <input name="lugar" type="text" placeholder="Ej: Centro Comercial Chipichape" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Fecha inicio *</label>
              <input name="fecha_inicio" type="date" required defaultValue={toLocalISODateString()} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Fecha fin (opcional)</label>
              <input name="fecha_fin" type="date" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Tipo *</label>
              <select name="tipo" required className={inputClass}>
                <option value="feria">Feria / Mercado</option>
                <option value="consignacion">Consignación</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Notas (opcional)</label>
              <input name="notas" type="text" placeholder="Observaciones del evento" className={inputClass} />
            </div>
            {error && (
              <p className="sm:col-span-2 text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg">{error}</p>
            )}
            <div className="sm:col-span-2 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-sm text-[#1A1510]/60 hover:text-[#1A1510] px-4 py-2 rounded-lg border border-[#1A1510]/20 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="text-sm font-semibold px-4 py-2 rounded-xl transition disabled:opacity-50"
                style={{ background: 'var(--color-accent)', color: 'white' }}
              >
                {submitting ? 'Creando...' : 'Crear evento'}
              </button>
            </div>
          </form>
        </div>
      )}

      {eventos.length === 0 ? (
        <div
          className="bg-white rounded-2xl border border-[#1A1510]/8 p-12 text-center shadow-sm"
          style={{ background: 'var(--color-surface)' }}
        >
          <p className="text-[#8A7D72] text-sm">Aún no tienes eventos registrados.</p>
          {canEdit && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-3 text-sm text-[#C4622D] font-medium hover:underline"
            >
              Crea el primero
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {eventos.map((evento) => (
            <div
              key={evento.id}
              className="bg-white rounded-2xl border border-[#1A1510]/8 p-5 shadow-sm flex items-center justify-between gap-4 cursor-pointer hover:border-[#C4622D]/30 transition"
              style={{ background: 'var(--color-surface)' }}
              onClick={() => router.push(`/eventos/${evento.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  router.push(`/eventos/${evento.id}`)
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: 'var(--color-accent-pale)' }}
                >
                  {evento.tipo === 'feria' ? '🛍️' : '🤝'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#1E3A2F]">{evento.nombre}</p>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        evento.estado === 'activo' ? 'bg-[#E8F5EE] text-[#3A7D5A]' : 'bg-[#F0EBE4] text-[#8A7D72]'
                      }`}
                    >
                      {evento.estado === 'activo' ? 'Activo' : 'Cerrado'}
                    </span>
                  </div>
                  <p className="text-xs text-[#8A7D72] mt-0.5">
                    {formatFecha(evento.fecha_inicio)}
                    {evento.fecha_fin ? ` → ${formatFecha(evento.fecha_fin)}` : ''}
                    {evento.lugar ? ` · ${evento.lugar}` : ''}
                  </p>
                </div>
              </div>
              {canDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setConfirmDelete(evento.id)
                  }}
                  className="text-xs text-[#1A1510]/40 hover:text-red-500 transition flex-shrink-0"
                >
                  Eliminar
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Eliminar evento"
        message="¿Eliminar este evento? Se eliminarán también sus ventas y gastos."
        confirmLabel="Eliminar"
        danger
        onConfirm={() => {
          const id = confirmDelete
          setConfirmDelete(null)
          if (id) void handleEliminar(id)
        }}
        onCancel={() => setConfirmDelete(null)}
      />
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
