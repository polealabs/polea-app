'use client'

import { useEffect, useState } from 'react'
import { guardarPreferencias, obtenerPreferencias } from './actions'
import Toast from '@/components/ui/Toast'
import { useToast } from '@/lib/hooks/useToast'
import { ModuleTableSkeleton } from '@/components/skeletons/ModuleTableSkeleton'

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-[#1A1510]/20 bg-white text-[#1A1510] placeholder:text-[#1A1510]/40 focus:outline-none focus:ring-2 focus:ring-[#C4622D]/40 focus:border-[#C4622D] transition text-sm'

type PrefForm = {
  alerta_stock_bajo: boolean
  alerta_sin_movimiento: boolean
  dias_sin_movimiento: number
  alerta_cliente_recurrente: boolean
  dias_cliente_recurrente: number
  dias_sin_compra_alerta: number
  alerta_ventas_bajas: boolean
  porcentaje_alerta_ventas: number
}

const defaults: PrefForm = {
  alerta_stock_bajo: true,
  alerta_sin_movimiento: true,
  dias_sin_movimiento: 30,
  alerta_cliente_recurrente: true,
  dias_cliente_recurrente: 30,
  dias_sin_compra_alerta: 35,
  alerta_ventas_bajas: true,
  porcentaje_alerta_ventas: 80,
}

function Toggle({
  label,
  descripcion,
  valor,
  onToggle,
}: {
  label: string
  descripcion: string
  valor: boolean
  onToggle: () => void
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <div>
        <p className="text-sm font-medium text-[#1A1510]">{label}</p>
        <p className="text-xs text-[#8A7D72] mt-0.5">{descripcion}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-4 ${
          valor ? 'bg-[#C4622D]' : 'bg-[#EDE5DC]'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            valor ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  )
}

export default function PreferenciasPage() {
  const [form, setForm] = useState<PrefForm>(defaults)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const { toasts, showToast, removeToast } = useToast()

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        const data = await obtenerPreferencias()
        if (data) {
          setForm({
            alerta_stock_bajo: Boolean(data.alerta_stock_bajo),
            alerta_sin_movimiento: Boolean(data.alerta_sin_movimiento),
            dias_sin_movimiento: Number(data.dias_sin_movimiento ?? 30),
            alerta_cliente_recurrente: Boolean(data.alerta_cliente_recurrente),
            dias_cliente_recurrente: Number(data.dias_cliente_recurrente ?? 30),
            dias_sin_compra_alerta: Number(data.dias_sin_compra_alerta ?? 35),
            alerta_ventas_bajas: Boolean(data.alerta_ventas_bajas),
            porcentaje_alerta_ventas: Number(data.porcentaje_alerta_ventas ?? 80),
          })
        }
        setLoading(false)
      })()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [])

  async function handleSave() {
    setSubmitting(true)
    const fd = new FormData()
    fd.set('alerta_stock_bajo', String(form.alerta_stock_bajo))
    fd.set('alerta_sin_movimiento', String(form.alerta_sin_movimiento))
    fd.set('dias_sin_movimiento', String(form.dias_sin_movimiento))
    fd.set('alerta_cliente_recurrente', String(form.alerta_cliente_recurrente))
    fd.set('dias_cliente_recurrente', String(form.dias_cliente_recurrente))
    fd.set('dias_sin_compra_alerta', String(form.dias_sin_compra_alerta))
    fd.set('alerta_ventas_bajas', String(form.alerta_ventas_bajas))
    fd.set('porcentaje_alerta_ventas', String(form.porcentaje_alerta_ventas))

    const res = await guardarPreferencias(fd)
    if (res?.error) {
      showToast(res.error, 'error')
    } else {
      showToast('Preferencias guardadas')
    }
    setSubmitting(false)
  }

  if (loading) {
    return <ModuleTableSkeleton maxWidthClass="max-w-4xl" rows={8} />
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A2F]">Preferencias</h1>
        <p className="text-sm text-[#8A7D72] mt-1">Configura las alertas inteligentes que quieres recibir.</p>
      </div>

      <section className="bg-white rounded-2xl border border-[#EDE5DC] p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[#1A1510]">Inventario</h2>
          <p className="text-xs text-[#8A7D72] mt-1">
            Configura cuándo quieres recibir alertas sobre el estado de tu stock.
          </p>
        </div>

        <Toggle
          label="Alerta de stock bajo"
          descripcion="Notificarte cuando un producto llegue a su stock mínimo"
          valor={form.alerta_stock_bajo}
          onToggle={() => setForm((s) => ({ ...s, alerta_stock_bajo: !s.alerta_stock_bajo }))}
        />

        <Toggle
          label="Alerta de productos sin movimiento"
          descripcion="Notificarte cuando un producto no se vende en X días"
          valor={form.alerta_sin_movimiento}
          onToggle={() => setForm((s) => ({ ...s, alerta_sin_movimiento: !s.alerta_sin_movimiento }))}
        />

        {form.alerta_sin_movimiento && (
          <div>
            <p className="text-xs text-[#8A7D72] mb-1">Días sin ventas para alertar</p>
            <input
              type="number"
              min={1}
              value={form.dias_sin_movimiento}
              onChange={(e) => setForm((s) => ({ ...s, dias_sin_movimiento: Number(e.target.value) || 30 }))}
              className={inputClass}
            />
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-[#EDE5DC] p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[#1A1510]">Clientes</h2>
          <p className="text-xs text-[#8A7D72] mt-1">
            Polea identifica tus clientes más fieles y te avisa cuando llevan tiempo sin visitarte.
          </p>
        </div>

        <Toggle
          label="Activar alertas de clientes recurrentes"
          descripcion="Recibir sugerencias para contactar clientes que no han comprado recientemente"
          valor={form.alerta_cliente_recurrente}
          onToggle={() => setForm((s) => ({ ...s, alerta_cliente_recurrente: !s.alerta_cliente_recurrente }))}
        />

        {form.alerta_cliente_recurrente && (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-[#8A7D72] mb-1">¿Cada cuántos días es recurrente un cliente?</p>
              <input
                type="number"
                min={1}
                value={form.dias_cliente_recurrente}
                onChange={(e) => setForm((s) => ({ ...s, dias_cliente_recurrente: Number(e.target.value) || 30 }))}
                className={inputClass}
              />
              <p className="text-xs text-[#8A7D72] mt-1">
                Clientes que compren al menos 2 veces en este período se consideran recurrentes
              </p>
            </div>
            <div>
              <p className="text-xs text-[#8A7D72] mb-1">Alertar si lleva más de X días sin comprar</p>
              <input
                type="number"
                min={1}
                value={form.dias_sin_compra_alerta}
                onChange={(e) => setForm((s) => ({ ...s, dias_sin_compra_alerta: Number(e.target.value) || 35 }))}
                className={inputClass}
              />
              <p className="text-xs text-[#8A7D72] mt-1">
                Te avisamos cuando un cliente recurrente lleva este tiempo sin visitar
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-[#EDE5DC] p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[#1A1510]">Ventas</h2>
          <p className="text-xs text-[#8A7D72] mt-1">Compara tu rendimiento mensual y recibe alertas si las ventas bajan.</p>
        </div>

        <Toggle
          label="Alerta de ventas bajas"
          descripcion="Notificarte si las ventas de este mes están por debajo de un % del mes anterior"
          valor={form.alerta_ventas_bajas}
          onToggle={() => setForm((s) => ({ ...s, alerta_ventas_bajas: !s.alerta_ventas_bajas }))}
        />

        {form.alerta_ventas_bajas && (
          <div>
            <p className="text-xs text-[#8A7D72] mb-2">
              Alertar si las ventas caen por debajo del {form.porcentaje_alerta_ventas}% del mes anterior
            </p>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={form.porcentaje_alerta_ventas}
              onChange={(e) => setForm((s) => ({ ...s, porcentaje_alerta_ventas: Number(e.target.value) }))}
              className="w-full accent-[#C4622D]"
            />
            <p className="text-sm font-semibold text-[#1E3A2F] mt-1">{form.porcentaje_alerta_ventas}%</p>
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={submitting}
          className="w-full sm:w-auto bg-[#C4622D] hover:bg-[#E8845A] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition disabled:opacity-50"
        >
          {submitting ? 'Guardando...' : 'Guardar preferencias'}
        </button>
      </div>

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
