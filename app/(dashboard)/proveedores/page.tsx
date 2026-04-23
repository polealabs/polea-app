'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTienda } from '@/lib/hooks/useTienda'
import { crearProveedor, editarProveedor, eliminarProveedor } from './actions'
import type { Proveedor } from '@/lib/types'
import ConfirmModal from '@/components/ui/ConfirmModal'
import ImportCSV from '@/components/ui/ImportCSV'
import Toast from '@/components/ui/Toast'
import { descargarCSV } from '@/lib/csv'
import { useToast } from '@/lib/hooks/useToast'
import { importarProveedores } from './actions-import'
import { ModuleTableSkeleton } from '@/components/skeletons/ModuleTableSkeleton'

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-[#1A1510]/20 bg-white text-[#1A1510] placeholder:text-[#1A1510]/40 focus:outline-none focus:ring-2 focus:ring-[#C4622D]/40 focus:border-[#C4622D] transition text-sm'
const labelClass = 'block text-xs font-medium text-[#1A1510]/60 mb-1'
const CATEGORIAS = ['Producción', 'Empaque', 'Envíos', 'Marketing', 'Plataformas', 'Otro']

function descargarPlantillaProveedores() {
  descargarCSV('plantilla_proveedores.csv', [
    ['nombre', 'categorias', 'telefono', 'nit', 'ciudad'],
    ['Proveedor Ejemplo S.A.S', 'Producción|Empaque', '3001234567', '900123456-1', 'Cali'],
    ['Distribuidora XYZ', 'Marketing', '3109876543', '', 'Bogotá'],
    ['Papelería Central', 'Otro', '', '', 'Medellín'],
  ])
}

export default function ProveedoresPage() {
  const { tienda, loading: tiendaLoading, canDelete } = useTienda()
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Proveedor | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [nit, setNit] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<string[]>([])
  const { toasts, showToast, removeToast } = useToast()

  function toggleCategoria(cat: string) {
    setCategoriasSeleccionadas((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    )
  }

  function abrirNuevoProveedor() {
    setNombre('')
    setTelefono('')
    setNit('')
    setCiudad('')
    setCategoriasSeleccionadas([])
    setEditando(null)
    setShowForm(true)
    setError(null)
  }

  function abrirEditarProveedor(p: Proveedor) {
    setNombre(p.nombre)
    setTelefono(p.telefono ?? '')
    setNit(p.nit ?? '')
    setCiudad(p.ciudad ?? '')
    setCategoriasSeleccionadas([...(p.categorias ?? [])])
    setEditando(p)
    setShowForm(false)
    setError(null)
  }

  const fetchProveedores = useCallback(async (tiendaId: string) => {
    const supabase = createClient()
    const { data } = await supabase.from('proveedores').select('*').eq('tienda_id', tiendaId).order('nombre')
    setProveedores(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!tienda) return
    const timeoutId = window.setTimeout(() => {
      void fetchProveedores(tienda.id)
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [fetchProveedores, tienda])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!tienda) return
    if (categoriasSeleccionadas.length === 0) {
      const mensaje = 'Debes seleccionar al menos una categoría'
      setError(mensaje)
      showToast(mensaje, 'error')
      return
    }
    const esEdicion = Boolean(editando)
    setSubmitting(true)
    setError(null)

    const formData = new FormData()
    formData.set('nombre', nombre.trim())
    formData.set('telefono', telefono.trim())
    formData.set('nit', nit.trim())
    formData.set('ciudad', ciudad.trim())
    categoriasSeleccionadas.forEach((c) => formData.append('categorias', c))

    const result = editando
      ? await editarProveedor(editando.id, formData)
      : await crearProveedor(formData)

    if (result?.error) {
      setError(result.error)
      showToast(result.error, 'error')
    } else if (tienda) {
      setShowForm(false)
      setEditando(null)
      await fetchProveedores(tienda.id)
      showToast(esEdicion ? 'Proveedor actualizado' : 'Proveedor creado')
    }
    setSubmitting(false)
  }

  async function confirmarEliminar() {
    if (!confirmDelete) return
    const result = await eliminarProveedor(confirmDelete)
    if (result?.error) {
      setError(result.error)
      showToast(result.error, 'error')
    } else if (tienda) {
      setConfirmDelete(null)
      await fetchProveedores(tienda.id)
      showToast('Proveedor eliminado')
    }
  }

  const proveedoresFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return proveedores
    return proveedores.filter((p) => {
      const nombre = p.nombre.toLowerCase()
      const categorias = (p.categorias ?? []).join(' ').toLowerCase()
      const ciudad = p.ciudad?.toLowerCase() ?? ''
      return nombre.includes(q) || categorias.includes(q) || ciudad.includes(q)
    })
  }, [busqueda, proveedores])

  if (tiendaLoading || loading) {
    return <ModuleTableSkeleton maxWidthClass="max-w-6xl" rows={8} />
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto" style={{ background: 'var(--color-background)' }}>
      <ConfirmModal
        open={confirmDelete !== null}
        title="Eliminar proveedor"
        message="¿Eliminar este proveedor? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => void confirmarEliminar()}
        onCancel={() => setConfirmDelete(null)}
        danger
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>Proveedores</h1>
          <p className="text-sm text-[#1A1510]/50 mt-0.5">{proveedores.length} proveedores registrados</p>
        </div>
        <button
          onClick={abrirNuevoProveedor}
          className="btn-primary text-white text-sm font-semibold px-4 py-2 rounded-lg"
        >
          + Nuevo proveedor
        </button>
      </div>

      <ImportCSV
        onDescargarPlantilla={descargarPlantillaProveedores}
        onProcesar={async (filas) => {
          const res = await importarProveedores(filas)
          if (res.exitosos > 0) {
            showToast(`${res.exitosos} proveedor${res.exitosos > 1 ? 's' : ''} importado${res.exitosos > 1 ? 's' : ''}`)
          }
          if (res.exitosos > 0 && tienda) await fetchProveedores(tienda.id)
          return res
        }}
        descripcion="Para múltiples categorías sepáralas con | (ej: Producción|Empaque). Categorías válidas: Producción, Empaque, Envíos, Marketing, Plataformas, Otro"
      />

      <div className="mb-6">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, categoría o ciudad"
          className={inputClass}
        />
      </div>

      {(showForm || editando) && (
        <div className="bg-white rounded-2xl border border-[#1A1510]/8 p-6 mb-6 shadow-sm" style={{ background: 'var(--color-surface)' }}>
          <h2 className="text-base font-semibold text-[#1E3A2F] mb-4">
            {editando ? 'Editar proveedor' : 'Nuevo proveedor'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Nombre</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className={inputClass}
                placeholder="Nombre del proveedor"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Categoría * (selecciona al menos una)</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {CATEGORIAS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategoria(cat)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                      categoriasSeleccionadas.includes(cat)
                        ? 'bg-[#1E3A2F] border-[#1E3A2F] text-white'
                        : 'bg-white border-[#EDE5DC] text-[#4A3F35] hover:border-[#C4B8B0]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>Teléfono</label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className={inputClass}
                placeholder="3001234567"
              />
            </div>
            <div>
              <label className={labelClass}>NIT</label>
              <input type="text" value={nit} onChange={(e) => setNit(e.target.value)} className={inputClass} placeholder="900123456-1" />
            </div>
            <div>
              <label className={labelClass}>Ciudad</label>
              <input
                type="text"
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                className={inputClass}
                placeholder="Cali"
              />
            </div>

            {error && (
              <p className="sm:col-span-2 text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg">{error}</p>
            )}
            <div className="sm:col-span-2 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditando(null)
                  setError(null)
                  setNombre('')
                  setTelefono('')
                  setNit('')
                  setCiudad('')
                  setCategoriasSeleccionadas([])
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
                {submitting ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {proveedoresFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#1A1510]/8 p-12 text-center shadow-sm" style={{ background: 'var(--color-surface)' }}>
          <p className="text-[#1A1510]/40 text-sm">
            {proveedores.length === 0
              ? 'Aún no tienes proveedores registrados.'
              : 'No se encontraron proveedores para esa búsqueda.'}
          </p>
          {proveedores.length === 0 && (
            <button
              onClick={() => {
                abrirNuevoProveedor()
              }}
              className="mt-3 text-sm text-[#C4622D] font-medium hover:underline"
            >
              Crea el primero
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#1A1510]/8 shadow-sm overflow-hidden" style={{ background: 'var(--color-surface)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-[#1A1510]/8 bg-[#FAF6F0]" style={{ background: 'var(--color-background)' }}>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  Nombre
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  Categorías
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  Teléfono
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  NIT
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  Ciudad
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {proveedoresFiltrados.map((p, i) => (
                <tr
                  key={p.id}
                  className={`border-b border-[#1A1510]/5 hover:bg-[#FAF6F0]/60 transition ${
                    i === proveedoresFiltrados.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <td className="px-5 py-4 font-medium text-[#1A1510]">{p.nombre}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(p.categorias ?? []).map((cat) => (
                        <span
                          key={cat}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#FAF6F0] border border-[#EDE5DC] text-[#4A3F35]"
                        >
                          {cat}
                        </span>
                      ))}
                      {(p.categorias ?? []).length === 0 && <span className="text-[#1A1510]/70">—</span>}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[#1A1510]/70">{p.telefono?.trim() || '—'}</td>
                  <td className="px-5 py-4 text-[#1A1510]/70">{p.nit?.trim() || '—'}</td>
                  <td className="px-5 py-4 text-[#1A1510]/70">{p.ciudad?.trim() || '—'}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => abrirEditarProveedor(p)}
                        className="text-xs text-[#C4622D] hover:underline font-medium"
                      >
                        Editar
                      </button>
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
