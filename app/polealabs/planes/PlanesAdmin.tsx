'use client'
import { useState } from 'react'
import type { Plan } from '@/lib/types'
import { crearPlan, actualizarPlan, eliminarPlan } from './actions'

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)
}

interface FormState {
  nombre: string
  descripcion: string
  precio_mensual: string
  precio_anual: string
  descuento_anual_porcentaje: string
  max_productos: string
  max_miembros: string
  funcionalidades: string
  activo: boolean
  orden: string
}

function planToForm(plan: Plan): FormState {
  return {
    nombre: plan.nombre,
    descripcion: plan.descripcion ?? '',
    precio_mensual: String(plan.precio_mensual),
    precio_anual: String(plan.precio_anual),
    descuento_anual_porcentaje: String(plan.descuento_anual_porcentaje),
    max_productos: plan.max_productos != null ? String(plan.max_productos) : '',
    max_miembros: plan.max_miembros != null ? String(plan.max_miembros) : '',
    funcionalidades: (plan.funcionalidades ?? []).join('\n'),
    activo: plan.activo,
    orden: String(plan.orden),
  }
}

const emptyForm: FormState = {
  nombre: '',
  descripcion: '',
  precio_mensual: '',
  precio_anual: '',
  descuento_anual_porcentaje: '17',
  max_productos: '',
  max_miembros: '',
  funcionalidades: '',
  activo: true,
  orden: '0',
}

function PlanForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: FormState
  onSave: (data: FormState) => Promise<void>
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<FormState>(initial)
  const set = (k: keyof FormState, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      <div className="space-y-3">
        <div>
          <label className="text-xs text-white/50 block mb-1">Nombre</label>
          <input
            value={form.nombre}
            onChange={(e) => set('nombre', e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/10 text-white text-sm border border-white/20 focus:outline-none focus:border-[#C4622D]"
          />
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">Descripción</label>
          <input
            value={form.descripcion}
            onChange={(e) => set('descripcion', e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/10 text-white text-sm border border-white/20 focus:outline-none focus:border-[#C4622D]"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/50 block mb-1">Precio mensual (COP)</label>
            <input
              type="number"
              value={form.precio_mensual}
              onChange={(e) => set('precio_mensual', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/10 text-white text-sm border border-white/20 focus:outline-none focus:border-[#C4622D]"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 block mb-1">Precio anual (COP)</label>
            <input
              type="number"
              value={form.precio_anual}
              onChange={(e) => set('precio_anual', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/10 text-white text-sm border border-white/20 focus:outline-none focus:border-[#C4622D]"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-white/50 block mb-1">Descuento anual %</label>
            <input
              type="number"
              value={form.descuento_anual_porcentaje}
              onChange={(e) => set('descuento_anual_porcentaje', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/10 text-white text-sm border border-white/20 focus:outline-none focus:border-[#C4622D]"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 block mb-1">Máx. productos</label>
            <input
              type="number"
              placeholder="Ilimitado"
              value={form.max_productos}
              onChange={(e) => set('max_productos', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/10 text-white text-sm border border-white/20 focus:outline-none focus:border-[#C4622D] placeholder-white/30"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 block mb-1">Máx. miembros</label>
            <input
              type="number"
              placeholder="Ilimitado"
              value={form.max_miembros}
              onChange={(e) => set('max_miembros', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/10 text-white text-sm border border-white/20 focus:outline-none focus:border-[#C4622D] placeholder-white/30"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/50 block mb-1">Orden de visualización</label>
            <input
              type="number"
              value={form.orden}
              onChange={(e) => set('orden', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/10 text-white text-sm border border-white/20 focus:outline-none focus:border-[#C4622D]"
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => set('activo', !form.activo)}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${form.activo ? 'bg-[#C4622D]' : 'bg-white/20'}`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.activo ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </div>
              <span className="text-xs text-white/60">{form.activo ? 'Activo' : 'Inactivo'}</span>
            </label>
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs text-white/50 block mb-1">Funcionalidades incluidas (una por línea)</label>
        <textarea
          rows={10}
          value={form.funcionalidades}
          onChange={(e) => set('funcionalidades', e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-white/10 text-white text-sm border border-white/20 focus:outline-none focus:border-[#C4622D] resize-none"
          placeholder="Inventario&#10;Ventas&#10;Clientes"
        />
      </div>

      <div className="md:col-span-2 flex gap-3 pt-2">
        <button
          onClick={() => void onSave(form)}
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-[#C4622D] text-white text-sm font-medium hover:bg-[#A8521F] transition disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar plan'}
        </button>
        <button
          onClick={onCancel}
          className="px-5 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

function formToData(form: FormState) {
  return {
    nombre: form.nombre.trim(),
    descripcion: form.descripcion.trim(),
    precio_mensual: parseInt(form.precio_mensual) || 0,
    precio_anual: parseInt(form.precio_anual) || 0,
    descuento_anual_porcentaje: parseInt(form.descuento_anual_porcentaje) || 0,
    max_productos: form.max_productos.trim() ? parseInt(form.max_productos) : null,
    max_miembros: form.max_miembros.trim() ? parseInt(form.max_miembros) : null,
    funcionalidades: form.funcionalidades.split('\n').map((s) => s.trim()).filter(Boolean),
    activo: form.activo,
    orden: parseInt(form.orden) || 0,
  }
}

export default function PlanesAdmin({ planes }: { planes: Plan[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpdate(plan: Plan, form: FormState) {
    setSaving(true)
    setError(null)
    const result = await actualizarPlan(plan.id, formToData(form))
    setSaving(false)
    if (result.error) { setError(result.error); return }
    setEditingId(null)
  }

  async function handleCreate(form: FormState) {
    setSaving(true)
    setError(null)
    const result = await crearPlan(formToData(form))
    setSaving(false)
    if (result.error) { setError(result.error); return }
    setShowCreate(false)
  }

  async function handleEliminar(id: string, nombre: string) {
    if (!confirm(`¿Eliminar el plan "${nombre}"? Esta acción no se puede deshacer.`)) return
    const result = await eliminarPlan(id)
    if (result.error) setError(result.error)
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {planes.map((plan) => (
        <div key={plan.id} className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold text-lg">{plan.nombre}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${plan.activo ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'}`}>
                      {plan.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  {plan.descripcion && <p className="text-white/40 text-sm mt-0.5">{plan.descripcion}</p>}
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <p className="text-white font-semibold">{formatCOP(plan.precio_mensual)}<span className="text-white/40 text-xs font-normal">/mes</span></p>
                  <p className="text-white/40 text-xs">{formatCOP(plan.precio_anual)}/año · {plan.descuento_anual_porcentaje}% dto</p>
                </div>
                <div className="text-right text-xs text-white/40">
                  <p>{plan.max_productos != null ? `${plan.max_productos} productos` : 'Productos ilimitados'}</p>
                  <p>{plan.max_miembros != null ? `${plan.max_miembros} miembros` : 'Equipo ilimitado'}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingId(editingId === plan.id ? null : plan.id)}
                    className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs hover:bg-white/20 transition"
                  >
                    {editingId === plan.id ? 'Cerrar' : 'Editar'}
                  </button>
                  <button
                    onClick={() => void handleEliminar(plan.id, plan.nombre)}
                    className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30 transition"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>

            {plan.funcionalidades?.length > 0 && editingId !== plan.id && (
              <div className="flex flex-wrap gap-2 mt-3">
                {plan.funcionalidades.map((f) => (
                  <span key={f} className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/60">{f}</span>
                ))}
              </div>
            )}

            {editingId === plan.id && (
              <PlanForm
                initial={planToForm(plan)}
                onSave={(form) => handleUpdate(plan, form)}
                onCancel={() => setEditingId(null)}
                saving={saving}
              />
            )}
          </div>
        </div>
      ))}

      {showCreate ? (
        <div className="rounded-2xl border border-[#C4622D]/40 p-6" style={{ background: 'rgba(196,98,45,0.05)' }}>
          <p className="text-white font-semibold mb-2">Nuevo plan</p>
          <PlanForm
            initial={emptyForm}
            onSave={handleCreate}
            onCancel={() => setShowCreate(false)}
            saving={saving}
          />
        </div>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="w-full py-3 rounded-2xl border border-dashed border-white/20 text-white/40 text-sm hover:border-white/40 hover:text-white/60 transition"
        >
          + Agregar plan
        </button>
      )}
    </div>
  )
}
