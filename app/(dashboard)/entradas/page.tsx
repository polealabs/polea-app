'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTienda } from '@/lib/hooks/useTienda'
import { crearEntradas, eliminarEntrada } from './actions'
import type { Entrada, Producto, Proveedor } from '@/lib/types'
import ConfirmModal from '@/components/ui/ConfirmModal'
import ImportCSV from '@/components/ui/ImportCSV'
import ProveedorInlineForm from '@/components/ui/ProveedorInlineForm'
import Toast from '@/components/ui/Toast'
import { ModuleTableSkeleton } from '@/components/skeletons/ModuleTableSkeleton'
import { descargarCSV } from '@/lib/csv'
import { useToast } from '@/lib/hooks/useToast'
import { importarEntradas } from './actions-import'

type EntradaConProducto = Entrada & {
  producto_nombre: string
  producto_tipo: Producto['tipo']
}

type LineaForm = {
  id: string
  producto_id: string
  cantidad: string
  costo_unitario: string
}

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

function tipoBadgeClass(tipo: Producto['tipo']) {
  switch (tipo) {
    case 'Producto terminado':
      return 'bg-[#1E3A2F] text-white'
    case 'Materia prima':
      return 'bg-[#D4A853] text-[#1A1510]'
    case 'Empaque':
      return 'bg-[#E8845A] text-white'
    case 'Material POP':
      return 'bg-[#FAF6F0] text-[#C4622D] border border-[#C4622D]'
    default:
      return 'bg-[#6B7280] text-white'
  }
}

function descargarPlantillaEntradas() {
  descargarCSV('plantilla_entradas.csv', [
    ['producto_nombre', 'cantidad', 'costo_unitario', 'fecha'],
    ['Aretes luna plateados', '10', '45000', '2026-01-15'],
    ['Collar sol dorado', '5', '65000', '2026-01-15'],
    ['Anillo minimalista', '8', '35000', '2026-02-01'],
  ])
}

function nuevaLinea(): LineaForm {
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    producto_id: '',
    cantidad: '',
    costo_unitario: '',
  }
}

export default function EntradasPage() {
  const { tienda, loading: tiendaLoading, canEdit } = useTienda()
  const [productos, setProductos] = useState<Producto[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [entradas, setEntradas] = useState<EntradaConProducto[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showProveedorForm, setShowProveedorForm] = useState(false)
  const [proveedorIdSeleccionado, setProveedorIdSeleccionado] = useState('')
  const [mesActual, setMesActual] = useState(() => new Date().toISOString().slice(0, 7))
  const [busqueda, setBusqueda] = useState('')
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [fecha, setFecha] = useState(today)
  const [lineas, setLineas] = useState<LineaForm[]>([nuevaLinea()])
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const { toasts, showToast, removeToast } = useToast()

  const fetchData = useCallback(async (tiendaId: string, mes: string) => {
    const supabase = createClient()
    const start = `${mes}-01`
    const nextMonth = new Date(`${mes}-01T12:00:00`)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    const end = nextMonth.toISOString().slice(0, 10)

    const [{ data: productosData }, { data: entradasData }, { data: provData }] = await Promise.all([
      supabase.from('productos').select('*').eq('tienda_id', tiendaId).order('nombre'),
      supabase
        .from('entradas')
        .select('*, productos(nombre, tipo)')
        .eq('tienda_id', tiendaId)
        .gte('fecha', start)
        .lt('fecha', end)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('proveedores').select('id, nombre').eq('tienda_id', tiendaId).order('nombre'),
    ])

    setProductos(productosData ?? [])
    setProveedores((provData ?? []) as Proveedor[])
    const entradasConProducto: EntradaConProducto[] = (entradasData ?? []).map(
      (
        entrada: Entrada & {
          productos?: { nombre?: string; tipo?: Producto['tipo'] } | { nombre?: string; tipo?: Producto['tipo'] }[] | null
        },
      ) => {
        const producto = Array.isArray(entrada.productos) ? entrada.productos[0] : entrada.productos
        return {
          ...entrada,
          producto_nombre: producto?.nombre ?? 'Producto',
          producto_tipo: (producto?.tipo as Producto['tipo']) ?? 'Producto terminado',
        }
      },
    )
    setEntradas(entradasConProducto)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!tienda) return
    const tiendaId = tienda.id
    const mes = mesActual
    async function load() {
      await fetchData(tiendaId, mes)
    }
    void load()
  }, [fetchData, mesActual, tienda])

  function actualizarLinea(id: string, patch: Partial<LineaForm>) {
    setLineas((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  function agregarLinea() {
    setLineas((prev) => [...prev, nuevaLinea()])
  }

  function quitarLinea(id: string) {
    setLineas((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== id)))
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

  async function handleGuardar() {
    if (!tienda || !fecha) return
    setSubmitting(true)
    setError(null)

    const payload = lineas
      .map((l) => ({
        producto_id: l.producto_id,
        proveedor_id: proveedorIdSeleccionado || undefined,
        cantidad: Number(l.cantidad),
        costo_unitario: Number(l.costo_unitario),
        fecha,
      }))
      .filter((l) => l.producto_id && !Number.isNaN(l.cantidad) && l.cantidad >= 1 && !Number.isNaN(l.costo_unitario) && l.costo_unitario >= 0)

    if (payload.length === 0) {
      const mensaje = 'Agrega al menos una línea con producto, cantidad y costo válidos.'
      setError(mensaje)
      showToast(mensaje, 'error')
      setSubmitting(false)
      return
    }

    const result = await crearEntradas(payload)
    if (result?.error) {
      setError(result.error)
      showToast(result.error, 'error')
    } else {
      setShowForm(false)
      setShowProveedorForm(false)
      setProveedorIdSeleccionado('')
      setLineas([nuevaLinea()])
      await fetchData(tienda.id, mesActual)
      showToast('Entrada registrada')
    }
    setSubmitting(false)
  }

  async function confirmarEliminarEntrada() {
    if (!confirmDeleteId) return
    await eliminarEntrada(confirmDeleteId)
    setConfirmDeleteId(null)
    if (tienda) await fetchData(tienda.id, mesActual)
    showToast('Entrada eliminada')
  }

  const entradasFiltradas =
    busqueda.trim() === ''
      ? entradas
      : entradas.filter((e) =>
          e.producto_nombre.toLowerCase().includes(busqueda.toLowerCase()),
        )

  if (tiendaLoading || loading) {
    return <ModuleTableSkeleton maxWidthClass="max-w-5xl" rows={8} />
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto" style={{ background: 'var(--color-background)' }}>
      <ConfirmModal
        open={confirmDeleteId !== null}
        title="Eliminar entrada"
        message="¿Eliminar este registro de entrada? El stock puede verse afectado según las reglas de tu base de datos."
        confirmLabel="Eliminar"
        danger
        onConfirm={confirmarEliminarEntrada}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>Entradas</h1>
          <p className="text-sm text-[#1A1510]/50 mt-0.5">Últimas {entradas.length} entradas registradas</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={mesActual}
            onChange={(e) => setMesActual(e.target.value)}
            className={inputClass}
          />
          {canEdit && (
            <button
              onClick={() => {
                setShowForm(true)
                setError(null)
                setShowProveedorForm(false)
                setProveedorIdSeleccionado('')
                setLineas([nuevaLinea()])
              }}
              className="btn-primary text-white text-sm font-semibold px-4 py-2 rounded-lg"
              disabled={productos.length === 0}
            >
              + Nueva entrada
            </button>
          )}
        </div>
      </div>

      {canEdit && (
        <ImportCSV
          onDescargarPlantilla={descargarPlantillaEntradas}
          onProcesar={async (filas) => {
            const res = await importarEntradas(filas)
            if (res.exitosos > 0) {
              showToast(`${res.exitosos} entrada${res.exitosos > 1 ? 's' : ''} importada${res.exitosos > 1 ? 's' : ''}`)
            }
            if (res.exitosos > 0 && tienda) await fetchData(tienda.id, mesActual)
            return res
          }}
          descripcion="El nombre del producto debe coincidir exactamente. Fechas aceptadas: DD/MM/YYYY o YYYY-MM-DD"
        />
      )}

      <div
        className="bg-[#FAF6F0] rounded-2xl border border-[#EDE5DC] p-5 mb-6"
        style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)' }}
      >
        <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-soft)' }}>Total entradas del mes</p>
        <p className="text-2xl font-serif font-medium" style={{ color: 'var(--color-primary)' }}>
          {formatCOP(entradas.reduce((s, e) => s + e.cantidad * e.costo_unitario, 0))}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-soft)' }}>
          {entradas.length} entrada{entradas.length !== 1 ? 's' : ''} registrada{entradas.length !== 1 ? 's' : ''}
        </p>
      </div>

      <input
        type="text"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por nombre de producto..."
        className={inputClass + ' mb-4'}
      />

      {productos.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#1A1510]/8 p-12 text-center shadow-sm mb-6" style={{ background: 'var(--color-surface)' }}>
          <p className="text-[#1A1510]/40 text-sm">Necesitas crear al menos un producto antes de registrar entradas.</p>
        </div>
      )}

      {canEdit && showForm && productos.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#1A1510]/8 p-6 mb-6 shadow-sm" style={{ background: 'var(--color-surface)' }}>
          <h2 className="text-base font-semibold text-[#1E3A2F] mb-4">Nueva entrada de stock</h2>
          <div className="mb-4">
            <label className={labelClass}>Fecha (todas las líneas)</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={`${inputClass} max-w-xs`}
              required
            />
          </div>

          <div className="mb-4 max-w-lg">
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

          <div className="space-y-4">
            {lineas.map((linea, idx) => (
              <div
                key={linea.id}
                className="grid grid-cols-1 gap-3 sm:grid-cols-12 items-end border border-[#1A1510]/8 rounded-xl p-4 bg-[#FAF6F0]/40"
              >
                <div className="sm:col-span-5">
                  <label className={labelClass}>Producto</label>
                  <select
                    value={linea.producto_id}
                    onChange={(e) => actualizarLinea(linea.id, { producto_id: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Selecciona un producto</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={linea.cantidad}
                    onChange={(e) => actualizarLinea(linea.id, { cantidad: e.target.value })}
                    className={inputClass}
                    placeholder="10"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className={labelClass}>Costo unitario (COP)</label>
                  <input
                    type="number"
                    min="0"
                    value={linea.costo_unitario}
                    onChange={(e) => actualizarLinea(linea.id, { costo_unitario: e.target.value })}
                    className={inputClass}
                    placeholder="15000"
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end pb-1">
                  {lineas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => quitarLinea(linea.id)}
                      className="text-sm text-[#1A1510]/50 hover:text-red-500 px-2"
                      aria-label={`Quitar línea ${idx + 1}`}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={agregarLinea}
            className="mt-4 text-sm font-medium text-[#C4622D] hover:underline"
          >
            + Agregar producto
          </button>

          {error && <p className="mt-4 text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg">{error}</p>}

          <div className="mt-6 flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setShowProveedorForm(false)
                setProveedorIdSeleccionado('')
                setLineas([nuevaLinea()])
              }}
              className="text-sm text-[#1A1510]/60 hover:text-[#1A1510] px-4 py-2 rounded-lg border border-[#1A1510]/20 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleGuardar()}
              disabled={submitting}
              className="btn-primary text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {entradas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#1A1510]/8 p-12 text-center shadow-sm" style={{ background: 'var(--color-surface)' }}>
          <p className="text-[#1A1510]/40 text-sm">Aún no tienes entradas registradas.</p>
          {productos.length > 0 && (
            <button
              onClick={() => {
                setShowForm(true)
                setShowProveedorForm(false)
                setProveedorIdSeleccionado('')
                setLineas([nuevaLinea()])
              }}
              className="mt-3 text-sm text-[#C4622D] font-medium hover:underline"
            >
              Crea la primera
            </button>
          )}
        </div>
      ) : entradasFiltradas.length === 0 && busqueda.trim() !== '' ? (
        <div className="bg-white rounded-2xl border border-[#EDE5DC] p-12 text-center shadow-sm" style={{ background: 'var(--color-surface)' }}>
          <p className="text-[#8A7D72] text-sm">No se encontraron entradas para &quot;{busqueda}&quot;</p>
          <button onClick={() => setBusqueda('')} className="mt-2 text-sm text-[#C4622D] font-medium hover:underline">
            Limpiar búsqueda
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#1A1510]/8 shadow-sm overflow-hidden" style={{ background: 'var(--color-surface)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-[#1A1510]/8 bg-[#FAF6F0]" style={{ background: 'var(--color-background)' }}>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  Fecha
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  Producto
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  Tipo
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  Cantidad
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  Costo unitario
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  Total entrada
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {entradasFiltradas.map((entrada, i) => (
                <tr
                  key={entrada.id}
                  className={`border-b border-[#1A1510]/5 hover:bg-[#FAF6F0]/60 transition ${
                    i === entradasFiltradas.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <td className="px-5 py-4 text-[#1A1510]/70">{formatFecha(entrada.fecha)}</td>
                  <td className="px-5 py-4 font-medium text-[#1A1510]">{entrada.producto_nombre}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tipoBadgeClass(entrada.producto_tipo)}`}
                    >
                      {entrada.producto_tipo}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right text-[#1A1510]/80">{entrada.cantidad}</td>
                  <td className="px-5 py-4 text-right text-[#1A1510]/80">{formatCOP(entrada.costo_unitario)}</td>
                  <td className="px-5 py-4 text-right font-semibold text-[#1E3A2F]">
                    {formatCOP(entrada.cantidad * entrada.costo_unitario)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(entrada.id)}
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
