'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTienda } from '@/lib/hooks/useTienda'
import { crearCliente, editarCliente, eliminarCliente } from './actions'
import type { Cliente } from '@/lib/types'
import ImportCSV from '@/components/ui/ImportCSV'
import { Tooltip } from '@/components/ui/Tooltip'
import Toast from '@/components/ui/Toast'
import { ModuleTableSkeleton } from '@/components/skeletons/ModuleTableSkeleton'
import { descargarCSV } from '@/lib/csv'
import { useToast } from '@/lib/hooks/useToast'
import { importarClientes } from './actions-import'
import { toLocalISOYearMonthString } from '@/lib/utils'
import { obtenerPreferencias } from '@/app/(dashboard)/preferencias/actions'
import { Paginacion } from '@/components/ui/Paginacion'

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
    ['nombre', 'email', 'telefono', 'ciudad', 'direccion'],
    ['Juan Pérez', 'juan@email.com', '3001234567', 'Cali', 'Calle 10 # 5-23'],
    ['María García', 'maria@gmail.com', '3001234568', 'Cali', ''],
    ['Laura Rodríguez', '', '3109876543', 'Bogotá', 'Carrera 7 # 40-12'],
  ])
}

export default function ClientesPage() {
  const { tienda, loading: tiendaLoading, canEdit } = useTienda()
  const searchParams = useSearchParams()
  const [clientes, setClientes] = useState<ClienteConCompras[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [mesActual, setMesActual] = useState(() => toLocalISOYearMonthString())
  const [filtroMes, setFiltroMes] = useState(false)
  const [chipCliente, setChipCliente] = useState<'todos' | 'recurrentes' | 'activos-mes' | 'sin-compras'>(
    () => (searchParams.get('filtro') === 'recurrentes' ? 'recurrentes' : 'todos'),
  )
  const [ultimaCompraMap, setUltimaCompraMap] = useState<Map<string, string>>(new Map())
  const [fechasFiltro] = useState(() => ({
    hace35: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    mesActualStr: toLocalISOYearMonthString(),
  }))
  const [registrosPorPagina, setRegistrosPorPagina] = useState(20)
  const [paginaClientes, setPaginaClientes] = useState(1)
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

  useEffect(() => {
    void obtenerPreferencias().then((data) => {
      if (data) {
        const raw = data as Record<string, unknown>
        setRegistrosPorPagina(Number(raw.registros_por_pagina ?? 20) || 20)
      }
    })
  }, [])

  useEffect(() => {
    setPaginaClientes(1)
  }, [chipCliente, busqueda, filtroMes, mesActual])

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

  const clientesPaginados = clientesFiltrados.slice(
    (paginaClientes - 1) * registrosPorPagina,
    paginaClientes * registrosPorPagina,
  )

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
    <div className="p-4 md:p-6 max-w-6xl mx-auto" style={{ background: 'var(--color-background)' }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>Clientes</h1>
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
          {canEdit && (
            <button
              onClick={() => {
                setShowForm(true)
                setEditando(null)
                setError(null)
              }}
              className="btn-primary text-white text-sm font-semibold px-4 py-2 rounded-lg"
            >
              + Nuevo cliente
            </button>
          )}
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
        descripcion="Solo nombre es obligatorio. Email (o columna correo), teléfono, ciudad y direccion (opcional) son opcionales."
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

      {canEdit && (showForm || editando) && (
        <div className="bg-white rounded-2xl border border-[#1A1510]/8 p-6 mb-6 shadow-sm" style={{ background: 'var(--color-surface)' }}>
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
              <label className={labelClass}>Dirección (opcional)</label>
              <input
                type="text"
                name="direccion"
                defaultValue={editando?.direccion ?? ''}
                placeholder="Ej: Calle 10 # 5-23, Cali"
                className={inputClass}
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
                className="btn-primary text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {submitting ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {clientesFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#1A1510]/8 p-12 text-center shadow-sm" style={{ background: 'var(--color-surface)' }}>
          <p className="text-[#1A1510]/40 text-sm">
            {clientes.length === 0
              ? 'Aún no tienes clientes registrados.'
              : 'No se encontraron clientes para esa búsqueda.'}
          </p>
          {canEdit && clientes.length === 0 && (
            <button
              onClick={() => setShowForm(true)}
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
                  Teléfono
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  Dirección
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  Ciudad
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  Correo
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  <span className="inline-flex items-center gap-0">
                    Compras
                    <Tooltip texto="Suma de todas las ventas registradas a este cliente" />
                  </span>
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                  Desde
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {clientesPaginados.map((cliente, i) => (
                <tr
                  key={cliente.id}
                  className={`border-b border-[#1A1510]/5 hover:bg-[#FAF6F0]/60 transition ${
                    i === clientesPaginados.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <td className="px-5 py-4 font-medium">
                    <Link href={`/clientes/${cliente.id}`} className="underline underline-offset-2 transition hover:opacity-70" style={{ color: 'var(--color-accent)' }}>
                      {cliente.nombre}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-[#1A1510]/70">{cliente.telefono ?? '—'}</td>
                  <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--color-text-soft)' }}>
                    {cliente.direccion || '—'}
                  </td>
                  <td className="px-5 py-4 text-[#1A1510]/70">{cliente.ciudad ?? '—'}</td>
                  <td className="px-5 py-4 text-[#1A1510]/70">{cliente.correo ?? '—'}</td>
                  <td className="px-5 py-4 text-sm font-medium" style={{ color: cliente.total_compras > 0 ? 'var(--color-text)' : 'var(--color-text-faint)' }}>
                    {cliente.total_compras}
                  </td>
                  <td className="px-5 py-4 text-[#1A1510]/70">
                    {cliente.fecha_creacion ? formatFecha(cliente.fecha_creacion) : '—'}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex gap-3 justify-end">
                      {canEdit && (
                        <>
                          <button
                            onClick={() => {
                              setEditando(cliente)
                              setShowForm(false)
                              setError(null)
                            }}
                            className="text-xs font-medium hover:underline"
                            style={{ color: 'var(--color-accent)' }}
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleEliminar(cliente.id)}
                            className="text-xs font-medium hover:underline"
                            style={{ color: '#C44040' }}
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <Paginacion
            total={clientesFiltrados.length}
            porPagina={registrosPorPagina}
            pagina={paginaClientes}
            onChange={setPaginaClientes}
          />
        </div>
      )}
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
