'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTienda } from '@/lib/hooks/useTienda'
import { crearProducto, editarProducto, eliminarProducto } from './actions'
import type { Producto } from '@/lib/types'
import ConfirmModal from '@/components/ui/ConfirmModal'
import ImportCSV from '@/components/ui/ImportCSV'
import Toast from '@/components/ui/Toast'
import { ModuleTableSkeleton } from '@/components/skeletons/ModuleTableSkeleton'
import { descargarCSV } from '@/lib/csv'
import { useToast } from '@/lib/hooks/useToast'
import { importarProductos } from './actions-import'

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-[#1A1510]/20 bg-white text-[#1A1510] placeholder:text-[#1A1510]/40 focus:outline-none focus:ring-2 focus:ring-[#C4622D]/40 focus:border-[#C4622D] transition text-sm'
const labelClass = 'block text-xs font-medium text-[#1A1510]/60 mb-1'

const TIPOS: Producto['tipo'][] = [
  'Producto terminado',
  'Materia prima',
  'Empaque',
  'Material POP',
]

type FiltroStock = 'todos' | 'agotado' | 'bajo' | 'sin-movimiento'

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(n)
}

function descargarPlantillaProductos() {
  descargarCSV('plantilla_productos.csv', [
    ['nombre', 'precio_venta', 'stock_inicial', 'stock_minimo', 'sku', 'tipo'],
    ['Aretes luna plateados', '85000', '10', '3', 'ARG-001', 'Producto terminado'],
    ['Collar sol dorado', '120000', '5', '2', 'COL-002', 'Producto terminado'],
    ['Empaque kraft pequeño', '800', '50', '10', '', 'Empaque'],
    ['Resina epoxi 500ml', '35000', '3', '1', '', 'Materia prima'],
  ])
}

function stockEstadoBadge(p: Producto) {
  if (p.stock_actual < 0) {
    return (
      <span className="text-[10px] font-semibold text-[#C44040] bg-[#FDEAEA] px-2 py-0.5 rounded-full">
        Stock negativo
      </span>
    )
  }
  if (p.stock_actual === 0) {
    return (
      <span className="text-[10px] font-semibold text-[#C44040] bg-[#FDEAEA] px-2 py-0.5 rounded-full">
        Agotado
      </span>
    )
  }
  if (p.stock_actual > 0 && p.stock_actual <= p.stock_minimo) {
    return (
      <span className="text-[10px] font-semibold text-[#D4A853] bg-[#FBF3E0] px-2 py-0.5 rounded-full">
        Stock bajo
      </span>
    )
  }
  return (
    <span className="text-[10px] font-semibold text-[#3A7D5A] bg-[#E8F5EE] px-2 py-0.5 rounded-full">OK</span>
  )
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

export default function ProductosPage() {
  const { tienda, loading: tiendaLoading, canEdit, canDelete } = useTienda()
  const searchParams = useSearchParams()
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Producto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [feedbackVariant, setFeedbackVariant] = useState<'error' | 'warning'>('error')
  const [submitting, setSubmitting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroActivo, setFiltroActivo] = useState<FiltroStock>('todos')
  const [idsSinMovimiento, setIdsSinMovimiento] = useState<Set<string>>(new Set())
  const [ignorarFiltroQuery, setIgnorarFiltroQuery] = useState(false)
  const { toasts, showToast, removeToast } = useToast()

  const fetchProductos = useCallback(async (tiendaId: string) => {
    const supabase = createClient()
    const { data: productosData } = await supabase
      .from('productos')
      .select('*')
      .eq('tienda_id', tiendaId)
      .order('created_at', { ascending: false })
    const productos = productosData ?? []
    setProductos(productos)

    const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { data: ventasRecientes } = await supabase
      .from('venta_items')
      .select('producto_id')
      .eq('tienda_id', tiendaId)
      .gte('created_at', `${hace30}T00:00:00`)

    const idsConMovimiento = new Set((ventasRecientes ?? []).map((v) => v.producto_id))
    const sinMov = new Set(
      productos
        .filter((p) => p.stock_actual > 0 && !idsConMovimiento.has(p.id))
        .map((p) => p.id),
    )
    setIdsSinMovimiento(sinMov)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!tienda) return
    const tiendaId = tienda.id
    async function loadProductos() {
      await fetchProductos(tiendaId)
    }
    void loadProductos()
  }, [fetchProductos, tienda])

  const filtroQuery = searchParams.get('filtro')
  const filtroActivoReal: FiltroStock =
    !ignorarFiltroQuery && filtroQuery === 'stock-bajo'
      ? 'bajo'
      : !ignorarFiltroQuery && filtroQuery === 'sin-movimiento'
        ? 'sin-movimiento'
      : !ignorarFiltroQuery && filtroQuery === 'agotado'
        ? 'agotado'
        : filtroActivo

  async function handleSubmit(formData: FormData) {
    const esEdicion = Boolean(editando)
    setSubmitting(true)
    setError(null)
    setFeedbackVariant('error')

    const nombre = String(formData.get('nombre') ?? '')
      .trim()
      .replace(/\s+/g, ' ')
    const skuRaw = String(formData.get('sku') ?? '').trim()
    const sku = skuRaw === '' ? null : skuRaw
    const excludeId = editando?.id

    const nombreDup = productos.some(
      (p) =>
        p.id !== excludeId &&
        p.nombre
          .trim()
          .replace(/\s+/g, ' ')
          .toLowerCase() === nombre.toLowerCase(),
    )
    const skuDup =
      sku !== null &&
      productos.some(
        (p) =>
          p.id !== excludeId && (p.sku?.trim() ?? '') !== '' && (p.sku?.trim() ?? '') === sku,
      )

    if (nombreDup && skuDup) {
      const mensaje = 'Ya tienes otros productos con ese nombre y con ese SKU. Usa un nombre y un SKU distintos.'
      setError(mensaje)
      showToast(mensaje, 'error')
      setFeedbackVariant('warning')
      setSubmitting(false)
      return
    }
    if (nombreDup) {
      const mensaje = 'Ya existe un producto con ese nombre en tu tienda.'
      setError(mensaje)
      showToast(mensaje, 'error')
      setFeedbackVariant('warning')
      setSubmitting(false)
      return
    }
    if (skuDup) {
      const mensaje = 'Ya existe un producto con ese SKU en tu tienda.'
      setError(mensaje)
      showToast(mensaje, 'error')
      setFeedbackVariant('warning')
      setSubmitting(false)
      return
    }

    const result = editando
      ? await editarProducto(editando.id, formData)
      : await crearProducto(formData)
    if (result && 'error' in result && result.error) {
      setError(result.error)
      showToast(result.error, 'error')
      if ('warning' in result && result.warning === true) setFeedbackVariant('warning')
    } else {
      setShowForm(false)
      setEditando(null)
      if (tienda) await fetchProductos(tienda.id)
      showToast(esEdicion ? 'Producto actualizado' : 'Producto creado')
    }
    setSubmitting(false)
  }

  async function confirmarEliminar() {
    if (!confirmDelete) return
    await eliminarProducto(confirmDelete)
    setConfirmDelete(null)
    if (tienda) await fetchProductos(tienda.id)
    showToast('Producto eliminado')
  }

  const conteos = {
    todos: productos.length,
    agotado: productos.filter((p) => p.stock_actual <= 0).length,
    bajo: productos.filter((p) => p.stock_actual > 0 && p.stock_actual <= p.stock_minimo).length,
    'sin-movimiento': idsSinMovimiento.size,
  }

  const chips = [
    {
      key: 'todos' as const,
      label: 'Todos',
      color: 'border-[#EDE5DC] text-[#4A3F35] bg-white',
      activeColor: 'border-[#1E3A2F] bg-[#1E3A2F] text-white',
    },
    {
      key: 'agotado' as const,
      label: 'Agotado',
      color: 'border-[#EDE5DC] text-[#4A3F35] bg-white',
      activeColor: 'border-[#C44040] bg-[#FDEAEA] text-[#C44040]',
    },
    {
      key: 'bajo' as const,
      label: 'Stock bajo',
      color: 'border-[#EDE5DC] text-[#4A3F35] bg-white',
      activeColor: 'border-[#D4A853] bg-[#FBF3E0] text-[#D4A853]',
    },
    {
      key: 'sin-movimiento' as const,
      label: 'Sin movimiento',
      color: 'border-[#EDE5DC] text-[#4A3F35] bg-white',
      activeColor: 'border-[#8B5CF6] bg-[#F0EDF9] text-[#8B5CF6]',
    },
  ]

  const productosPorFiltro = (() => {
    switch (filtroActivoReal) {
      case 'agotado':
        return productos.filter((p) => p.stock_actual <= 0)
      case 'bajo':
        return productos.filter((p) => p.stock_actual > 0 && p.stock_actual <= p.stock_minimo)
      case 'sin-movimiento':
        return productos.filter((p) => idsSinMovimiento.has(p.id))
      default:
        return productos
    }
  })()

  const productosFiltrados =
    busqueda.trim() === ''
      ? productosPorFiltro
      : productosPorFiltro.filter((p) => {
          const q = busqueda.toLowerCase()
          return (
            p.nombre.toLowerCase().includes(q) ||
            String(p.precio_venta).includes(q) ||
            String(p.stock_actual).includes(q) ||
            String(p.stock_minimo).includes(q) ||
            (p.sku?.toLowerCase().includes(q) ?? false)
          )
        })

  if (tiendaLoading || loading) {
    return <ModuleTableSkeleton maxWidthClass="max-w-5xl" rows={9} />
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto" style={{ background: 'var(--color-background)' }}>
      {canDelete && (
        <ConfirmModal
          open={confirmDelete !== null}
          title="Eliminar producto"
          message="¿Eliminar este producto? Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          danger
          onConfirm={confirmarEliminar}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>Productos</h1>
          <p className="text-sm text-[#1A1510]/50 mt-0.5">{productos.length} productos registrados</p>
        </div>
        {canEdit && (
          <button
            onClick={() => {
              setShowForm(true)
              setEditando(null)
              setError(null)
            }}
            className="btn-primary text-sm font-semibold px-4 py-2 rounded-lg"
          >
            + Nuevo producto
          </button>
        )}
      </div>

      {canEdit && (
        <ImportCSV
          onDescargarPlantilla={descargarPlantillaProductos}
          onProcesar={async (filas) => {
            const res = await importarProductos(filas)
            if (res.exitosos > 0) {
              showToast(`${res.exitosos} producto${res.exitosos > 1 ? 's' : ''} importado${res.exitosos > 1 ? 's' : ''}`)
            }
            if (res.exitosos > 0 && tienda) await fetchProductos(tienda.id)
            return res
          }}
          descripcion="Tipos válidos: Producto terminado, Materia prima, Empaque, Material POP. Si omites tipo se asigna 'Producto terminado'."
        />
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {chips.map((chip) => (
          <button
            key={chip.key}
            onClick={() => {
              setIgnorarFiltroQuery(true)
              setFiltroActivo(chip.key)
            }}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
              filtroActivoReal === chip.key ? chip.activeColor : `${chip.color} hover:border-[#C4B8B0]`
            }`}
          >
            {chip.label}
            {chip.key !== 'todos' && conteos[chip.key] > 0 && (
              <span className="ml-1.5 opacity-70">({conteos[chip.key]})</span>
            )}
            {chip.key === 'todos' && <span className="ml-1.5 opacity-70">({conteos.todos})</span>}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, precio, stock, SKU..."
          className={inputClass}
        />
        {busqueda.trim() !== '' && (
          <p className="text-xs text-[#8A7D72] mt-1">
            {productosFiltrados.length} resultado{productosFiltrados.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {canEdit && (showForm || editando) && (
        <div className="bg-white rounded-2xl border border-[#1A1510]/8 p-6 mb-6 shadow-sm" style={{ background: 'var(--color-surface)' }}>
          <h2 className="text-base font-semibold text-[#1E3A2F] mb-4">
            {editando ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <form action={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Nombre</label>
              <input
                name="nombre"
                type="text"
                required
                placeholder="Ej: Anillo luna"
                defaultValue={editando?.nombre}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>SKU</label>
              <input
                name="sku"
                type="text"
                placeholder="Ej: VZ-001"
                defaultValue={editando?.sku}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Tipo</label>
              <select
                name="tipo"
                required
                className={inputClass}
                defaultValue={editando?.tipo ?? 'Producto terminado'}
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Precio de venta (COP)</label>
              <input
                name="precio_venta"
                type="number"
                required
                min="0"
                placeholder="85000"
                defaultValue={editando?.precio_venta}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Stock mínimo</label>
              <input
                name="stock_minimo"
                type="number"
                required
                min="0"
                placeholder="3"
                defaultValue={editando?.stock_minimo}
                className={inputClass}
              />
            </div>
            {error && (
              <p
                role="alert"
                className={
                  feedbackVariant === 'warning'
                    ? 'sm:col-span-3 text-sm text-amber-950 bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-lg'
                    : 'sm:col-span-3 text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg'
                }
              >
                {error}
              </p>
            )}
            <div className="sm:col-span-3 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditando(null)
                  setError(null)
                }}
                className="text-sm text-[#1A1510]/60 hover:text-[#1A1510] px-4 py-2 rounded-lg border border-[#1A1510]/20 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {submitting ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {filtroActivoReal !== 'todos' && productosFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#EDE5DC] p-12 text-center shadow-sm" style={{ background: 'var(--color-surface)' }}>
          <p className="text-[#8A7D72] text-sm">No hay productos en esta categoría.</p>
          <button
            onClick={() => {
              setIgnorarFiltroQuery(true)
              setFiltroActivo('todos')
            }}
            className="mt-2 text-sm text-[#C4622D] font-medium hover:underline"
          >
            Ver todos
          </button>
        </div>
      ) : busqueda.trim() !== '' && productosFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#EDE5DC] p-12 text-center shadow-sm" style={{ background: 'var(--color-surface)' }}>
          <p className="text-[#8A7D72] text-sm">
            No se encontraron productos para &quot;{busqueda}&quot;
          </p>
          <button onClick={() => setBusqueda('')} className="mt-2 text-sm text-[#C4622D] font-medium hover:underline">
            Limpiar búsqueda
          </button>
        </div>
      ) : productosFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#1A1510]/8 p-12 text-center shadow-sm" style={{ background: 'var(--color-surface)' }}>
          <p className="text-[#1A1510]/40 text-sm">Aún no tienes productos.</p>
          {canEdit && productos.length === 0 ? (
            <button
              onClick={() => {
                setShowForm(true)
                setError(null)
              }}
              className="mt-3 text-sm text-[#C4622D] font-medium hover:underline"
            >
              Crea el primero
            </button>
          ) : (
            <p className="mt-2 text-xs text-[#8A7D72]">No hay productos que coincidan con el filtro actual.</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#1A1510]/8 shadow-sm overflow-hidden" style={{ background: 'var(--color-surface)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-[#1A1510]/8 bg-[#FAF6F0]" style={{ background: 'var(--color-background)' }}>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  Producto
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  SKU
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  Tipo
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  Precio
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  Stock
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  Mínimo
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  Estado
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.map((p, i) => (
                <tr
                  key={p.id}
                  className={`border-b border-[#1A1510]/5 hover:bg-[#FAF6F0]/60 transition ${
                    i === productosFiltrados.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <td className="px-5 py-4 font-medium text-[#1A1510]">{p.nombre}</td>
                  <td className="px-5 py-4 text-[#1A1510]/70">{p.sku?.trim() ? p.sku : '—'}</td>
                  <td className="px-5 py-4 text-center">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tipoBadgeClass(p.tipo)}`}
                    >
                      {p.tipo}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right text-[#1A1510]/80">{formatCOP(p.precio_venta)}</td>
                  <td className="px-5 py-4 text-right">
                    <span
                      className={`font-semibold ${
                        p.stock_actual < 0 || p.stock_actual === 0
                          ? 'text-[#C44040]'
                          : p.stock_actual <= p.stock_minimo
                            ? 'text-[#D4A853]'
                            : 'text-[#1E3A2F]'
                      }`}
                    >
                      {p.stock_actual}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right text-[#1A1510]/50">{p.stock_minimo}</td>
                  <td className="px-5 py-4">{stockEstadoBadge(p)}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex gap-3 justify-end">
                      {canEdit && (
                        <button
                          onClick={() => {
                            setEditando(p)
                            setShowForm(false)
                            setError(null)
                          }}
                          className="text-xs text-[#C4622D] hover:underline font-medium"
                        >
                          Editar
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setConfirmDelete(p.id)}
                          className="text-xs text-[#1A1510]/40 hover:text-red-500 transition"
                        >
                          Eliminar
                        </button>
                      )}
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
