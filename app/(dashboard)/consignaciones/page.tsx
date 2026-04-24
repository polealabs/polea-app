'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTienda } from '@/lib/hooks/useTienda'
import type {
  Consignacion,
  ConsignacionMovimiento,
  Producto,
  TiendaConsignataria,
} from '@/lib/types'
import {
  crearConsignataria,
  editarConsignataria,
  eliminarConsignataria,
  registrarMovimiento,
  registrarSalida,
} from './actions'
import Toast from '@/components/ui/Toast'
import { useToast } from '@/lib/hooks/useToast'
import ConfirmModal from '@/components/ui/ConfirmModal'

type ConsignacionRow = Consignacion & {
  producto_nombre: string
  consignataria_nombre: string
}

type MovimientoConDetalles = ConsignacionMovimiento & {
  producto_nombre: string
  consignataria_nombre: string
}

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value || 0)
}

function formatFecha(fecha: string) {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-CO')
}

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-[#1A1510]/20 bg-white text-[#1A1510] placeholder:text-[#1A1510]/40 focus:outline-none focus:ring-2 focus:ring-[#C4622D]/40 focus:border-[#C4622D] transition text-sm'
const thClass = 'text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#8A7D72]'

export default function ConsignacionesPage() {
  const { tienda, loading: tiendaLoading } = useTienda()
  const { toasts, showToast, removeToast } = useToast()

  const [consignatarias, setConsignatarias] = useState<TiendaConsignataria[]>([])
  const [consignaciones, setConsignaciones] = useState<ConsignacionRow[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoConDetalles[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'tiendas' | 'inventario' | 'devoluciones' | 'liquidaciones'>('tiendas')

  const [showModalSalida, setShowModalSalida] = useState(false)
  const [showModalMovimiento, setShowModalMovimiento] = useState(false)
  const [showFormTienda, setShowFormTienda] = useState(false)
  const [editando, setEditando] = useState<TiendaConsignataria | null>(null)
  const [consignacionActiva, setConsignacionActiva] = useState<ConsignacionRow | null>(null)
  const [tipoMovimiento, setTipoMovimiento] = useState<'devolucion' | 'liquidacion'>('liquidacion')
  const [confirmDeleteTienda, setConfirmDeleteTienda] = useState<string | null>(null)

  const [salidaConsignatariaId, setSalidaConsignatariaId] = useState('')
  const [salidaProductoId, setSalidaProductoId] = useState('')
  const [salidaCantidad, setSalidaCantidad] = useState(1)
  const [salidaCostoUnitario, setSalidaCostoUnitario] = useState(0)
  const [salidaFecha, setSalidaFecha] = useState(new Date().toISOString().split('T')[0])
  const [salidaSubmitting, setSalidaSubmitting] = useState(false)
  const [salidaError, setSalidaError] = useState<string | null>(null)

  const [movCantidad, setMovCantidad] = useState(1)
  const [movPrecioVenta, setMovPrecioVenta] = useState(0)
  const [movFecha, setMovFecha] = useState(new Date().toISOString().split('T')[0])
  const [movNotas, setMovNotas] = useState('')
  const [movSubmitting, setMovSubmitting] = useState(false)
  const [movError, setMovError] = useState<string | null>(null)

  const [inventarioVista, setInventarioVista] = useState<'tienda' | 'global'>('tienda')
  const [filtroConsignatariaInv, setFiltroConsignatariaInv] = useState('')
  const [mesDevoluciones, setMesDevoluciones] = useState(() => new Date().toISOString().slice(0, 7))
  const [filtroMesLiq, setFiltroMesLiq] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [formData, setFormData] = useState({
    nombre: '',
    contacto: '',
    telefono: '',
    ciudad: '',
    nit: '',
    porcentaje_comision: 0,
  })

  const loadData = useCallback(async () => {
    if (!tienda) return
    setLoading(true)
    const supabase = createClient()
    const [tRes, cRes, mRes, pRes] = await Promise.all([
      supabase.from('tiendas_consignatarias').select('*').eq('tienda_id', tienda.id).order('nombre'),
      supabase
        .from('consignaciones')
        .select('*, productos(nombre), tiendas_consignatarias(nombre)')
        .eq('tienda_id', tienda.id)
        .order('fecha', { ascending: false }),
      supabase
        .from('consignacion_movimientos')
        .select('*, consignaciones(producto_id, consignataria_id, productos(nombre), tiendas_consignatarias(nombre))')
        .eq('tienda_id', tienda.id)
        .order('fecha', { ascending: false }),
      supabase
        .from('productos')
        .select('id, nombre, precio_venta, stock_actual')
        .eq('tienda_id', tienda.id)
        .gt('stock_actual', 0)
        .order('nombre'),
    ])

    if (tRes.error) showToast(tRes.error.message, 'error')
    if (cRes.error) showToast(cRes.error.message, 'error')
    if (mRes.error) showToast(mRes.error.message, 'error')
    if (pRes.error) showToast(pRes.error.message, 'error')

    setConsignatarias((tRes.data ?? []) as TiendaConsignataria[])
    setProductos((pRes.data ?? []) as Producto[])

    const movs: MovimientoConDetalles[] = (mRes.data ?? []).map((r: Record<string, unknown>) => {
      const consignacion = r.consignaciones as
        | {
            productos?: { nombre?: string } | { nombre?: string }[] | null
            tiendas_consignatarias?: { nombre?: string } | { nombre?: string }[] | null
          }
        | null
      const prodRaw = consignacion?.productos
      const tiendaRaw = consignacion?.tiendas_consignatarias
      const producto_nombre = Array.isArray(prodRaw)
        ? (prodRaw[0]?.nombre ?? '—')
        : (prodRaw?.nombre ?? '—')
      const consignataria_nombre = Array.isArray(tiendaRaw)
        ? (tiendaRaw[0]?.nombre ?? '—')
        : (tiendaRaw?.nombre ?? '—')
      return {
        ...(r as unknown as ConsignacionMovimiento),
        producto_nombre,
        consignataria_nombre,
      }
    })
    setMovimientos(movs)

    const consigs: ConsignacionRow[] = (cRes.data ?? []).map((r: Record<string, unknown>) => {
      const prod = r.productos as { nombre?: string } | null
      const tiendaConsig = r.tiendas_consignatarias as { nombre?: string } | null
      return {
        ...(r as unknown as Consignacion),
        producto_nombre: prod?.nombre ?? '—',
        consignataria_nombre: tiendaConsig?.nombre ?? '—',
      }
    })
    setConsignaciones(consigs)
    setLoading(false)
  }, [tienda, showToast])

  useEffect(() => {
    if (!tienda) return
    const id = window.setTimeout(() => {
      void loadData()
    }, 0)
    return () => window.clearTimeout(id)
  }, [tienda, loadData])

  const productoSeleccionado = useMemo(
    () => productos.find((p) => p.id === salidaProductoId) ?? null,
    [productos, salidaProductoId],
  )

  const tabCounts = useMemo(
    () => ({
      tiendas: consignatarias.length,
      inventario: consignaciones.filter((c) => c.unidades_disponibles > 0).length,
      devoluciones: movimientos.filter((m) => m.tipo === 'devolucion').length,
      liquidaciones: movimientos.filter((m) => m.tipo === 'liquidacion').length,
    }),
    [consignatarias, consignaciones, movimientos],
  )

  const unidadesActivasPorTienda = useMemo(() => {
    const map = new Map<string, number>()
    consignaciones.forEach((c) => {
      if (c.unidades_disponibles <= 0) return
      map.set(c.consignataria_id, (map.get(c.consignataria_id) ?? 0) + c.unidades_disponibles)
    })
    return map
  }, [consignaciones])

  const movimientosPorConsignacion = useMemo(() => {
    const map = new Map<string, ConsignacionMovimiento[]>()
    movimientos.forEach((m) => {
      const arr = map.get(m.consignacion_id) ?? []
      arr.push(m)
      map.set(m.consignacion_id, arr)
    })
    return map
  }, [movimientos])

  const consignacionesPorTienda = useMemo(() => {
    if (!filtroConsignatariaInv) return []
    return consignaciones.filter(
      (c) => c.consignataria_id === filtroConsignatariaInv && c.unidades_disponibles > 0,
    )
  }, [consignaciones, filtroConsignatariaInv])

  const inventarioGlobal = useMemo(() => {
    const grouped = new Map<string, { nombre: string; enviado: number; disponible: number; porTienda: Map<string, number> }>()
    consignaciones
      .filter((c) => c.unidades_disponibles > 0)
      .forEach((c) => {
        if (!grouped.has(c.producto_id)) {
          grouped.set(c.producto_id, {
            nombre: c.producto_nombre,
            enviado: 0,
            disponible: 0,
            porTienda: new Map(),
          })
        }
        const item = grouped.get(c.producto_id)!
        item.enviado += c.cantidad
        item.disponible += c.unidades_disponibles
        item.porTienda.set(
          c.consignataria_nombre,
          (item.porTienda.get(c.consignataria_nombre) ?? 0) + c.unidades_disponibles,
        )
      })
    return Array.from(grouped.entries()).map(([producto_id, val]) => ({ producto_id, ...val }))
  }, [consignaciones])

  const devolucionesFiltradas = useMemo(
    () => movimientos.filter((m) => m.tipo === 'devolucion' && m.fecha.startsWith(mesDevoluciones)),
    [movimientos, mesDevoluciones],
  )

  const liquidacionesHistorial = useMemo(
    () => movimientos.filter((m) => m.tipo === 'liquidacion' && m.fecha.startsWith(filtroMesLiq)),
    [movimientos, filtroMesLiq],
  )

  const netoMesActual = useMemo(
    () => liquidacionesHistorial.reduce((sum, r) => sum + (r.neto ?? 0), 0),
    [liquidacionesHistorial],
  )

  const pctConsignacionActiva = useMemo(() => {
    if (!consignacionActiva) return 0
    const consig = consignatarias.find((c) => c.id === consignacionActiva.consignataria_id)
    return consig?.porcentaje_comision ?? 0
  }, [consignacionActiva, consignatarias])

  const previewMovimiento = useMemo(() => {
    const bruto = movCantidad * movPrecioVenta
    const comision = Math.round(bruto * (pctConsignacionActiva / 100))
    const neto = bruto - comision
    return { bruto, comision, neto }
  }, [movCantidad, movPrecioVenta, pctConsignacionActiva])

  async function submitTienda(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData()
    fd.set('nombre', formData.nombre)
    fd.set('contacto', formData.contacto)
    fd.set('telefono', formData.telefono)
    fd.set('ciudad', formData.ciudad)
    fd.set('nit', formData.nit)
    fd.set('porcentaje_comision', String(formData.porcentaje_comision))
    const res = editando ? await editarConsignataria(editando.id, fd) : await crearConsignataria(fd)
    if (res?.error) {
      showToast(res.error, 'error')
      return
    }
    showToast(editando ? 'Tienda actualizada' : 'Tienda creada')
    setShowFormTienda(false)
    setEditando(null)
    setFormData({
      nombre: '',
      contacto: '',
      telefono: '',
      ciudad: '',
      nit: '',
      porcentaje_comision: 0,
    })
    void loadData()
  }

  async function submitSalida(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSalidaSubmitting(true)
    setSalidaError(null)
    const res = await registrarSalida({
      consignataria_id: salidaConsignatariaId,
      producto_id: salidaProductoId,
      cantidad: salidaCantidad,
      costo_unitario: salidaCostoUnitario,
      fecha: salidaFecha,
    })
    setSalidaSubmitting(false)
    if (res?.error) {
      setSalidaError(res.error)
      return
    }
    showToast('Salida registrada')
    setShowModalSalida(false)
    setSalidaProductoId('')
    setSalidaCantidad(1)
    setSalidaCostoUnitario(0)
    setSalidaError(null)
    void loadData()
  }

  async function submitMovimiento(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!consignacionActiva) return
    setMovSubmitting(true)
    setMovError(null)
    const res = await registrarMovimiento({
      consignacion_id: consignacionActiva.id,
      tipo: tipoMovimiento,
      cantidad: movCantidad,
      precio_venta: tipoMovimiento === 'liquidacion' ? movPrecioVenta : undefined,
      fecha: movFecha,
      notas: movNotas.trim() || undefined,
    })
    setMovSubmitting(false)
    if (res?.error) {
      setMovError(res.error)
      return
    }
    showToast(tipoMovimiento === 'devolucion' ? 'Devolución registrada' : 'Liquidación registrada')
    setShowModalMovimiento(false)
    setConsignacionActiva(null)
    setMovCantidad(1)
    setMovPrecioVenta(0)
    setMovNotas('')
    setMovError(null)
    void loadData()
  }

  function abrirSalida(consignatariaId?: string) {
    setSalidaConsignatariaId(consignatariaId ?? '')
    setSalidaProductoId('')
    setSalidaCantidad(1)
    setSalidaCostoUnitario(0)
    setSalidaError(null)
    setShowModalSalida(true)
  }

  function abrirNuevaTienda() {
    setEditando(null)
    setFormData({
      nombre: '',
      contacto: '',
      telefono: '',
      ciudad: '',
      nit: '',
      porcentaje_comision: 0,
    })
    setShowFormTienda(true)
  }

  function abrirEdicionTienda(t: TiendaConsignataria) {
    setEditando(t)
    setFormData({
      nombre: t.nombre ?? '',
      contacto: t.contacto ?? '',
      telefono: t.telefono ?? '',
      ciudad: t.ciudad ?? '',
      nit: t.nit ?? '',
      porcentaje_comision: t.porcentaje_comision ?? 0,
    })
    setShowFormTienda(true)
  }

  function abrirMovimiento(consig: ConsignacionRow, tipo: 'devolucion' | 'liquidacion') {
    setConsignacionActiva(consig)
    setTipoMovimiento(tipo)
    setMovCantidad(1)
    setMovPrecioVenta(0)
    setMovFecha(new Date().toISOString().split('T')[0])
    setMovNotas('')
    setMovError(null)
    setShowModalMovimiento(true)
  }

  if (tiendaLoading || loading) return <div className="p-4 md:p-6">Cargando consignaciones...</div>

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto" style={{ background: 'var(--color-background)' }}>
      <ConfirmModal
        open={confirmDeleteTienda !== null}
        title="Eliminar tienda consignataria"
        message="Esta acción no se puede deshacer."
        danger
        confirmLabel="Eliminar"
        onCancel={() => setConfirmDeleteTienda(null)}
        onConfirm={async () => {
          if (!confirmDeleteTienda) return
          const res = await eliminarConsignataria(confirmDeleteTienda)
          setConfirmDeleteTienda(null)
          if (res?.error) showToast(res.error, 'error')
          else {
            showToast('Tienda eliminada')
            void loadData()
          }
        }}
      />

      <div className="flex flex-wrap gap-3 justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
            Consignaciones
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-soft)' }}>
            Gestiona tiendas consignatarias, salidas y liquidaciones.
          </p>
        </div>
        <button
          type="button"
          onClick={() => abrirSalida()}
          className="btn-primary px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2"
        >
          <span>↗</span> Nueva salida
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { id: 'tiendas', label: `Tiendas (${tabCounts.tiendas})` },
          { id: 'inventario', label: `Inventario (${tabCounts.inventario})` },
          { id: 'devoluciones', label: `Devoluciones (${tabCounts.devoluciones})` },
          { id: 'liquidaciones', label: `Liquidaciones (${tabCounts.liquidaciones})` },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as 'tiendas' | 'inventario' | 'devoluciones' | 'liquidaciones')}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
              tab === t.id
                ? 'border-[#1E3A2F] bg-[#1E3A2F] text-white'
                : 'border-[#EDE5DC] text-[#4A3F35] bg-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'tiendas' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              className="btn-primary text-sm font-semibold px-4 py-2 rounded-lg"
              onClick={abrirNuevaTienda}
            >
              + Nueva tienda
            </button>
          </div>

          {showFormTienda && (
            <form onSubmit={submitTienda} className="bg-white border border-[#EDE5DC] rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 gap-3 shadow-sm">
              <input name="nombre" required value={formData.nombre} onChange={(e) => setFormData((prev) => ({ ...prev, nombre: e.target.value }))} placeholder="Nombre *" className={`md:col-span-2 ${inputClass}`} />
              <input name="contacto" value={formData.contacto} onChange={(e) => setFormData((prev) => ({ ...prev, contacto: e.target.value }))} placeholder="Contacto" className={inputClass} />
              <input name="telefono" value={formData.telefono} onChange={(e) => setFormData((prev) => ({ ...prev, telefono: e.target.value }))} placeholder="Teléfono" className={inputClass} />
              <input name="ciudad" value={formData.ciudad} onChange={(e) => setFormData((prev) => ({ ...prev, ciudad: e.target.value }))} placeholder="Ciudad" className={inputClass} />
              <input name="nit" value={formData.nit} onChange={(e) => setFormData((prev) => ({ ...prev, nit: e.target.value }))} placeholder="NIT" className={inputClass} />
              <input
                name="porcentaje_comision"
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={formData.porcentaje_comision === 0 ? '' : formData.porcentaje_comision}
                placeholder="% Comisión"
                onChange={(e) => {
                  const val = e.target.value
                  setFormData((prev) => ({ ...prev, porcentaje_comision: val === '' ? 0 : Number(val) }))
                }}
                className={inputClass}
              />
              <div className="md:col-span-2 flex justify-end gap-2">
                <button type="button" className="px-4 py-2 border border-[#EDE5DC] rounded-lg text-sm text-[#4A3F35]" onClick={() => { setShowFormTienda(false); setEditando(null) }}>Cancelar</button>
                <button type="submit" className="btn-primary px-4 py-2 rounded-lg">Guardar</button>
              </div>
            </form>
          )}

          <div className="bg-white border border-[#EDE5DC] rounded-2xl overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="bg-[#FAF6F0]">
                  <th className={thClass}>Nombre</th>
                  <th className={thClass}>Ciudad</th>
                  <th className={thClass}>Contacto</th>
                  <th className={thClass}>NIT</th>
                  <th className={`${thClass} text-right`}>Comisión</th>
                  <th className={`${thClass} text-right`}>Unidades activas</th>
                  <th className={`${thClass} text-right`}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {consignatarias.map((t) => (
                  <tr key={t.id} className="border-t border-[#EDE5DC]">
                    <td className="px-4 py-3 font-medium">{t.nombre}</td>
                    <td className="px-4 py-3 text-[#4A3F35]">{t.ciudad || '—'}</td>
                    <td className="px-4 py-3 text-[#4A3F35]">{t.contacto || '—'}</td>
                    <td className="px-4 py-3 text-[#4A3F35]">{t.nit || '—'}</td>
                    <td className="px-4 py-3 text-right">{t.porcentaje_comision}%</td>
                    <td className="px-4 py-3 text-right font-semibold">{unidadesActivasPorTienda.get(t.id) ?? 0}</td>
                    <td className="px-4 py-3 text-right space-x-3">
                      <button type="button" className="text-xs text-[var(--color-accent)] hover:underline" onClick={() => abrirEdicionTienda(t)}>Editar</button>
                      <button type="button" className="text-xs hover:underline" onClick={() => abrirSalida(t.id)}>Nueva salida</button>
                      <button type="button" className="text-xs text-red-500 hover:underline" onClick={() => setConfirmDeleteTienda(t.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'inventario' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button type="button" onClick={() => setInventarioVista('tienda')} className={`px-3 py-1.5 border rounded-full text-xs ${inventarioVista === 'tienda' ? 'border-[var(--color-accent)] text-[var(--color-accent)]' : ''}`}>Por tienda</button>
            <button type="button" onClick={() => setInventarioVista('global')} className={`px-3 py-1.5 border rounded-full text-xs ${inventarioVista === 'global' ? 'border-[var(--color-accent)] text-[var(--color-accent)]' : ''}`}>Global</button>
          </div>

          {inventarioVista === 'tienda' && (
            <>
              <select value={filtroConsignatariaInv} onChange={(e) => setFiltroConsignatariaInv(e.target.value)} className={`max-w-md w-full ${inputClass}`}>
                <option value="">Selecciona consignataria</option>
                {consignatarias.filter((c) => c.activa).map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>

              <div className="bg-white border border-[#EDE5DC] rounded-2xl overflow-x-auto">
                <table className="w-full min-w-[1060px] text-sm">
                  <thead>
                    <tr className="bg-[#FAF6F0]">
                      <th className={thClass}>Producto</th>
                      <th className={`${thClass} text-right`}>Enviadas</th>
                      <th className={`${thClass} text-right`}>Disponibles</th>
                      <th className={`${thClass} text-right`}>Devueltas</th>
                      <th className={`${thClass} text-right`}>Liquidadas</th>
                      <th className={thClass}>Fecha envío</th>
                      <th className={thClass}>Progreso</th>
                      <th className={`${thClass} text-right`}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consignacionesPorTienda.map((c) => {
                      const movs = movimientosPorConsignacion.get(c.id) ?? []
                      const devueltas = movs.filter((m) => m.tipo === 'devolucion').reduce((s, m) => s + m.cantidad, 0)
                      const liquidadas = Math.max(0, c.cantidad - c.unidades_disponibles - devueltas)
                      const progreso = c.cantidad > 0 ? Math.round((c.unidades_disponibles / c.cantidad) * 100) : 0
                      return (
                        <tr key={c.id} className="border-t border-[#EDE5DC]">
                          <td className="px-4 py-3">{c.producto_nombre}</td>
                          <td className="px-4 py-3 text-right">{c.cantidad}</td>
                          <td className="px-4 py-3 text-right font-semibold">{c.unidades_disponibles}</td>
                          <td className="px-4 py-3 text-right">{devueltas}</td>
                          <td className="px-4 py-3 text-right">{liquidadas}</td>
                          <td className="px-4 py-3">{formatFecha(c.fecha)}</td>
                          <td className="px-4 py-3 min-w-[180px]">
                            <div className="w-full h-2 rounded-full bg-[#EDE5DC]">
                              <div className="h-2 rounded-full" style={{ width: `${progreso}%`, background: 'var(--color-primary)' }} />
                            </div>
                            <p className="text-xs mt-1 text-[#8A7D72]">{c.unidades_disponibles}/{c.cantidad} disponibles</p>
                          </td>
                          <td className="px-4 py-3 text-right space-x-2">
                            <button type="button" className="text-xs text-[var(--color-accent)] hover:underline" onClick={() => abrirMovimiento(c, 'liquidacion')}>Liquidar</button>
                            <button type="button" className="text-xs text-red-500 hover:underline" onClick={() => abrirMovimiento(c, 'devolucion')}>Devolver</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {inventarioVista === 'global' && (
            <div className="bg-white border border-[#EDE5DC] rounded-2xl overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="bg-[#FAF6F0]">
                    <th className={thClass}>Producto</th>
                    <th className={`${thClass} text-right`}>Total enviado</th>
                    <th className={`${thClass} text-right`}>Total disponible</th>
                    <th className={thClass}>Por tienda</th>
                  </tr>
                </thead>
                <tbody>
                  {inventarioGlobal.map((row) => (
                    <tr key={row.producto_id} className="border-t border-[#EDE5DC]">
                      <td className="px-4 py-3 font-medium">{row.nombre}</td>
                      <td className="px-4 py-3 text-right">{row.enviado}</td>
                      <td className="px-4 py-3 text-right font-semibold">{row.disponible}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {Array.from(row.porTienda.entries()).map(([nombre, cantidad]) => (
                            <span key={nombre} className="text-xs px-2 py-0.5 rounded-full border border-[#EDE5DC] text-[#4A3F35]">{nombre}: {cantidad}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'liquidaciones' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <input type="month" value={filtroMesLiq} onChange={(e) => setFiltroMesLiq(e.target.value)} className={inputClass} />
            <p className="text-sm">
              Neto del mes: <strong style={{ color: 'var(--color-primary)' }}>{formatCOP(netoMesActual)}</strong>
            </p>
          </div>
          <div className="bg-white border border-[#EDE5DC] rounded-2xl overflow-x-auto">
            <table className="w-full min-w-[1200px] text-sm">
              <thead>
                <tr className="bg-[#FAF6F0]">
                  <th className={thClass}>Fecha</th>
                  <th className={thClass}>Tienda</th>
                  <th className={thClass}>Producto</th>
                  <th className={`${thClass} text-right`}>Cant vendida</th>
                  <th className={`${thClass} text-right`}>Precio unit</th>
                  <th className={`${thClass} text-right`}>Total bruto</th>
                  <th className={`${thClass} text-right`}>Comisión</th>
                  <th className={`${thClass} text-right`}>Neto</th>
                  <th className={thClass}>Notas</th>
                </tr>
              </thead>
              <tbody>
                {liquidacionesHistorial.map((m) => (
                  <tr key={m.id} className="border-t border-[#EDE5DC]">
                    <td className="px-4 py-3">{formatFecha(m.fecha)}</td>
                    <td className="px-4 py-3">{m.consignataria_nombre}</td>
                    <td className="px-4 py-3">{m.producto_nombre}</td>
                    <td className="px-4 py-3 text-right">{m.cantidad}</td>
                    <td className="px-4 py-3 text-right">{formatCOP(m.precio_venta ?? 0)}</td>
                    <td className="px-4 py-3 text-right">{formatCOP(m.total_bruto ?? 0)}</td>
                    <td className="px-4 py-3 text-right">{formatCOP(m.comision ?? 0)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCOP(m.neto ?? 0)}</td>
                    <td className="px-4 py-3">{m.notas || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'devoluciones' && (
        <div className="space-y-4">
          <div className="flex justify-end items-center">
            <input
              type="month"
              value={mesDevoluciones}
              onChange={(e) => setMesDevoluciones(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="bg-white border border-[#EDE5DC] rounded-2xl overflow-x-auto">
            <table className="w-full min-w-[950px] text-sm">
              <thead>
                <tr className="bg-[#FAF6F0]">
                  <th className={thClass}>Fecha</th>
                  <th className={thClass}>Tienda</th>
                  <th className={thClass}>Producto</th>
                  <th className={`${thClass} text-right`}>Unidades devueltas</th>
                  <th className={thClass}>Notas</th>
                </tr>
              </thead>
              <tbody>
                {devolucionesFiltradas.map((m) => (
                  <tr key={m.id} className="border-t border-[#EDE5DC]">
                    <td className="px-4 py-3">{formatFecha(m.fecha)}</td>
                    <td className="px-4 py-3">{m.consignataria_nombre}</td>
                    <td className="px-4 py-3">{m.producto_nombre}</td>
                    <td className="px-4 py-3 text-right font-semibold">{m.cantidad}</td>
                    <td className="px-4 py-3">{m.notas || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {devolucionesFiltradas.length === 0 && (
              <p className="px-4 py-8 text-sm text-center text-[#8A7D72]">
                No hay devoluciones registradas para este mes.
              </p>
            )}
          </div>
        </div>
      )}

      {showModalSalida && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModalSalida(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-lg border shadow-xl">
            <h3 className="text-lg font-semibold mb-1">Nueva salida</h3>
            <p className="text-sm mb-4 text-[#1A1510]/50">
              Si no hay stock disponible, primero recíbelo en <Link href="/productos" className="text-[var(--color-accent)] hover:underline">productos</Link>.
            </p>
            <form onSubmit={submitSalida} className="space-y-3">
              <select required value={salidaConsignatariaId} onChange={(e) => setSalidaConsignatariaId(e.target.value)} className={inputClass}>
                <option value="">Tienda consignataria</option>
                {consignatarias.filter((c) => c.activa).map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
              <select required value={salidaProductoId} onChange={(e) => setSalidaProductoId(e.target.value)} className={inputClass}>
                <option value="">Producto</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} · {p.stock_actual} uds disponibles
                  </option>
                ))}
              </select>
              {productoSeleccionado && <p className="text-xs text-[#1A1510]/50">Stock disponible: {productoSeleccionado.stock_actual} unidades</p>}
              <input type="number" min={1} max={productoSeleccionado?.stock_actual ?? undefined} value={salidaCantidad} onChange={(e) => setSalidaCantidad(Number(e.target.value))} className={inputClass} placeholder="Cantidad" />
              <input type="number" min={0} value={salidaCostoUnitario || ''} onChange={(e) => setSalidaCostoUnitario(Number(e.target.value))} className={inputClass} placeholder="Costo unitario (opcional)" />
              <input type="date" value={salidaFecha} onChange={(e) => setSalidaFecha(e.target.value)} className={inputClass} />
              {salidaError && <p className="text-sm text-red-600">{salidaError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="px-4 py-2 border border-[#EDE5DC] rounded-lg text-sm text-[#4A3F35]" onClick={() => setShowModalSalida(false)}>Cancelar</button>
                <button type="submit" disabled={salidaSubmitting} className="btn-primary px-4 py-2 rounded-lg">{salidaSubmitting ? 'Registrando...' : 'Registrar salida'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModalMovimiento && consignacionActiva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModalMovimiento(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-lg border shadow-xl">
            <h3 className="text-lg font-semibold">{tipoMovimiento === 'devolucion' ? 'Registrar devolución' : 'Registrar liquidación'}</h3>
            <p className="text-sm text-[#1A1510]/50">Producto: {consignacionActiva.producto_nombre}</p>
            <p className="text-sm text-[#1A1510]/50">Tienda: {consignacionActiva.consignataria_nombre}</p>
            <p className="text-sm text-[#1A1510]/50 mb-4">Disponibles: {consignacionActiva.unidades_disponibles} unidades</p>
            <form onSubmit={submitMovimiento} className="space-y-3">
              <input type="number" min={1} max={consignacionActiva.unidades_disponibles} value={movCantidad} onChange={(e) => setMovCantidad(Number(e.target.value))} className={inputClass} placeholder="Cantidad" />
              {tipoMovimiento === 'liquidacion' && (
                <>
                  <input type="number" min={0} value={movPrecioVenta || ''} onChange={(e) => setMovPrecioVenta(Number(e.target.value))} className={inputClass} placeholder="Precio de venta por unidad" />
                  <div className="bg-[var(--color-accent-pale)] rounded-xl p-4 text-sm">
                    <p>Total vendido: {formatCOP(previewMovimiento.bruto)}</p>
                    <p>Comisión ({pctConsignacionActiva}%): -{formatCOP(previewMovimiento.comision)}</p>
                    <p className="font-bold text-green-700">Neto a recibir: {formatCOP(previewMovimiento.neto)}</p>
                  </div>
                </>
              )}
              <input type="date" value={movFecha} onChange={(e) => setMovFecha(e.target.value)} className={inputClass} />
              <label className="block text-xs font-medium text-[#1A1510]/60 -mb-1">Nota (opcional)</label>
              <textarea
                value={movNotas}
                onChange={(e) => setMovNotas(e.target.value)}
                className={`${inputClass} min-h-[90px]`}
                placeholder={
                  tipoMovimiento === 'devolucion'
                    ? 'Ej: Producto en buen estado, sin daños'
                    : 'Ej: Liquidación del mes de abril, vendieron todo el lote'
                }
              />
              {movError && <p className="text-sm text-red-600">{movError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="px-4 py-2 border border-[#EDE5DC] rounded-lg text-sm text-[#4A3F35]" onClick={() => setShowModalMovimiento(false)}>Cancelar</button>
                <button type="submit" disabled={movSubmitting} className="btn-primary px-4 py-2 rounded-lg">{movSubmitting ? 'Guardando...' : 'Guardar movimiento'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
