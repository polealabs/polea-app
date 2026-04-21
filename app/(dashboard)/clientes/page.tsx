'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTienda } from '@/lib/hooks/useTienda'
import { crearCliente, editarCliente, eliminarCliente } from './actions'
import type { Cliente } from '@/lib/types'
import ImportCSV from '@/components/ui/ImportCSV'
import Toast from '@/components/ui/Toast'
import { ModuleTableSkeleton } from '@/components/skeletons/ModuleTableSkeleton'
import { descargarCSV } from '@/lib/csv'
import { useToast } from '@/lib/hooks/useToast'
import { importarClientes } from './actions-import'

type ClienteConCompras = Cliente & { total_compras: number }

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-[#1A1510]/20 bg-white text-[#1A1510] placeholder:text-[#1A1510]/40 focus:outline-none focus:ring-2 focus:ring-[#C4622D]/40 focus:border-[#C4622D] transition text-sm'
const labelClass = 'block text-xs font-medium text-[#1A1510]/60 mb-1'

function formatFecha(fecha: string) {
  return new Date(fecha + 'T12:00:00').toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function descargarPlantillaClientes() {
  descargarCSV('plantilla_clientes.csv', [
    ['nombre', 'telefono', 'ciudad', 'correo'],
    ['María García', '3001234567', 'Cali', 'maria@gmail.com'],
    ['Laura Rodríguez', '3109876543', 'Bogotá', ''],
    ['Sandra Mejía', '3204567890', 'Medellín', 'sandra@correo.com'],
  ])
}

export default function ClientesPage() {
  const { tienda, loading: tiendaLoading } = useTienda()
  const searchParams = useSearchParams()
  const [clientes, setClientes] = useState<ClienteConCompras[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [mesActual, setMesActual] = useState(() => new Date().toISOString().slice(0, 7))
  const [filtroMes, setFiltroMes] = useState(false)
  const [chipCliente, setChipCliente] = useState<'todos' | 'recurrentes' | 'activos-mes' | 'sin-compras'>(
    () => (searchParams.get('filtro') === 'recurrentes' ? 'recurrentes' : 'todos'),
  )
  const [ultimaCompraMap, setUltimaCompraMap] = useState<Map<string, string>>(new Map())
  const [fechasFiltro] = useState(() => ({
    hace35: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    mesActualStr: new Date().toISOString().slice(0, 7),
  }))
  const { toasts, showToast, removeToast } = useToast()

  const fetchClientes = useCallback(async (tiendaId: string, mes: string, filtrarPorMes: boolean) => {
    const supabase = createClient()
    const start = `${mes}-01`
    const nextMonth = new Date(`${mes}-01T12:00:00`)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    const end = nextMonth.toISOString().slice(0, 10)

    let clientesQuery = supabase.from('clientes').select('*').eq('tienda_id', tiendaId)
    if (filtrarPorMes) {
      clientesQuery = clientesQuery.gte('fecha_creacion', start).lt('fecha_creacion', end)
    }

    const [{ data: clientesData }, { data: ventasData }, { data: ultimasCompras }] = await Promise.all([
      clientesQuery.order('nombre'),
      supabase.from('ventas_cabecera').select('cliente_id').eq('tienda_id', tiendaId),
      supabase
        .from('ventas_cabecera')
        .select('cliente_id, fecha')
        .eq('tienda_id', tiendaId)
        .order('fecha', { ascending: false }),
    ])

    const comprasPorCliente = new Map<string, number>()
    ;(ventasData ?? []).forEach((venta: { cliente_id?: string | null }) => {
      if (!venta.cliente_id) return
      comprasPorCliente.set(venta.cliente_id, (comprasPorCliente.get(venta.cliente_id) ?? 0) + 1)
    })

    const clientesConCompras: ClienteConCompras[] = (clientesData ?? []).map((cliente) => ({
      ...cliente,
      total_compras: comprasPorCliente.get(cliente.id) ?? 0,
    }))

    const ultimaCompra = new Map<string, string>()
    ;(ultimasCompras ?? []).forEach((v) => {
      if (v.cliente_id && !ultimaCompra.has(v.cliente_id)) {
        ultimaCompra.set(v.cliente_id, v.fecha)
      }
    })

    setUltimaCompraMap(ultimaCompra)
    setClientes(clientesConCompras)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!tienda) return
    const tiendaId = tienda.id
    const mes = mesActual
    const filtrar = filtroMes
    const timeoutId = window.setTimeout(() => {
      void fetchClientes(tiendaId, mes, filtrar)
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [fetchClientes, filtroMes, mesActual, tienda])

  async function handleSubmit(formData: FormData) {
    const esEdicion = Boolean(editando)
    setSubmitting(true)
    setError(null)
    let result: Awaited<ReturnType<typeof crearCliente>> | Awaited<ReturnType<typeof editarCliente>>
    if (editando) {
      result = await editarCliente(editando.id, formData)
    } else {
      formData.set('fecha_creacion', new Date().toISOString().split('T')[0])
      result = await crearCliente(formData)
    }

    if (result?.error) {
      setError(result.error)
      showToast(result.error, 'error')
    } else if (tienda) {
      setShowForm(false)
      setEditando(null)
      await fetchClientes(tienda.id, mesActual, filtroMes)
      showToast(esEdicion ? 'Cliente actualizado' : 'Cliente creado')
    }
    setSubmitting(false)
  }

  async function handleEliminar(id: string) {
    if (!confirm('¿Eliminar este cliente?')) return
    await eliminarCliente(id)
    if (tienda) await fetchClientes(tienda.id, mesActual, filtroMes)
    showToast('Cliente eliminado')
  }

  const hace35 = fechasFiltro.hace35
  const mesActualStr = fechasFiltro.mesActualStr

  const clientesPorChip = useMemo(() => {
    switch (chipCliente) {
      case 'recurrentes':
        return clientes.filter(
          (c) => c.total_compras >= 2 && ultimaCompraMap.has(c.id) && (ultimaCompraMap.get(c.id) ?? '') < hace35,
        )
      case 'activos-mes':
        return clientes.filter(
          (c) => ultimaCompraMap.has(c.id) && (ultimaCompraMap.get(c.id) ?? '').startsWith(mesActualStr),
        )
      case 'sin-compras':
        return clientes.filter((c) => c.total_compras === 0)
      default:
        return clientes
    }
  }, [chipCliente, clientes, hace35, mesActualStr, ultimaCompraMap])

  const clientesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return clientesPorChip
    return clientesPorChip.filter((cliente) => {
      const nombre = cliente.nombre.toLowerCase()
      const telefono = cliente.telefono ?? ''
      return nombre.includes(q) || telefono.includes(q)
    })
  }, [busqueda, clientesPorChip])

  const conteosClientes = useMemo(
    () => ({
      todos: clientes.length,
      recurrentes: clientes.filter(
        (c) => c.total_compras >= 2 && ultimaCompraMap.has(c.id) && (ultimaCompraMap.get(c.id) ?? '') < hace35,
      ).length,
      'activos-mes': clientes.filter(
        (c) => ultimaCompraMap.has(c.id) && (ultimaCompraMap.get(c.id) ?? '').startsWith(mesActualStr),
      ).length,
      'sin-compras': clientes.filter((c) => c.total_compras === 0).length,
    }),
    [clientes, hace35, mesActualStr, ultimaCompraMap],
  )

  const chipsClientes = [
    { key: 'todos' as const, label: 'Todos', activeColor: 'border-[#1E3A2F] bg-[#1E3A2F] text-white' },
    {
      key: 'recurrentes' as const,
      label: 'Recurrentes sin comprar',
      activeColor: 'border-[#C44040] bg-[#FDEAEA] text-[#C44040]',
    },
    {
      key: 'activos-mes' as const,
      label: 'Activos este mes',
      activeColor: 'border-[#3A7D5A] bg-[#E8F5EE] text-[#3A7D5A]',
    },
    {
      key: 'sin-compras' as const,
      label: 'Sin compras',
      activeColor: 'border-[#8A7D72] bg-[#FAF6F0] text-[#8A7D72]',
    },
  ]

  if (tiendaLoading || loading) {
    return <ModuleTableSkeleton maxWidthClass="max-w-6xl" rows={8} />
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A2F]">Clientes</h1>
          <p className="text-sm text-[#1A1510]/50 mt-0.5">{clientes.length} clientes registrados</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={filtroMes}
                onChange={(e) => setFiltroMes(e.target.checked)}
                className="rounded border-[#EDE5DC] text-[#C4622D]"
              />
              <span className="text-xs text-[#8A7D72]">Filtrar por mes</span>
            </label>
            {filtroMes && (
              <input
                type="month"
                value={mesActual}
                onChange={(e) => setMesActual(e.target.value)}
                className={inputClass}
              />
            )}
          </div>
          <button
            onClick={() => {
              setShowForm(true)
              setEditando(null)
              setError(null)
            }}
            className="bg-[#C4622D] hover:bg-[#E8845A] text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            + Nuevo cliente
          </button>
        </div>
      </div>

      <ImportCSV
        onDescargarPlantilla={descargarPlantillaClientes}
        onProcesar={async (filas) => {
          const res = await importarClientes(filas)
          if (res.exitosos > 0) {
            showToast(`${res.exitosos} cliente${res.exitosos > 1 ? 's' : ''} importado${res.exitosos > 1 ? 's' : ''}`)
          }
          if (res.exitosos > 0 && tienda) await fetchClientes(tienda.id, mesActual, filtroMes)
          return res
        }}
        descripcion="Solo nombre es obligatorio. Teléfono, ciudad y correo son opcionales."
      />

      <div className="mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {chipsClientes.map((chip) => (
            <button
              key={chip.key}
              onClick={() => setChipCliente(chip.key)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                chipCliente === chip.key
                  ? chip.activeColor
                  : 'border-[#EDE5DC] text-[#4A3F35] bg-white hover:border-[#C4B8B0]'
              }`}
            >
              {chip.label} <span className="opacity-70">({conteosClientes[chip.key]})</span>
            </button>
          ))}
        </div>
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o teléfono"
          className={inputClass}
        />
      </div>

      {(showForm || editando) && (
        <div className="bg-white rounded-2xl border border-[#1A1510]/8 p-6 mb-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#1E3A2F] mb-4">
            {editando ? 'Editar cliente' : 'Nuevo cliente'}
          </h2>
          <form action={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Nombre</label>
              <input
                name="nombre"
                type="text"
                required
                defaultValue={editando?.nombre}
                className={inputClass}
                placeholder="Ej: Laura Gómez"
              />
            </div>
            <div>
              <label className={labelClass}>Teléfono</label>
              <input
                name="telefono"
                type="text"
                defaultValue={editando?.telefono}
                className={inputClass}
                placeholder="Ej: 3001234567"
              />
            </div>
            <div>
              <label className={labelClass}>Ciudad</label>
              <input
                name="ciudad"
                type="text"
                defaultValue={editando?.ciudad}
                className={inputClass}
                placeholder="Ej: Medellín"
              />
            </div>
            <div>
              <label className={labelClass}>Correo</label>
              <input
                name="correo"
                type="email"
                defaultValue={editando?.correo}
                className={inputClass}
                placeholder="cliente@correo.com"
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

      {clientesFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#1A1510]/8 p-12 text-center shadow-sm">
          <p className="text-[#1A1510]/40 text-sm">
            {clientes.length === 0
              ? 'Aún no tienes clientes registrados.'
              : 'No se encontraron clientes para esa búsqueda.'}
          </p>
          {clientes.length === 0 && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-sm text-[#C4622D] font-medium hover:underline"
            >
              Crea el primero
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#1A1510]/8 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1A1510]/8 bg-[#FAF6F0]">
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  Nombre
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  Teléfono
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  Ciudad
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  Correo
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  Compras
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  Desde
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map((cliente, i) => (
                <tr
                  key={cliente.id}
                  className={`border-b border-[#1A1510]/5 hover:bg-[#FAF6F0]/60 transition ${
                    i === clientesFiltrados.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <td className="px-5 py-4 font-medium text-[#1A1510]">{cliente.nombre}</td>
                  <td className="px-5 py-4 text-[#1A1510]/70">{cliente.telefono ?? '—'}</td>
                  <td className="px-5 py-4 text-[#1A1510]/70">{cliente.ciudad ?? '—'}</td>
                  <td className="px-5 py-4 text-[#1A1510]/70">{cliente.correo ?? '—'}</td>
                  <td className="px-5 py-4">
                    {cliente.total_compras > 0 ? (
                      <span className="inline-flex rounded-full bg-[#C4622D] px-2.5 py-1 text-xs font-semibold text-white">
                        {cliente.total_compras}
                      </span>
                    ) : (
                      <span className="text-[#1A1510]/40">0</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-[#1A1510]/70">
                    {cliente.fecha_creacion ? formatFecha(cliente.fecha_creacion) : '—'}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => {
                          setEditando(cliente)
                          setShowForm(false)
                          setError(null)
                        }}
                        className="text-xs text-[#C4622D] hover:underline font-medium"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleEliminar(cliente.id)}
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
      )}
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
