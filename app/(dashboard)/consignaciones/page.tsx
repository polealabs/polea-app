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
  registrarDevolucionMultiple,
  registrarSalidaMultiple,
} from './actions'
import Toast from '@/components/ui/Toast'
import { useToast } from '@/lib/hooks/useToast'
import ConfirmModal from '@/components/ui/ConfirmModal'
import ProductoSelect from '@/components/ui/ProductoSelect'
import { toLocalISODateString, toLocalISOYearMonthString } from '@/lib/utils'

type ConsignacionRow = Consignacion & {
  producto_nombre: string
  consignataria_nombre: string
  precio_unitario: number
}

type MovimientoConDetalles = ConsignacionMovimiento & {
  producto_nombre: string
  consignataria_nombre: string
  consignataria_id: string
}

type SalidaReciente = {
  id: string
  fecha: string
  notas?: string | null
  tiendas_consignatarias?: { nombre?: string } | null
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
const thCompactClass = 'text-left px-3 py-3 text-[10px] font-semibold uppercase tracking-wide text-[#8A7D72]'

export default function ConsignacionesPage() {
  const { tienda, loading: tiendaLoading } = useTienda()
  const { toasts, showToast, removeToast } = useToast()

  const [consignatarias, setConsignatarias] = useState<TiendaConsignataria[]>([])
  const [consignaciones, setConsignaciones] = useState<ConsignacionRow[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoConDetalles[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [salidas, setSalidas] = useState<SalidaReciente[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'tiendas' | 'inventario' | 'devoluciones' | 'liquidaciones'>('tiendas')

  const [showModalSalida, setShowModalSalida] = useState(false)
  const [showModalMovimiento, setShowModalMovimiento] = useState(false)
  const [showModalLiquidacion, setShowModalLiquidacion] = useState(false)
  const [showModalDevolucionMultiple, setShowModalDevolucionMultiple] = useState(false)
  const [showFormTienda, setShowFormTienda] = useState(false)
  const [editando, setEditando] = useState<TiendaConsignataria | null>(null)
  const [consignacionActiva, setConsignacionActiva] = useState<ConsignacionRow | null>(null)
  const [tipoMovimiento, setTipoMovimiento] = useState<'devolucion' | 'liquidacion'>('liquidacion')
  const [confirmDeleteTienda, setConfirmDeleteTienda] = useState<string | null>(null)

  const [salidaConsignatariaId, setSalidaConsignatariaId] = useState('')
  const [salidaFecha, setSalidaFecha] = useState(() => toLocalISODateString())
  const [salidaNotas, setSalidaNotas] = useState('')
  const [salidaItems, setSalidaItems] = useState<
    {
      producto_id: string
      cantidad: number
      precio_unitario: number
    }[]
  >([{ producto_id: '', cantidad: 1, precio_unitario: 0 }])
  const [salidaSubmitting, setSalidaSubmitting] = useState(false)
  const [salidaError, setSalidaError] = useState<string | null>(null)

  const [devMultiConsignatariaId, setDevMultiConsignatariaId] = useState('')
  const [devMultiFecha, setDevMultiFecha] = useState(() => toLocalISODateString())
  const [devMultiNotas, setDevMultiNotas] = useState('')
  const [devMultiItems, setDevMultiItems] = useState<{ consignacion_id: string; cantidad: number }[]>([])
  const [devMultiSubmitting, setDevMultiSubmitting] = useState(false)
  const [devMultiError, setDevMultiError] = useState<string | null>(null)

  const [movCantidad, setMovCantidad] = useState(1)
  const [movPrecioVenta, setMovPrecioVenta] = useState(0)
  const [movFecha, setMovFecha] = useState(() => toLocalISODateString())
  const [movNotas, setMovNotas] = useState('')
  const [movSubmitting, setMovSubmitting] = useState(false)
  const [movError, setMovError] = useState<string | null>(null)

  const [inventarioVista, setInventarioVista] = useState<'tienda' | 'global'>('global')
  const [filtroConsignatariaInv, setFiltroConsignatariaInv] = useState('')
  const [mesDevoluciones, setMesDevoluciones] = useState(() => toLocalISOYearMonthString())
  const [mesLiquidaciones, setMesLiquidaciones] = useState(() => toLocalISOYearMonthString())
  const [mesRemisiones, setMesRemisiones] = useState(() => {
    const hoy = new Date()
    const local = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000)
    return local.toISOString().slice(0, 7)
  })
  const [filtroTiendaLiq, setFiltroTiendaLiq] = useState<string>('todas')
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
    const [tRes, cRes, mRes, pRes, sRes] = await Promise.all([
      supabase.from('tiendas_consignatarias').select('*').eq('tienda_id', tienda.id).order('nombre'),
      supabase
        .from('consignaciones')
        .select('*, productos(nombre), tiendas_consignatarias(nombre)')
        .eq('tienda_id', tienda.id)
        .order('fecha', { ascending: false }),
      supabase
        .from('consignacion_movimientos')
        .select('*, consignaciones(producto_id, consignataria_id, precio_unitario, productos(nombre), tiendas_consignatarias(nombre, id))')
        .eq('tienda_id', tienda.id)
        .order('fecha', { ascending: false }),
      supabase
        .from('productos')
        .select('id, nombre, precio_venta, stock_actual')
        .eq('tienda_id', tienda.id)
        .neq('estado', 'archivado')
        .gt('stock_actual', 0)
        .order('nombre'),
      supabase
        .from('consignacion_salidas')
        .select('*, tiendas_consignatarias(nombre)')
        .eq('tienda_id', tienda.id)
        .order('fecha', { ascending: false })
        ,
    ])

    if (tRes.error) showToast(tRes.error.message, 'error')
    if (cRes.error) showToast(cRes.error.message, 'error')
    if (mRes.error) showToast(mRes.error.message, 'error')
    if (pRes.error) showToast(pRes.error.message, 'error')
    if (sRes.error) showToast(sRes.error.message, 'error')

    setConsignatarias((tRes.data ?? []) as TiendaConsignataria[])
    setProductos((pRes.data ?? []) as Producto[])
    setSalidas((sRes.data ?? []) as SalidaReciente[])

    const movs: MovimientoConDetalles[] = (mRes.data ?? []).map((r: Record<string, unknown>) => {
      const consignacion = r.consignaciones as
        | {
            productos?: { nombre?: string } | { nombre?: string }[] | null
            tiendas_consignatarias?: { nombre?: string; id?: string } | { nombre?: string; id?: string }[] | null
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
      const consignataria_id = Array.isArray(tiendaRaw)
        ? (tiendaRaw[0]?.id ?? '')
        : (tiendaRaw?.id ?? '')
      return {
        ...(r as unknown as ConsignacionMovimiento),
        producto_nombre,
        consignataria_nombre,
        consignataria_id,
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
        precio_unitario: Number((r as { precio_unitario?: number }).precio_unitario ?? 0),
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

  const consignacionesActivas = useMemo(
    () =>
      consignaciones.filter(
        (c) =>
          c.consignataria_id === devMultiConsignatariaId &&
          c.estado === 'activa' &&
          c.unidades_disponibles > 0,
      ),
    [consignaciones, devMultiConsignatariaId],
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
    () =>
      movimientos
        .filter((m) => m.tipo === 'liquidacion' && m.fecha.startsWith(mesLiquidaciones))
        .filter((m) => filtroTiendaLiq === 'todas' || m.consignataria_id === filtroTiendaLiq),
    [movimientos, mesLiquidaciones, filtroTiendaLiq],
  )
  const remisionesFiltradas = useMemo(
    () => salidas.filter((s) => s.fecha.startsWith(mesRemisiones)),
    [salidas, mesRemisiones],
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

  function agregarLineaSalida() {
    setSalidaItems((prev) => [...prev, { producto_id: '', cantidad: 1, precio_unitario: 0 }])
  }

  function actualizarLineaSalida(i: number, campo: string, valor: string | number) {
    setSalidaItems((prev) => {
      const nuevas = [...prev]
      nuevas[i] = { ...nuevas[i], [campo]: valor }
      if (campo === 'producto_id') {
        const prod = productos.find((p) => p.id === valor)
        if (prod) nuevas[i].precio_unitario = prod.precio_venta
      }
      return nuevas
    })
  }

  function eliminarLineaSalida(i: number) {
    setSalidaItems((prev) => prev.filter((_, j) => j !== i))
  }

  async function submitDevolucionMultiple() {
    setDevMultiSubmitting(true)
    setDevMultiError(null)
    const itemsValidos = devMultiItems.filter((i) => i.consignacion_id && i.cantidad > 0)
    const result = await registrarDevolucionMultiple({
      consignataria_id: devMultiConsignatariaId,
      fecha: devMultiFecha,
      notas: devMultiNotas || undefined,
      items: itemsValidos,
    })
    if (result?.error) {
      setDevMultiError(result.error)
      setDevMultiSubmitting(false)
      return
    }
    setShowModalDevolucionMultiple(false)
    setDevMultiConsignatariaId('')
    setDevMultiItems([])
    setDevMultiNotas('')
    setDevMultiError(null)
    setDevMultiSubmitting(false)
    showToast('Devolución registrada', 'success')
    await loadData()
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
    setShowModalLiquidacion(false)
    setConsignacionActiva(null)
    setMovCantidad(1)
    setMovPrecioVenta(0)
    setMovNotas('')
    setMovError(null)
    void loadData()
  }

  function abrirSalida(consignatariaId?: string) {
    setSalidaConsignatariaId(consignatariaId ?? '')
    setSalidaItems([{ producto_id: '', cantidad: 1, precio_unitario: 0 }])
    setSalidaNotas('')
    setSalidaFecha(toLocalISODateString())
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
    setMovPrecioVenta(tipo === 'liquidacion' ? (consig.precio_unitario ?? 0) : 0)
    setMovFecha(toLocalISODateString())
    setMovNotas('')
    setMovError(null)
    setShowModalMovimiento(true)
  }

  function abrirNuevaLiquidacion() {
    const primeraActiva = consignaciones.find((c) => c.unidades_disponibles > 0) ?? null
    if (!primeraActiva) {
      showToast('No hay consignaciones activas para liquidar', 'error')
      return
    }
    setConsignacionActiva(primeraActiva)
    setTipoMovimiento('liquidacion')
    setMovCantidad(1)
    setMovPrecioVenta(primeraActiva.precio_unitario ?? 0)
    setMovFecha(toLocalISODateString())
    setMovNotas('')
    setMovError(null)
    setShowModalLiquidacion(true)
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
            Tiendas Aliadas
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-soft)' }}>
            Gestiona tiendas consignatarias, salidas y liquidaciones.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => abrirSalida()}
            className="btn-primary px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2"
          >
            <span>↗</span> Nueva salida
          </button>
          <button
            onClick={() => {
              setShowModalLiquidacion(true)
              abrirNuevaLiquidacion()
            }}
            className="border border-[#1E3A2F] text-[#1E3A2F] px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 text-sm hover:bg-[#1E3A2F] hover:text-white transition"
          >
            <span>💰</span> Nueva liquidación
          </button>
        </div>
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

          <div className="min-w-0 bg-white border border-[#EDE5DC] rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
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

          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-soft)' }}>
                Remisiones recientes
              </p>
              <input
                type="month"
                value={mesRemisiones}
                onChange={(e) => setMesRemisiones(e.target.value)}
                className="text-xs px-2 py-1.5 rounded-lg border"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
              />
            </div>
            {remisionesFiltradas.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--color-text-soft)' }}>
                Sin remisiones en este mes.
              </p>
            ) : (
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                <table className="w-full text-sm">
                  <thead style={{ background: 'var(--color-background)' }}>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-soft)' }}>Fecha</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-soft)' }}>Tienda</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-soft)' }}>Notas</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-soft)' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {remisionesFiltradas.map((s) => (
                      <tr key={s.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                        <td className="px-4 py-3" style={{ color: 'var(--color-text-soft)' }}>
                          {new Date(`${s.fecha}T12:00:00`).toLocaleDateString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>
                          {s.tiendas_consignatarias?.nombre}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-soft)' }}>
                          {s.notas || '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/consignaciones/salida/${s.id}/pdf`}
                            className="text-xs font-medium hover:underline"
                            style={{ color: 'var(--color-accent)' }}
                          >
                            Ver remisión →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'inventario' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button type="button" onClick={() => setInventarioVista('global')} className={`px-3 py-1.5 border rounded-full text-xs ${inventarioVista === 'global' ? 'border-[var(--color-accent)] text-[var(--color-accent)]' : ''}`}>Global</button>
            <button type="button" onClick={() => setInventarioVista('tienda')} className={`px-3 py-1.5 border rounded-full text-xs ${inventarioVista === 'tienda' ? 'border-[var(--color-accent)] text-[var(--color-accent)]' : ''}`}>Por tienda</button>
          </div>

          {inventarioVista === 'tienda' && (
            <>
              <select value={filtroConsignatariaInv} onChange={(e) => setFiltroConsignatariaInv(e.target.value)} className={`max-w-md w-full ${inputClass}`}>
                <option value="">Selecciona consignataria</option>
                {consignatarias.filter((c) => c.activa).map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>

              <div className="min-w-0 bg-white border border-[#EDE5DC] rounded-2xl overflow-x-auto">
                <table className="w-full text-sm">
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
            <div className="min-w-0 bg-white border border-[#EDE5DC] rounded-2xl overflow-x-auto">
              <table className="w-full text-sm">
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              <input
                type="month"
                value={mesLiquidaciones}
                onChange={(e) => setMesLiquidaciones(e.target.value)}
                className={inputClass}
                style={{ maxWidth: '200px' }}
              />
              <select
                value={filtroTiendaLiq}
                onChange={e => setFiltroTiendaLiq(e.target.value)}
                className={inputClass}
                style={{ maxWidth: '220px' }}
              >
                <option value="todas">Todas las tiendas</option>
                {consignatarias.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium" style={{ color: 'var(--color-text-soft)' }}>Neto del mes</p>
              <p className="font-serif text-xl font-medium" style={{ color: 'var(--color-primary)' }}>
                {formatCOP(liquidacionesHistorial.reduce((s, m) => s + (m.neto ?? 0), 0))}
              </p>
            </div>
          </div>
          {liquidacionesHistorial.length > 0 && (
            <button
              onClick={() => {
                const totalNeto = liquidacionesHistorial.reduce((s, m) => s + (m.neto ?? 0), 0)
                const nombreTienda = filtroTiendaLiq !== 'todas'
                  ? consignatarias.find(c => c.id === filtroTiendaLiq)?.nombre ?? ''
                  : 'Todas las tiendas'
                const mes = new Date(mesLiquidaciones + '-01').toLocaleString('es-CO', { month: 'long', year: 'numeric' })
                const params = new URLSearchParams({
                  tipo: 'cuenta_cobro',
                  destinatario: nombreTienda,
                  concepto: `Ventas bajo consignación en ${nombreTienda} - ${mes}`,
                  total: String(totalNeto),
                  consignataria_id: filtroTiendaLiq !== 'todas' ? filtroTiendaLiq : '',
                })
                window.location.href = `/documentos/nuevo?${params.toString()}`
              }}
              className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
            >
              <span>🧾</span> Crear cuenta de cobro
            </button>
          )}
          <div className="min-w-0 bg-white border border-[#EDE5DC] rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#FAF6F0]">
                  <th className={thCompactClass}>Fecha</th>
                  <th className={thCompactClass}>Tienda</th>
                  <th className={thCompactClass}>Producto</th>
                  <th className={`${thCompactClass} text-right`}>Cant vendida</th>
                  <th className={`${thCompactClass} text-right`}>Precio unit</th>
                  <th className={`${thCompactClass} text-right`}>Total bruto</th>
                  <th className={`${thCompactClass} text-right`}>Comisión</th>
                  <th className={`${thCompactClass} text-right`}>Neto</th>
                  <th className={thCompactClass}>Notas</th>
                </tr>
              </thead>
              <tbody>
                {liquidacionesHistorial.map((m) => (
                  <tr key={m.id} className="border-t border-[#EDE5DC]">
                    <td className="px-3 py-3 text-sm">{formatFecha(m.fecha)}</td>
                    <td className="px-3 py-3 text-sm">{m.consignataria_nombre}</td>
                    <td className="px-3 py-3 text-sm">{m.producto_nombre}</td>
                    <td className="px-3 py-3 text-sm text-right">{m.cantidad}</td>
                    <td className="px-3 py-3 text-sm text-right">{formatCOP(m.precio_venta ?? 0)}</td>
                    <td className="px-3 py-3 text-sm text-right">{formatCOP(m.total_bruto ?? 0)}</td>
                    <td className="px-3 py-3 text-sm text-right">{formatCOP(m.comision ?? 0)}</td>
                    <td className="px-3 py-3 text-sm text-right font-semibold">{formatCOP(m.neto ?? 0)}</td>
                    <td className="px-3 py-3 text-sm max-w-[220px] truncate" title={m.notas ?? undefined}>
                      {m.notas ? (m.notas.length > 30 ? `${m.notas.slice(0, 30)}…` : m.notas) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'devoluciones' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => {
                setShowModalDevolucionMultiple(true)
                setDevMultiConsignatariaId('')
                setDevMultiFecha(toLocalISODateString())
                setDevMultiNotas('')
                setDevMultiItems([])
                setDevMultiError(null)
              }}
              className="btn-primary text-sm font-semibold px-4 py-2 rounded-lg"
            >
              + Nueva devolución
            </button>
            <input
              type="month"
              value={mesDevoluciones}
              onChange={(e) => setMesDevoluciones(e.target.value)}
              className={inputClass}
              style={{ maxWidth: '200px' }}
            />
          </div>
          <div className="min-w-0 bg-white border border-[#EDE5DC] rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--color-surface)' }}
          >
            <div
              className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            >
              <p className="font-semibold" style={{ color: 'var(--color-text)' }}>
                Nueva salida a consignación
              </p>
              <button
                onClick={() => setShowModalSalida(false)}
                className="text-xl"
                style={{ color: 'var(--color-text-soft)' }}
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-soft)' }}>
                  Tienda consignataria
                </label>
                <select
                  value={salidaConsignatariaId}
                  onChange={(e) => setSalidaConsignatariaId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{
                    borderColor: 'var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                  }}
                >
                  <option value="">Selecciona una tienda</option>
                  {consignatarias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({c.porcentaje_comision}% comisión)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-soft)' }}>
                  Fecha
                </label>
                <input
                  type="date"
                  value={salidaFecha}
                  onChange={(e) => setSalidaFecha(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{
                    borderColor: 'var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>

              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-soft)' }}>
                  Productos
                </p>
                <div className="space-y-3">
                  {salidaItems.map((item, i) => {
                    const prod = productos.find((p) => p.id === item.producto_id)
                    return (
                      <div
                        key={i}
                        className="rounded-xl p-3 space-y-2"
                        style={{
                          background: 'var(--color-background)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        <div className="grid grid-cols-1 gap-2">
                          <ProductoSelect
                            opciones={productos.map((p) => ({
                              id: p.id,
                              label: p.nombre,
                              sublabel: `Stock: ${p.stock_actual} uds · ${formatCOP(p.precio_venta)}`,
                            }))}
                            value={item.producto_id}
                            onChange={(id) => actualizarLineaSalida(i, 'producto_id', id)}
                            placeholder="Buscar producto..."
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs mb-1" style={{ color: 'var(--color-text-soft)' }}>
                              Cantidad
                            </label>
                            <input
                              type="number"
                              min="1"
                              max={prod?.stock_actual ?? 999}
                              value={item.cantidad === 0 ? '' : item.cantidad}
                              onChange={(e) =>
                                actualizarLineaSalida(
                                  i,
                                  'cantidad',
                                  e.target.value === '' ? 0 : Number(e.target.value),
                                )
                              }
                              className="w-full px-3 py-2 rounded-lg border text-sm"
                              style={{
                                borderColor: 'var(--color-border)',
                                background: 'var(--color-surface)',
                                color: 'var(--color-text)',
                              }}
                            />
                            {prod && (
                              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-soft)' }}>
                                Máx: {prod.stock_actual}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs mb-1" style={{ color: 'var(--color-text-soft)' }}>
                              Precio unitario
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={item.precio_unitario === 0 ? '' : item.precio_unitario}
                              onChange={(e) =>
                                actualizarLineaSalida(
                                  i,
                                  'precio_unitario',
                                  e.target.value === '' ? 0 : Number(e.target.value),
                                )
                              }
                              className="w-full px-3 py-2 rounded-lg border text-sm"
                              style={{
                                borderColor: 'var(--color-border)',
                                background: 'var(--color-surface)',
                                color: 'var(--color-text)',
                              }}
                            />
                          </div>
                        </div>
                        {salidaItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => eliminarLineaSalida(i)}
                            className="text-xs text-red-500 hover:underline"
                          >
                            ✕ Eliminar
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
                <button
                  type="button"
                  onClick={agregarLineaSalida}
                  className="mt-2 text-xs font-medium hover:underline"
                  style={{ color: 'var(--color-accent)' }}
                >
                  + Agregar producto
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-soft)' }}>
                  Notas (opcional)
                </label>
                <textarea
                  value={salidaNotas}
                  onChange={(e) => setSalidaNotas(e.target.value)}
                  rows={2}
                  placeholder="Observaciones de la salida..."
                  className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                  style={{
                    borderColor: 'var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>

              {salidaError && (
                <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg">{salidaError}</p>
              )}
            </div>

            <div
              className="px-6 py-4 border-t flex gap-3 justify-end sticky bottom-0"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            >
              <button
                onClick={() => setShowModalSalida(false)}
                className="text-sm px-4 py-2 rounded-lg border transition"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-soft)' }}
              >
                Cancelar
              </button>
              <button
                disabled={salidaSubmitting || !salidaConsignatariaId || salidaItems.every((i) => !i.producto_id)}
                onClick={async () => {
                  setSalidaSubmitting(true)
                  setSalidaError(null)
                  const itemsValidos = salidaItems.filter((i) => i.producto_id && i.cantidad > 0)
                  const result = await registrarSalidaMultiple({
                    consignataria_id: salidaConsignatariaId,
                    fecha: salidaFecha,
                    notas: salidaNotas || undefined,
                    items: itemsValidos,
                  })
                  if (result?.error) {
                    setSalidaError(result.error)
                  } else {
                    setShowModalSalida(false)
                    setSalidaItems([{ producto_id: '', cantidad: 1, precio_unitario: 0 }])
                    setSalidaConsignatariaId('')
                    setSalidaNotas('')
                    showToast('Salida registrada', 'success')
                    await loadData()
                  }
                  setSalidaSubmitting(false)
                }}
                className="text-sm px-4 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                style={{ background: 'var(--color-accent)', color: 'white' }}
              >
                {salidaSubmitting ? 'Guardando...' : 'Registrar salida'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModalDevolucionMultiple && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--color-surface)' }}
          >
            <div
              className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            >
              <p className="font-semibold" style={{ color: 'var(--color-text)' }}>
                Nueva devolución múltiple
              </p>
              <button
                onClick={() => setShowModalDevolucionMultiple(false)}
                className="text-xl"
                style={{ color: 'var(--color-text-soft)' }}
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-soft)' }}>
                  Tienda consignataria
                </label>
                <select
                  value={devMultiConsignatariaId}
                  onChange={(e) => {
                    setDevMultiConsignatariaId(e.target.value)
                    setDevMultiItems([])
                  }}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{
                    borderColor: 'var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                  }}
                >
                  <option value="">Selecciona una tienda</option>
                  {consignatarias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-soft)' }}>
                  Fecha
                </label>
                <input
                  type="date"
                  value={devMultiFecha}
                  onChange={(e) => setDevMultiFecha(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{
                    borderColor: 'var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>

              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-soft)' }}>
                  Consignaciones activas
                </p>
                <div className="space-y-2">
                  {consignacionesActivas.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{
                        background: 'var(--color-background)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={devMultiItems.some((i) => i.consignacion_id === c.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setDevMultiItems((prev) => [
                              ...prev,
                              { consignacion_id: c.id, cantidad: c.unidades_disponibles },
                            ])
                          } else {
                            setDevMultiItems((prev) =>
                              prev.filter((i) => i.consignacion_id !== c.id),
                            )
                          }
                        }}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                          {c.producto_nombre}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-text-soft)' }}>
                          Disponibles: {c.unidades_disponibles} uds
                        </p>
                      </div>
                      {devMultiItems.some((i) => i.consignacion_id === c.id) && (
                        <input
                          type="number"
                          min="1"
                          max={c.unidades_disponibles}
                          value={devMultiItems.find((i) => i.consignacion_id === c.id)?.cantidad ?? 1}
                          onChange={(e) =>
                            setDevMultiItems((prev) =>
                              prev.map((i) =>
                                i.consignacion_id === c.id
                                  ? { ...i, cantidad: Number(e.target.value) }
                                  : i,
                              ),
                            )
                          }
                          className="w-16 px-2 py-1 rounded-lg border text-sm text-center"
                          style={{
                            borderColor: 'var(--color-border)',
                            background: 'var(--color-surface)',
                            color: 'var(--color-text)',
                          }}
                        />
                      )}
                    </div>
                  ))}
                  {devMultiConsignatariaId && consignacionesActivas.length === 0 && (
                    <p className="text-sm text-[#8A7D72]">No hay consignaciones activas para esta tienda.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-soft)' }}>
                  Notas (opcional)
                </label>
                <textarea
                  value={devMultiNotas}
                  onChange={(e) => setDevMultiNotas(e.target.value)}
                  rows={2}
                  placeholder="Observaciones de la devolución..."
                  className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                  style={{
                    borderColor: 'var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>

              {devMultiError && (
                <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg">{devMultiError}</p>
              )}
            </div>

            <div
              className="px-6 py-4 border-t flex gap-3 justify-end sticky bottom-0"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            >
              <button
                onClick={() => setShowModalDevolucionMultiple(false)}
                className="text-sm px-4 py-2 rounded-lg border transition"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-soft)' }}
              >
                Cancelar
              </button>
              <button
                disabled={devMultiSubmitting || !devMultiConsignatariaId || devMultiItems.length === 0}
                onClick={() => void submitDevolucionMultiple()}
                className="text-sm px-4 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                style={{ background: 'var(--color-accent)', color: 'white' }}
              >
                {devMultiSubmitting ? 'Guardando...' : 'Registrar devolución'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModalMovimiento && consignacionActiva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowModalMovimiento(false); setShowModalLiquidacion(false) }} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-lg border shadow-xl">
            <h3 className="text-lg font-semibold">{tipoMovimiento === 'devolucion' ? 'Registrar devolución' : 'Registrar liquidación'}</h3>
            {showModalLiquidacion && (
              <select
                value={consignacionActiva.id}
                onChange={(e) => {
                  const sel = consignaciones.find(c => c.id === e.target.value)
                  if (!sel) return
                  setConsignacionActiva(sel)
                  setMovCantidad(1)
                  setMovPrecioVenta(sel.precio_unitario ?? 0)
                }}
                className={`${inputClass} mb-2`}
              >
                {consignaciones.filter(c => c.unidades_disponibles > 0).map(c => (
                  <option key={c.id} value={c.id}>{c.consignataria_nombre} · {c.producto_nombre} ({c.unidades_disponibles})</option>
                ))}
              </select>
            )}
            <p className="text-sm text-[#1A1510]/50">Producto: {consignacionActiva.producto_nombre}</p>
            <p className="text-sm text-[#1A1510]/50">Tienda: {consignacionActiva.consignataria_nombre}</p>
            <p className="text-sm text-[#1A1510]/50 mb-4">Disponibles: {consignacionActiva.unidades_disponibles} unidades</p>
            <form onSubmit={submitMovimiento} className="space-y-3">
              {tipoMovimiento === 'liquidacion' && (
                <label className="block text-xs font-medium text-[#1A1510]/60 -mb-1">Unidades vendidas</label>
              )}
              <input type="number" min={1} max={consignacionActiva.unidades_disponibles} value={movCantidad} onChange={(e) => setMovCantidad(Number(e.target.value))} className={inputClass} placeholder="Cantidad" />
              {tipoMovimiento === 'liquidacion' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[#1A1510]/60 mb-1">Precio de venta por unidad</label>
                    <input
                      type="number"
                      value={movPrecioVenta === 0 ? '' : movPrecioVenta}
                      onChange={e => setMovPrecioVenta(e.target.value === '' ? 0 : Number(e.target.value))}
                      className={inputClass}
                    />
                    <p className="text-xs text-[#8A7D72] mt-1">Precio original: {formatCOP(consignacionActiva?.precio_unitario ?? 0)}</p>
                  </div>
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
                <button type="button" className="px-4 py-2 border border-[#EDE5DC] rounded-lg text-sm text-[#4A3F35]" onClick={() => { setShowModalMovimiento(false); setShowModalLiquidacion(false) }}>Cancelar</button>
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
