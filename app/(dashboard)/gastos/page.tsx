'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTienda } from '@/lib/hooks/useTienda'
import { actualizarGasto, crearGasto, eliminarGasto } from './actions'
import { CATEGORIAS_GASTO, type Gasto, type Proveedor, type TipoGasto } from '@/lib/types'
import ImportCSV from '@/components/ui/ImportCSV'
import { Tooltip } from '@/components/ui/Tooltip'
import ProveedorInlineForm from '@/components/ui/ProveedorInlineForm'
import Toast from '@/components/ui/Toast'
import { ModuleTableSkeleton } from '@/components/skeletons/ModuleTableSkeleton'
import { descargarCSV } from '@/lib/csv'
import { useToast } from '@/lib/hooks/useToast'
import { importarGastos } from './actions-import'

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-[#1A1510]/20 bg-white text-[#1A1510] placeholder:text-[#1A1510]/40 focus:outline-none focus:ring-2 focus:ring-[#C4622D]/40 focus:border-[#C4622D] transition text-sm'
const labelClass = 'block text-xs font-medium text-[#1A1510]/60 mb-1'

const badgeTipo: Record<TipoGasto, { bg: string; text: string; label: string }> = {
  variable: { bg: '#FFF3E0', text: '#E65100', label: 'Variable' },
  fijo: { bg: '#E8F5EE', text: '#1E3A2F', label: 'Fijo' },
  financiero: { bg: '#EEF3FF', text: '#3B5BDB', label: 'Financiero' },
  compra_inventario: { bg: '#EEF9F1', text: '#256C45', label: 'Compra inventario' },
}

const LEGACY_CATEGORIAS_VARIABLE = new Set([
  'Producción',
  'Empaque',
  'Envíos',
  'Marketing',
  'Plataformas',
  'Otro',
])

const chipsTipo = [
  { key: 'todos', label: 'Todos' },
  { key: 'variable', label: 'Variables' },
  { key: 'fijo', label: 'Fijos' },
  { key: 'financiero', label: 'Financieros' },
  { key: 'compra_inventario', label: 'Compras inventario' },
] as const

function gastoCoincideTipoChip(g: Gasto, key: string): boolean {
  if (key === 'todos') return true
  if (key === 'variable') {
    if (g.tipo_gasto === 'variable') return true
    if (!g.tipo_gasto && LEGACY_CATEGORIAS_VARIABLE.has(g.categoria)) return true
    return false
  }
  if (key === 'fijo') return g.tipo_gasto === 'fijo'
  if (key === 'financiero') return g.tipo_gasto === 'financiero'
  if (key === 'compra_inventario') return g.tipo_gasto === 'compra_inventario'
  return true
}

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
    ['fecha', 'descripcion', 'categoria', 'tipo', 'monto'],
    ['15/01/2026', 'Arriendo local', 'Arriendo', 'fijo', '1500000'],
    ['20/01/2026', 'Empaques kraft', 'Empaque', 'variable', '85000'],
    ['05/01/2026', 'Cuota crédito banco', 'Financiero', 'financiero', '320000'],
    ['10/01/2026', 'Compra tela algodón', 'Producción', 'compra_inventario', '450000'],
  ])
}

function categoriaBadgeClass(categoria: string) {
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
      return 'bg-[#EDE5DC] text-[#4A3F35]'
  }
}

function resetFormularioGasto(
  setTipoGasto: (v: TipoGasto | '') => void,
  setSubcategoria: (v: string) => void,
) {
  setTipoGasto('')
  setSubcategoria('')
}

function esTipoGasto(t: unknown): t is TipoGasto {
  return t === 'variable' || t === 'fijo' || t === 'financiero' || t === 'compra_inventario'
}

/** Valor inicial del campo nota de categoría al cargar un gasto para edición */
function notaCategoriaDesdeGasto(g: Gasto): string {
  if (g.subcategoria && g.categoria !== g.subcategoria) return g.categoria
  if (!g.subcategoria) return g.categoria
  return ''
}

export default function GastosPage() {
  const { tienda, loading: tiendaLoading, canViewFinanzas, canEdit } = useTienda()
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showProveedorForm, setShowProveedorForm] = useState(false)
  const [proveedorIdSeleccionado, setProveedorIdSeleccionado] = useState('')
  const [mesActual, setMesActual] = useState(() => {
    const hoy = new Date()
    const local = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000)
    return local.toISOString().slice(0, 7)
  })
  const [chipTipo, setChipTipo] = useState<string>('todos')
  const [editando, setEditando] = useState<Gasto | null>(null)
  const [tipoGasto, setTipoGasto] = useState<TipoGasto | ''>('')
  const [subcategoria, setSubcategoria] = useState('')
  const [form, setForm] = useState({
    descripcion: '',
    monto: '',
    fecha: '',
    categoria: '',
  })
  const today = useMemo(() => {
    const hoy = new Date()
    const local = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000)
    return local.toISOString().slice(0, 10)
  }, [])
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
    if (!tipoGasto || !subcategoria) {
      setError('Selecciona tipo de gasto y una subcategoría.')
      showToast('Selecciona tipo de gasto y una subcategoría.', 'error')
      return
    }
    setSubmitting(true)
    setError(null)
    formData.set('proveedor_id', proveedorIdSeleccionado)
    formData.set('tipo_gasto', tipoGasto)
    formData.set('subcategoria', subcategoria)

    if (editando) {
      const result = await actualizarGasto(editando.id, formData)
      if (result?.error) {
        setError(result.error)
        showToast(result.error, 'error')
      } else if (tienda) {
        setShowForm(false)
        setShowProveedorForm(false)
        setProveedorIdSeleccionado('')
        setEditando(null)
        resetFormularioGasto(setTipoGasto, setSubcategoria)
        setForm({ descripcion: '', monto: '', fecha: today, categoria: '' })
        await fetchGastos(tienda.id, mesActual)
        showToast('Gasto actualizado', 'success')
      }
    } else {
      const result = await crearGasto(formData)
      if (result?.error) {
        setError(result.error)
        showToast(result.error, 'error')
      } else if (tienda) {
        setShowForm(false)
        setShowProveedorForm(false)
        setProveedorIdSeleccionado('')
        resetFormularioGasto(setTipoGasto, setSubcategoria)
        setForm({ descripcion: '', monto: '', fecha: today, categoria: '' })
        await fetchGastos(tienda.id, mesActual)
        showToast('Gasto registrado', 'success')
      }
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
      const clave = gasto.subcategoria || gasto.categoria
      totals.set(clave, (totals.get(clave) ?? 0) + gasto.monto)
    })
    return Array.from(totals.entries())
  }, [gastos])

  const gastosFiltrados = useMemo(
    () => (chipTipo === 'todos' ? gastos : gastos.filter((g) => gastoCoincideTipoChip(g, chipTipo))),
    [gastos, chipTipo],
  )

  const conteosPorTipo = useMemo(() => {
    const conteos: Record<string, number> = { todos: gastos.length }
    for (const c of chipsTipo) {
      if (c.key === 'todos') continue
      conteos[c.key] = gastos.filter((g) => gastoCoincideTipoChip(g, c.key)).length
    }
    return conteos
  }, [gastos])

  const chipLabelActivo = chipsTipo.find((c) => c.key === chipTipo)?.label ?? chipTipo

  if (tiendaLoading || loading) {
    return <ModuleTableSkeleton maxWidthClass="max-w-6xl" rows={8} />
  }

  if (!canViewFinanzas) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-[#8A7D72] text-sm">No tienes permisos para ver esta sección.</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto" style={{ background: 'var(--color-background)' }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
            Gastos
          </h1>
          <p className="text-sm text-[#1A1510]/50 mt-0.5">{gastos.length} gastos en el mes</p>
        </div>
        <div className="flex gap-3">
          <input
            type="month"
            value={mesActual}
            onChange={(e) => {
              setMesActual(e.target.value)
              setChipTipo('todos')
            }}
            className={inputClass}
          />
          <button
            onClick={() => {
              setEditando(null)
              setShowForm(true)
              setError(null)
              setShowProveedorForm(false)
              setProveedorIdSeleccionado('')
              resetFormularioGasto(setTipoGasto, setSubcategoria)
              setForm({ descripcion: '', monto: '', fecha: today, categoria: '' })
            }}
            className="btn-primary text-white text-sm font-semibold px-4 py-2 rounded-lg"
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
        descripcion="CSV: fecha, descripcion, categoria (libre), tipo (variable | fijo | financiero | compra_inventario), monto. Fechas: DD/MM/YYYY o YYYY-MM-DD"
      />

      <div
        className="bg-[#F9EDE5] rounded-2xl border border-[#EDE5DC] p-5 mb-6"
        style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)' }}
        data-categorias={resumenCategorias.length}
      >
        <p className="text-xs uppercase tracking-wide text-[#8A7D72]">Total del mes</p>
        <p className="text-3xl font-bold text-[#1E3A2F] mt-1">{formatCOP(totalMes)}</p>
        <p className="text-xs text-[#8A7D72] mt-2">
          {gastos.length} gasto{gastos.length !== 1 ? 's' : ''} registrado{gastos.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {chipsTipo.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setChipTipo(c.key)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
              chipTipo === c.key
                ? 'border-[#1E3A2F] bg-[#1E3A2F] text-white'
                : 'border-[#EDE5DC] text-[#4A3F35] bg-white hover:border-[#C4B8B0]'
            }`}
          >
            {c.label} ({conteosPorTipo[c.key] ?? 0})
          </button>
        ))}
      </div>
      {chipTipo !== 'todos' && (
        <p className="text-xs text-[#8A7D72] mb-4">
          Mostrando {gastosFiltrados.length} gasto{gastosFiltrados.length !== 1 ? 's' : ''} ·{' '}
          {formatCOP(gastosFiltrados.reduce((s, g) => s + g.monto, 0))} en {chipLabelActivo}
        </p>
      )}

      {showForm && (
        <div
          className="bg-white rounded-2xl border border-[#1A1510]/8 p-6 mb-6 shadow-sm"
          style={{ background: 'var(--color-surface)' }}
        >
          <h2 className="text-base font-semibold text-[#1E3A2F] mb-4">{editando ? 'Editar gasto' : 'Nuevo gasto'}</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              await handleSubmit(new FormData(e.currentTarget))
            }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-4"
          >
            <div className="sm:col-span-4">
              <label className={labelClass}>Tipo de gasto</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(CATEGORIAS_GASTO) as [TipoGasto, (typeof CATEGORIAS_GASTO)[TipoGasto]][]).map(
                  ([tipo, info]) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => {
                        setTipoGasto((prevTipo) => {
                          if (tipo !== prevTipo) setSubcategoria('')
                          return tipo
                        })
                      }}
                      className="px-3 py-2.5 rounded-xl border text-sm font-medium transition text-center"
                      style={{
                        background: tipoGasto === tipo ? 'var(--color-primary)' : 'var(--color-surface)',
                        color: tipoGasto === tipo ? 'white' : 'var(--color-text)',
                        borderColor: tipoGasto === tipo ? 'var(--color-primary)' : 'var(--color-border)',
                      }}
                    >
                      <span className="block">{info.label}</span>
                      {tipo === 'compra_inventario' && (
                        <span className="block text-[11px] mt-0.5 opacity-80">Aparece en flujo de caja, no en P&L</span>
                      )}
                    </button>
                  ),
                )}
              </div>
            </div>
            {tipoGasto === 'compra_inventario' && (
              <div
                className="sm:col-span-4 rounded-xl p-3 text-xs"
                style={{ background: 'var(--color-accent-pale)', border: '1px solid var(--color-border)' }}
              >
                <p className="font-semibold" style={{ color: 'var(--color-accent)' }}>📦 Compra de inventario</p>
                <p className="mt-1" style={{ color: 'var(--color-text-soft)' }}>
                  Esta compra aparecerá en tu Flujo de caja como salida de dinero, pero NO en tu P&amp;L como gasto.
                  El costo del producto se registra en el P&amp;L cuando se vende (CPV).
                </p>
              </div>
            )}
            {tipoGasto && (
              <div className="sm:col-span-4">
                <label className={labelClass}>Subcategoría</label>
                <select
                  value={subcategoria}
                  onChange={(e) => setSubcategoria(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Selecciona una subcategoría</option>
                  {CATEGORIAS_GASTO[tipoGasto].subcategorias.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className={labelClass}>Descripción</label>
              <input
                name="descripcion"
                type="text"
                required
                className={inputClass}
                placeholder="Ej: Bolsas kraft para pedidos de mayo"
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClass}>Monto COP</label>
              <input
                name="monto"
                type="number"
                min="0"
                step="1"
                required
                className={inputClass}
                placeholder="120000"
                value={form.monto}
                onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClass}>Fecha</label>
              <input
                name="fecha"
                type="date"
                required
                className={inputClass}
                value={form.fecha}
                onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-4">
              <label className={labelClass}>Nota de categoría (opcional)</label>
              <input
                name="categoria"
                type="text"
                className={inputClass}
                placeholder="Etiqueta libre además de la subcategoría"
                value={form.categoria}
                onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Proveedor (opcional)</label>
              {!showProveedorForm ? (
                <div className="flex gap-2">
                  <select
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
                  setEditando(null)
                  setShowProveedorForm(false)
                  setProveedorIdSeleccionado('')
                  resetFormularioGasto(setTipoGasto, setSubcategoria)
                  setForm({ descripcion: '', monto: '', fecha: today, categoria: '' })
                }}
                className="text-sm text-[#1A1510]/60 hover:text-[#1A1510] px-4 py-2 rounded-lg border border-[#1A1510]/20 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {submitting ? 'Guardando...' : editando ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {gastos.length === 0 ? (
        <div
          className="bg-white rounded-2xl border border-[#1A1510]/8 p-12 text-center shadow-sm"
          style={{ background: 'var(--color-surface)' }}
        >
          <p className="text-[#1A1510]/40 text-sm">No tienes gastos registrados para este mes.</p>
          <button
            onClick={() => {
              setEditando(null)
              setShowForm(true)
              setShowProveedorForm(false)
              setProveedorIdSeleccionado('')
              resetFormularioGasto(setTipoGasto, setSubcategoria)
              setForm({ descripcion: '', monto: '', fecha: today, categoria: '' })
            }}
            className="mt-3 text-sm text-[#C4622D] font-medium hover:underline"
          >
            Crea el primero
          </button>
        </div>
      ) : gastosFiltrados.length === 0 ? (
        <div
          className="bg-white rounded-2xl border border-[#1A1510]/8 p-12 text-center shadow-sm"
          style={{ background: 'var(--color-surface)' }}
        >
          <p className="text-[#1A1510]/40 text-sm">No hay gastos de este tipo para este mes.</p>
          <button onClick={() => setChipTipo('todos')} className="mt-2 text-sm text-[#C4622D] font-medium hover:underline">
            Ver todos
          </button>
        </div>
      ) : (
        <div
          className="bg-white rounded-2xl border border-[#1A1510]/8 shadow-sm overflow-hidden"
          style={{ background: 'var(--color-surface)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="border-b border-[#1A1510]/8 bg-[#FAF6F0]" style={{ background: 'var(--color-background)' }}>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                    Fecha
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                    Descripción
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                    Categoría
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                    <span className="inline-flex items-center gap-0">
                      Tipo
                      <Tooltip texto="Variable: cambia según ventas. Fijo: se paga siempre. Financiero: intereses y créditos. Compra inventario: aparece solo en flujo de caja, no en P&L" />
                    </span>
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
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                        {gasto.descripcion}
                      </p>
                      {gasto.subcategoria && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-soft)' }}>
                          {gasto.subcategoria}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${categoriaBadgeClass(gasto.categoria)}`}
                      >
                        {gasto.categoria}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {gasto.tipo_gasto && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: badgeTipo[gasto.tipo_gasto].bg,
                            color: badgeTipo[gasto.tipo_gasto].text,
                          }}
                        >
                          {badgeTipo[gasto.tipo_gasto].label}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right text-[#1A1510]/85">{formatCOP(gasto.monto)}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditando(gasto)
                              setForm({
                                descripcion: gasto.descripcion,
                                monto: String(gasto.monto),
                                fecha: gasto.fecha.slice(0, 10),
                                categoria: notaCategoriaDesdeGasto(gasto),
                              })
                              setTipoGasto(esTipoGasto(gasto.tipo_gasto) ? gasto.tipo_gasto : '')
                              setSubcategoria(gasto.subcategoria ?? '')
                              setProveedorIdSeleccionado(gasto.proveedor_id ?? '')
                              setShowForm(true)
                              setError(null)
                              setShowProveedorForm(false)
                              window.scrollTo({ top: 0, behavior: 'smooth' })
                            }}
                            className="text-sm font-medium hover:underline"
                            style={{ color: 'var(--color-primary)' }}
                          >
                            Editar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleEliminar(gasto.id)}
                          className="text-xs text-[#1A1510]/40 hover:text-red-500 transition"
                        >
                          Eliminar
                        </button>
                      </div>
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
