'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTienda } from '@/lib/hooks/useTienda'
import type { MedioPago, TipoMedioPago } from '@/lib/types'
import { calcularComisionMedioPago } from '@/lib/utils'
import {
  crearMedioPago,
  editarMedioPago,
  eliminarMedioPago,
  seedMediosPagoDefecto,
} from './actions'
import Toast from '@/components/ui/Toast'
import { useToast } from '@/lib/hooks/useToast'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { ModuleTableSkeleton } from '@/components/skeletons/ModuleTableSkeleton'

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-[#1A1510]/20 bg-white text-[#1A1510] placeholder:text-[#1A1510]/40 focus:outline-none focus:ring-2 focus:ring-[#C4622D]/40 focus:border-[#C4622D] transition text-sm'
const labelClass = 'block text-xs font-medium text-[#1A1510]/60 mb-1'

const TIPOS_MEDIO: { id: TipoMedioPago; label: string; descripcion: string }[] = [
  { id: 'efectivo', label: 'Efectivo', descripcion: 'Sin comisión' },
  { id: 'transferencia', label: 'Transferencia bancaria', descripcion: 'Sin comisión' },
  { id: 'nequi_daviplata', label: 'Nequi / Daviplata', descripcion: 'Billetera digital' },
  { id: 'datafono', label: 'Datáfono', descripcion: 'Bold, Redeban, Wompi POS, etc.' },
  { id: 'pasarela_web', label: 'Pasarela web', descripcion: 'Wompi, PayU, etc.' },
  { id: 'cuotas', label: 'Compra a cuotas', descripcion: 'Addi, Sistecredito, etc.' },
  { id: 'contraentrega', label: 'Contraentrega', descripcion: 'Pago al recibir' },
]

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)
}

type FormState = {
  nombre: string
  tipo: TipoMedioPago
  comision_porcentaje: number
  tarifa_fija: number
  cobra_iva: boolean
}

const initialForm: FormState = {
  nombre: '',
  tipo: 'efectivo',
  comision_porcentaje: 0,
  tarifa_fija: 0,
  cobra_iva: false,
}

export default function MediosPagoPage() {
  const { tienda, loading: tiendaLoading, canEdit, canDelete } = useTienda()
  const [medios, setMedios] = useState<MedioPago[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<MedioPago | null>(null)
  const [form, setForm] = useState<FormState>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<MedioPago | null>(null)
  const { toasts, showToast, removeToast } = useToast()

  const fetchMedios = useCallback(async () => {
    if (!tienda) return
    const supabase = createClient()
    const { data } = await supabase
      .from('medios_pago')
      .select('*')
      .eq('tienda_id', tienda.id)
      .order('nombre')
    setMedios((data ?? []) as MedioPago[])
    setLoading(false)
  }, [tienda])

  useEffect(() => {
    if (!tienda) return
    const id = window.setTimeout(() => {
      void fetchMedios()
    }, 0)
    return () => window.clearTimeout(id)
  }, [fetchMedios, tienda])

  const previewComision = useMemo(() => {
    const ejemplo = 100000
    const ejemploEnvio = 0
    return calcularComisionMedioPago(ejemplo, ejemploEnvio, {
      comision_porcentaje: form.comision_porcentaje,
      tarifa_fija: form.tarifa_fija,
      cobra_iva: form.cobra_iva,
    })
  }, [form.cobra_iva, form.comision_porcentaje, form.tarifa_fija])

  async function handleSubmit() {
    if (!canEdit) return
    setSubmitting(true)
    const payload = {
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      comision_porcentaje: Number(form.comision_porcentaje) || 0,
      tarifa_fija: Number(form.tarifa_fija) || 0,
      cobra_iva: form.cobra_iva,
    }

    const result = editando
      ? await editarMedioPago(editando.id, { ...payload, activo: editando.activo })
      : await crearMedioPago(payload)

    if (result?.error) {
      showToast(result.error, 'error')
    } else {
      showToast(editando ? 'Medio actualizado' : 'Medio creado')
      setShowForm(false)
      setEditando(null)
      setForm(initialForm)
      await fetchMedios()
    }
    setSubmitting(false)
  }

  async function handleToggleActivo(medio: MedioPago) {
    const result = await editarMedioPago(medio.id, {
      nombre: medio.nombre,
      tipo: medio.tipo,
      comision_porcentaje: medio.comision_porcentaje,
      tarifa_fija: medio.tarifa_fija,
      cobra_iva: medio.cobra_iva,
      activo: !medio.activo,
    })
    if (result?.error) showToast(result.error, 'error')
    else await fetchMedios()
  }

  async function handleDelete() {
    if (!confirmDelete) return
    const result = await eliminarMedioPago(confirmDelete.id)
    if (result?.error) showToast(result.error, 'error')
    else {
      showToast('Medio eliminado')
      await fetchMedios()
    }
    setConfirmDelete(null)
  }

  async function handleSeedDefaults() {
    if (!tienda) return
    await seedMediosPagoDefecto(tienda.id)
    await fetchMedios()
    showToast('Medios por defecto cargados')
  }

  if (tiendaLoading || loading) return <ModuleTableSkeleton maxWidthClass="max-w-5xl" rows={8} />

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto" style={{ background: 'var(--color-background)' }}>
      <ConfirmModal
        open={confirmDelete !== null}
        title="Eliminar medio de pago"
        message={`¿Eliminar “${confirmDelete?.nombre ?? ''}”?`}
        confirmLabel="Eliminar"
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(null)}
        danger
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>Medios de pago</h1>
          <p className="text-sm text-[#1A1510]/50 mt-0.5">{medios.length} medio{medios.length !== 1 ? 's' : ''} configurado{medios.length !== 1 ? 's' : ''}</p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => {
              setShowForm(true)
              setEditando(null)
              setForm(initialForm)
            }}
            className="btn-primary text-sm font-semibold px-4 py-2 rounded-lg"
          >
            + Nuevo medio
          </button>
        )}
      </div>

      {medios.length === 0 && canEdit && (
        <div className="mb-6 rounded-2xl border border-[#EDE5DC] bg-white p-5">
          <p className="text-sm text-[#1A1510]/70 mb-3">Aún no tienes medios de pago configurados.</p>
          <button
            type="button"
            onClick={() => void handleSeedDefaults()}
            className="text-sm font-medium px-4 py-2 rounded-lg border border-[#C4622D]/30 text-[#C4622D] hover:bg-[#F9EDE5] transition"
          >
            Cargar medios por defecto
          </button>
        </div>
      )}

      {canEdit && showForm && (
        <div className="bg-white rounded-2xl border border-[#1A1510]/8 p-6 mb-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#1E3A2F] mb-4">{editando ? 'Editar medio' : 'Nuevo medio de pago'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nombre</label>
              <input
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder='Ej: Datáfono Bold'
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as TipoMedioPago }))}
                className={inputClass}
              >
                {TIPOS_MEDIO.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} · {t.descripcion}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Comisión %</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.comision_porcentaje === 0 ? '' : form.comision_porcentaje}
                onChange={(e) => setForm((f) => ({ ...f, comision_porcentaje: e.target.value === '' ? 0 : Number(e.target.value) }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Tarifa fija COP</label>
              <input
                type="number"
                min="0"
                value={form.tarifa_fija === 0 ? '' : form.tarifa_fija}
                onChange={(e) => setForm((f) => ({ ...f, tarifa_fija: e.target.value === '' ? 0 : Number(e.target.value) }))}
                placeholder="Ej: 900 para Wompi"
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              ¿Cobra IVA sobre la comisión?
            </label>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, cobra_iva: !f.cobra_iva }))}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.cobra_iva ? 'bg-[#1E3A2F]' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.cobra_iva ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-xs" style={{ color: 'var(--color-text-soft)' }}>
              {form.cobra_iva ? 'Sí (Wompi, Bold, datáfonos)' : 'No (Efectivo, Transferencia)'}
            </span>
          </div>

          <div className="mt-4 rounded-xl p-3 text-xs space-y-1" style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
            <p className="font-medium" style={{ color: 'var(--color-text-soft)' }}>Preview en venta de $100.000:</p>
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-text-soft)' }}>Comisión base</span>
              <span style={{ color: 'var(--color-text)' }}>-{formatCOP(previewComision.comision_base)}</span>
            </div>
            {previewComision.iva_comision > 0 && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--color-text-soft)' }}>IVA comisión (19%)</span>
                <span style={{ color: 'var(--color-text)' }}>-{formatCOP(previewComision.iva_comision)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold border-t pt-1" style={{ borderColor: 'var(--color-border)' }}>
              <span style={{ color: 'var(--color-text)' }}>Neto a recibir</span>
              <span style={{ color: 'var(--color-primary)' }}>{formatCOP(previewComision.neto)}</span>
            </div>
          </div>

          <div className="mt-5 flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditando(null)
                setForm(initialForm)
              }}
              className="text-sm text-[#1A1510]/60 hover:text-[#1A1510] px-4 py-2 rounded-lg border border-[#1A1510]/20 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting}
              className="btn-primary text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#1A1510]/8 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="border-b border-[#1A1510]/8 bg-[#FAF6F0]">
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">Nombre</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">Tipo</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">Comisión</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">Tarifa fija</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">Activo</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {medios.map((m, i) => (
                <tr key={m.id} className={`border-b border-[#1A1510]/5 hover:bg-[#FAF6F0]/60 transition ${i === medios.length - 1 ? 'border-b-0' : ''}`}>
                  <td className="px-5 py-4 font-medium text-[#1A1510]">{m.nombre}</td>
                  <td className="px-5 py-4 text-[#1A1510]/70">
                    {TIPOS_MEDIO.find((t) => t.id === m.tipo)?.label ?? m.tipo}
                  </td>
                  <td className="px-5 py-4 text-right text-[#1A1510]/80">{m.comision_porcentaje}%</td>
                  <td className="px-5 py-4 text-right text-[#1A1510]/80">{formatCOP(m.tarifa_fija)}</td>
                  <td className="px-5 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => void handleToggleActivo(m)}
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold ${m.activo ? 'bg-[#E8F5EE] text-[#3A7D5A]' : 'bg-[#FDEAEA] text-[#C44040]'}`}
                    >
                      {m.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditando(m)
                            setForm({
                              nombre: m.nombre,
                              tipo: m.tipo,
                              comision_porcentaje: m.comision_porcentaje,
                              tarifa_fija: m.tarifa_fija,
                              cobra_iva: m.cobra_iva,
                            })
                            setShowForm(true)
                          }}
                          className="text-xs text-[#C4622D] hover:underline font-medium"
                        >
                          Editar
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(m)}
                          className="text-xs text-[#1A1510]/40 hover:text-red-500 transition"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {medios.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-[#8A7D72]">
                    No hay medios de pago configurados.
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
