'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTienda } from '@/lib/hooks/useTienda'
import { crearGasto, eliminarGasto } from './actions'
import type { Gasto, Proveedor } from '@/lib/types'
import ImportCSV from '@/components/ui/ImportCSV'
import ProveedorInlineForm from '@/components/ui/ProveedorInlineForm'
import Toast from '@/components/ui/Toast'
import { ModuleTableSkeleton } from '@/components/skeletons/ModuleTableSkeleton'
import { descargarCSV } from '@/lib/csv'
import { useToast } from '@/lib/hooks/useToast'
import { importarGastos } from './actions-import'

const CATEGORIAS_GASTO: Gasto['categoria'][] = ['Producción', 'Empaque', 'Envíos', 'Marketing', 'Plataformas', 'Otro']

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-[#1A1510]/20 bg-white text-[#1A1510] placeholder:text-[#1A1510]/40 focus:outline-none focus:ring-2 focus:ring-[#C4622D]/40 focus:border-[#C4622D] transition text-sm'
const labelClass = 'block text-xs font-medium text-[#1A1510]/60 mb-1'

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(n)
}

function formatFecha(fecha: string) {
  return new Date(fecha + 'T12:00:00').toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function descargarPlantillaGastos() {
  descargarCSV('plantilla_gastos.csv', [
    ['descripcion', 'monto', 'categoria', 'fecha'],
    ['Empaque kraft', '15000', 'Empaque', '2026-01-10'],
    ['Pauta Instagram', '80000', 'Marketing', '2026-01-15'],
    ['Envío Servientrega', '12000', 'Envíos', '2026-01-20'],
  ])
}

function categoriaBadgeClass(categoria: Gasto['categoria']) {
  switch (categoria) {
    case 'Producción':
      return 'bg-[#1E3A2F] text-white'
    case 'Empaque':
      return 'bg-[#C4622D] text-white'
    case 'Envíos':
      return 'bg-[#D4A853] text-[#1A1510]'
    case 'Marketing':
      return 'bg-[#8B5CF6] text-white'
    case 'Plataformas':
      return 'bg-[#3B82F6] text-white'
    case 'Otro':
      return 'bg-[#6B7280] text-white'
    default:
      return 'bg-[#6B7280] text-white'
  }
}

export default function GastosPage() {
  const { tienda, loading: tiendaLoading } = useTienda()
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showProveedorForm, setShowProveedorForm] = useState(false)
  const [proveedorIdSeleccionado, setProveedorIdSeleccionado] = useState('')
  const [mesActual, setMesActual] = useState(() => new Date().toISOString().slice(0, 7))
  const [chipCategoria, setChipCategoria] = useState<string>('todos')
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const { toasts, showToast, removeToast } = useToast()

  const fetchGastos = useCallback(async (tiendaId: string, mes: string) => {
    const supabase = createClient()
    const start = `${mes}-01`
    const nextMonth = new Date(`${mes}-01T12:00:00`)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    const end = nextMonth.toISOString().slice(0, 10)

    const [{ data }, { data: provData }] = await Promise.all([
      supabase
        .from('gastos')
        .select('*')
        .eq('tienda_id', tiendaId)
        .gte('fecha', start)
        .lt('fecha', end)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('proveedores').select('id, nombre').eq('tienda_id', tiendaId).order('nombre'),
    ])

    setGastos(data ?? [])
    setProveedores((provData ?? []) as Proveedor[])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!tienda) return
    const tiendaId = tienda.id
    const mes = mesActual
    const timeoutId = window.setTimeout(() => {
      void fetchGastos(tiendaId, mes)
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [fetchGastos, mesActual, tienda])

  async function handleSubmit(formData: FormData) {
    setSubmitting(true)
    setError(null)
    formData.set('proveedor_id', proveedorIdSeleccionado)
    const result = await crearGasto(formData)
    if (result?.error) {
      setError(result.error)
      showToast(result.error, 'error')
    } else if (tienda) {
      setShowForm(false)
      setShowProveedorForm(false)
      setProveedorIdSeleccionado('')
      await fetchGastos(tienda.id, mesActual)
      showToast('Gasto registrado')
    }
    setSubmitting(false)
  }

  async function handleProveedorCreado(prov: { id: string; nombre: string }) {
    if (!tienda) return
    const supabase = createClient()
    const { data } = await supabase
      .from('proveedores')
      .select('id, nombre')
      .eq('tienda_id', tienda.id)
      .order('nombre')
    const lista = (data ?? []) as Proveedor[]
    setProveedores(lista)
    const nuevo = lista.find((p) => p.nombre === prov.nombre)
    if (nuevo) setProveedorIdSeleccionado(nuevo.id)
    setShowProveedorForm(false)
    showToast('Proveedor creado y seleccionado')
  }

  async function handleEliminar(id: string) {
    if (!confirm('¿Eliminar este gasto?')) return
    await eliminarGasto(id)
    if (tienda) await fetchGastos(tienda.id, mesActual)
    showToast('Gasto eliminado')
  }

  const totalMes = useMemo(() => gastos.reduce((acc, gasto) => acc + gasto.monto, 0), [gastos])

  const resumenCategorias = useMemo(() => {
    const totals = new Map<string, number>()
    gastos.forEach((gasto) => {
      totals.set(gasto.categoria, (totals.get(gasto.categoria) ?? 0) + gasto.monto)
    })
    return Array.from(totals.entries())
  }, [gastos])
  const gastosFiltrados = chipCategoria === 'todos' ? gastos : gastos.filter((g) => g.categoria === chipCategoria)
  const conteosGastos = useMemo(() => {
    const conteos: Record<string, number> = { todos: gastos.length }
    CATEGORIAS_GASTO.forEach((cat) => {
      conteos[cat] = gastos.filter((g) => g.categoria === cat).length
    })
    return conteos
  }, [gastos])

  if (tiendaLoading || loading) {
    return <ModuleTableSkeleton maxWidthClass="max-w-6xl" rows={8} />
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A2F]">Gastos</h1>
          <p className="text-sm text-[#1A1510]/50 mt-0.5">{gastos.length} gastos en el mes</p>
        </div>
        <div className="flex gap-3">
          <input
            type="month"
            value={mesActual}
            onChange={(e) => {
              setMesActual(e.target.value)
              setChipCategoria('todos')
            }}
            className={inputClass}
          />
          <button
            onClick={() => {
              setShowForm(true)
              setError(null)
              setShowProveedorForm(false)
              setProveedorIdSeleccionado('')
            }}
            className="bg-[#C4622D] hover:bg-[#E8845A] text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            + Nuevo gasto
          </button>
        </div>
      </div>

      <ImportCSV
        onDescargarPlantilla={descargarPlantillaGastos}
        onProcesar={async (filas) => {
          const res = await importarGastos(filas)
          if (res.exitosos > 0) {
            showToast(`${res.exitosos} gasto${res.exitosos > 1 ? 's' : ''} importado${res.exitosos > 1 ? 's' : ''}`)
          }
          if (res.exitosos > 0 && tienda) await fetchGastos(tienda.id, mesActual)
          return res
        }}
        descripcion="Categorías válidas: Producción, Empaque, Envíos, Marketing, Plataformas, Otro · Fechas: DD/MM/YYYY o YYYY-MM-DD"
      />

      <div className="bg-[#F9EDE5] rounded-2xl border border-[#EDE5DC] p-5 mb-6" data-categorias={resumenCategorias.length}>
        <p className="text-xs uppercase tracking-wide text-[#8A7D72]">Total del mes</p>
        <p className="text-3xl font-bold text-[#1E3A2F] mt-1">{formatCOP(totalMes)}</p>
        <p className="text-xs text-[#8A7D72] mt-2">
          {gastos.length} gasto{gastos.length !== 1 ? 's' : ''} registrado{gastos.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setChipCategoria('todos')}
          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
            chipCategoria === 'todos'
              ? 'border-[#1E3A2F] bg-[#1E3A2F] text-white'
              : 'border-[#EDE5DC] text-[#4A3F35] bg-white hover:border-[#C4B8B0]'
          }`}
        >
          Todos ({gastos.length})
        </button>
        {CATEGORIAS_GASTO.filter((cat) => conteosGastos[cat] > 0).map((cat) => (
          <button
            key={cat}
            onClick={() => setChipCategoria(cat)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
              chipCategoria === cat
                ? 'border-[#C4622D] bg-[#C4622D] text-white'
                : 'border-[#EDE5DC] text-[#4A3F35] bg-white hover:border-[#C4B8B0]'
            }`}
          >
            {cat} ({conteosGastos[cat]})
          </button>
        ))}
      </div>
      {chipCategoria !== 'todos' && (
        <p className="text-xs text-[#8A7D72] mb-4">
          Mostrando {gastosFiltrados.length} gasto{gastosFiltrados.length !== 1 ? 's' : ''} ·{' '}
          {formatCOP(gastosFiltrados.reduce((s, g) => s + g.monto, 0))} en {chipCategoria}
        </p>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl border border-[#1A1510]/8 p-6 mb-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#1E3A2F] mb-4">Nuevo gasto</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              await handleSubmit(new FormData(e.currentTarget))
            }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-4"
          >
            <div className="sm:col-span-2">
              <label className={labelClass}>Descripción</label>
              <input
                name="descripcion"
                type="text"
                required
                className={inputClass}
                placeholder="Ej: Compra de empaques"
              />
            </div>
            <div>
              <label className={labelClass}>Monto COP</label>
              <input name="monto" type="number" min="0" required className={inputClass} placeholder="120000" />
            </div>
            <div>
              <label className={labelClass}>Categoría</label>
              <select name="categoria" required className={inputClass} defaultValue="">
                <option value="" disabled>
                  Selecciona categoría
                </option>
                <option value="Producción">Producción</option>
                <option value="Empaque">Empaque</option>
                <option value="Envíos">Envíos</option>
                <option value="Marketing">Marketing</option>
                <option value="Plataformas">Plataformas</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Fecha</label>
              <input name="fecha" type="date" required defaultValue={today} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Proveedor (opcional)</label>
              {!showProveedorForm ? (
                <div className="flex gap-2">
                  <select
                    name="proveedor_id"
                    value={proveedorIdSeleccionado}
                    onChange={(e) => setProveedorIdSeleccionado(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Sin proveedor</option>
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowProveedorForm(true)}
                    className="text-xs text-[#C4622D] hover:underline whitespace-nowrap font-medium px-2"
                  >
                    + Nuevo
                  </button>
                </div>
              ) : (
                <ProveedorInlineForm
                  onCreado={(prov) => void handleProveedorCreado(prov)}
                  onCancelar={() => setShowProveedorForm(false)}
                />
              )}
            </div>
            <input type="hidden" name="proveedor_id" value={proveedorIdSeleccionado} />
            {error && (
              <p className="sm:col-span-4 text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg">{error}</p>
            )}
            <div className="sm:col-span-4 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setShowProveedorForm(false)
                  setProveedorIdSeleccionado('')
                }}
                className="text-sm text-[#1A1510]/60 hover:text-[#1A1510] px-4 py-2 rounded-lg border border-[#1A1510]/20 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-[#C4622D] hover:bg-[#E8845A] text-white text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50"
              >
                {submitting ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {gastos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#1A1510]/8 p-12 text-center shadow-sm">
          <p className="text-[#1A1510]/40 text-sm">No tienes gastos registrados para este mes.</p>
          <button
            onClick={() => {
              setShowForm(true)
              setShowProveedorForm(false)
              setProveedorIdSeleccionado('')
            }}
            className="mt-3 text-sm text-[#C4622D] font-medium hover:underline"
          >
            Crea el primero
          </button>
        </div>
      ) : gastosFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#1A1510]/8 p-12 text-center shadow-sm">
          <p className="text-[#1A1510]/40 text-sm">No hay gastos en esta categoría para este mes.</p>
          <button onClick={() => setChipCategoria('todos')} className="mt-2 text-sm text-[#C4622D] font-medium hover:underline">
            Ver todos
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#1A1510]/8 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-[#1A1510]/8 bg-[#FAF6F0]">
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  Fecha
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  Descripción
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  Categoría
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  Monto
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {gastosFiltrados.map((gasto, i) => (
                <tr
                  key={gasto.id}
                  className={`border-b border-[#1A1510]/5 hover:bg-[#FAF6F0]/60 transition ${
                    i === gastosFiltrados.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <td className="px-5 py-4 text-[#1A1510]/70">{formatFecha(gasto.fecha)}</td>
                  <td className="px-5 py-4 font-medium text-[#1A1510]">{gasto.descripcion}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${categoriaBadgeClass(gasto.categoria)}`}
                    >
                      {gasto.categoria}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right text-[#1A1510]/85">{formatCOP(gasto.monto)}</td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => handleEliminar(gasto.id)}
                      className="text-xs text-[#1A1510]/40 hover:text-red-500 transition"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
