'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTienda } from '@/lib/hooks/useTienda'
import {
  cerrarEvento,
  agregarInventarioEvento,
  actualizarDevueltaEvento,
  eliminarInventarioEvento,
  registrarVentaEvento,
  eliminarVentaEvento,
  registrarGastoEvento,
  eliminarGastoEvento,
} from '../actions'
import Toast from '@/components/ui/Toast'
import { useToast } from '@/lib/hooks/useToast'
import { ModuleTableSkeleton } from '@/components/skeletons/ModuleTableSkeleton'
import ProductoSelect from '@/components/ui/ProductoSelect'
import type { Producto } from '@/lib/types'
import ConfirmModal from '@/components/ui/ConfirmModal'
import ImportCSV from '@/components/ui/ImportCSV'
import { descargarCSV } from '@/lib/csv'
import { importarInventarioEvento, importarVentasEvento, importarGastosEvento } from './actions-import'

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(
    n || 0,
  )
}

function formatFecha(f: string) {
  return new Date(`${f}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
}

type Evento = {
  id: string
  nombre: string
  lugar: string | null
  fecha_inicio: string
  fecha_fin: string | null
  tipo: string
  estado: 'activo' | 'cerrado'
  notas: string | null
}

type EventoInventario = {
  id: string
  producto_id: string
  variante_id?: string | null
  cantidad_llevada: number
  cantidad_vendida: number
  cantidad_devuelta: number
  productos?: { nombre?: string; precio_venta?: number } | null
  producto_variantes?: { nombre?: string; precio_venta?: number } | null
}

type EventoVenta = {
  id: string
  producto_id: string
  cantidad: number
  precio_venta: number
  medio_pago: string
  created_at: string
  productos?: { nombre?: string } | null
}

type EventoGasto = {
  id: string
  descripcion: string
  monto: number
  categoria: string
  created_at: string
}

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-[#1A1510]/20 bg-white text-[#1A1510] placeholder:text-[#1A1510]/40 focus:outline-none focus:ring-2 focus:ring-[#C4622D]/40 focus:border-[#C4622D] transition text-sm'

function descargarPlantillaInventario() {
  descargarCSV('plantilla_inventario_evento.csv', [
    ['producto', 'cantidad_llevada'],
    ['Collar Luna', '10'],
    ['Pulsera Dorada', '5'],
  ])
}

function descargarPlantillaVentas() {
  descargarCSV('plantilla_ventas_evento.csv', [
    ['producto', 'cantidad', 'precio_venta', 'medio_pago'],
    ['Collar Luna', '2', '150000', 'efectivo'],
    ['Pulsera Dorada', '1', '', 'nequi'],
  ])
}

function descargarPlantillaGastos() {
  descargarCSV('plantilla_gastos_evento.csv', [
    ['descripcion', 'monto', 'categoria'],
    ['Transporte ida y vuelta', '50000', 'Transporte'],
    ['Almuerzo', '25000', 'Alimentación'],
  ])
}

export default function EventoDetallePage() {
  const params = useParams<{ id: string }>()
  const eventoId = typeof params.id === 'string' ? params.id : params.id?.[0] ?? ''
  const router = useRouter()
  const { tienda, loading: tiendaLoading, canEdit } = useTienda()
  const { toasts, showToast, removeToast } = useToast()

  const [evento, setEvento] = useState<Evento | null>(null)
  const [inventario, setInventario] = useState<EventoInventario[]>([])
  const [ventas, setVentas] = useState<EventoVenta[]>([])
  const [gastos, setGastos] = useState<EventoGasto[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'inventario' | 'ventas' | 'gastos' | 'consolidado'>('inventario')
  const [confirmCerrar, setConfirmCerrar] = useState(false)
  const [cerrando, setCerrando] = useState(false)

  const [invItems, setInvItems] = useState<
    { producto_id: string; variante_id?: string; nombre: string; cantidad: number }[]
  >([])
  const [invProductoId, setInvProductoId] = useState('')
  const [invVarianteId, setInvVarianteId] = useState('')
  const [variantesPorProducto, setVariantesPorProducto] = useState<
    Map<string, { id: string; nombre: string; stock_actual: number }[]>
  >(() => new Map())
  const [invCantidad, setInvCantidad] = useState(1)
  const [invSubmitting, setInvSubmitting] = useState(false)

  const [ventaLineaInventarioId, setVentaLineaInventarioId] = useState('')
  const [ventaCantidad, setVentaCantidad] = useState(1)
  const [ventaPrecio, setVentaPrecio] = useState(0)
  const [ventaMedio, setVentaMedio] = useState('efectivo')
  const [ventaSubmitting, setVentaSubmitting] = useState(false)

  const [gastoDesc, setGastoDesc] = useState('')
  const [gastoMonto, setGastoMonto] = useState(0)
  const [gastoCategoria, setGastoCategoria] = useState('Transporte')
  const [gastoSubmitting, setGastoSubmitting] = useState(false)

  const opcionesProductos = useMemo(
    () =>
      productos.map((p) => ({
        id: p.id,
        label: p.nombre,
        sublabel: `Stock: ${p.stock_actual} uds · ${formatCOP(p.precio_venta)}`,
      })),
    [productos],
  )

  const opcionesInventarioEvento = useMemo(
    () =>
      inventario
        .map((item) => {
          const prod = productos.find((p) => p.id === item.producto_id)
          const disponible = item.cantidad_llevada - item.cantidad_vendida - item.cantidad_devuelta
          const pv = item.producto_variantes as { nombre?: string; precio_venta?: number } | null | undefined
          const precio = pv?.precio_venta ?? prod?.precio_venta ?? item.productos?.precio_venta ?? 0
          const baseNombre = prod?.nombre ?? item.productos?.nombre ?? item.producto_id
          const varianteNombre = pv?.nombre
          const label = varianteNombre ? `${baseNombre} — ${varianteNombre}` : baseNombre
          return {
            id: item.id,
            label,
            sublabel: `Disponible en evento: ${disponible} uds · ${formatCOP(precio)}`,
            disponible,
          }
        })
        .filter((o) => o.disponible > 0)
        .map(({ id, label, sublabel }) => ({ id, label, sublabel })),
    [inventario, productos],
  )

  const loadData = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!tienda || !eventoId) return
      const silent = opts?.silent === true
      if (!silent) setLoading(true)
      try {
        const supabase = createClient()
        const [eRes, iRes, vRes, gRes, pRes] = await Promise.all([
          supabase.from('eventos').select('*').eq('id', eventoId).eq('tienda_id', tienda.id).maybeSingle(),
          supabase
            .from('evento_inventario')
            .select('*, productos(nombre, precio_venta), variante_id, producto_variantes(nombre, precio_venta)')
            .eq('evento_id', eventoId)
            .eq('tienda_id', tienda.id)
            .order('created_at'),
          supabase
            .from('evento_ventas')
            .select('*, productos(nombre)')
            .eq('evento_id', eventoId)
            .eq('tienda_id', tienda.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('evento_gastos')
            .select('*')
            .eq('evento_id', eventoId)
            .eq('tienda_id', tienda.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('productos')
            // Columna en BD: tiene_variantes (snake_case), igual que lib/types y productos/actions-import
            .select('id, nombre, precio_venta, stock_actual, tiene_variantes')
            .eq('tienda_id', tienda.id)
            .neq('estado', 'archivado')
            .order('nombre'),
        ])
        if (!eRes.data) {
          setEvento(null)
          router.push('/eventos')
          return
        }
        setEvento(eRes.data as Evento)
        setInventario((iRes.data ?? []) as EventoInventario[])
        setVentas((vRes.data ?? []) as EventoVenta[])
        setGastos((gRes.data ?? []) as EventoGasto[])
        const prods = (pRes.data ?? []) as Producto[]
        setProductos(prods)

        // Cargar variantes por producto_id real (no solo si tiene_variantes está true en BD; el flag puede estar desactualizado)
        const idsProductos = prods.map((p) => p.id)
        if (idsProductos.length > 0) {
          const { data: variantesData } = await supabase
            .from('producto_variantes')
            .select('id, producto_id, nombre, stock_actual')
            .in('producto_id', idsProductos)
            .eq('activa', true)
            .eq('tienda_id', tienda.id)
          const map = new Map<string, { id: string; nombre: string; stock_actual: number }[]>()
          for (const v of variantesData ?? []) {
            if (!map.has(v.producto_id)) map.set(v.producto_id, [])
            map.get(v.producto_id)!.push(v)
          }
          setVariantesPorProducto(map)
        } else {
          setVariantesPorProducto(new Map())
        }
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [tienda, eventoId, router],
  )

  useEffect(() => {
    if (tiendaLoading || !tienda || !eventoId) return
    const tid = window.setTimeout(() => {
      void loadData()
    }, 0)
    return () => window.clearTimeout(tid)
  }, [tienda, tiendaLoading, eventoId, loadData])

  const totalIngresos = useMemo(() => ventas.reduce((s, v) => s + v.cantidad * v.precio_venta, 0), [ventas])
  const totalGastos = useMemo(() => gastos.reduce((s, g) => s + g.monto, 0), [gastos])
  const utilidad = totalIngresos - totalGastos
  const rentabilidad = totalIngresos > 0 ? (utilidad / totalIngresos) * 100 : 0

  const ingresosEfectivo = useMemo(
    () => ventas.filter((v) => v.medio_pago === 'efectivo').reduce((s, v) => s + v.cantidad * v.precio_venta, 0),
    [ventas],
  )
  const ingresosTransferencia = useMemo(
    () => ventas.filter((v) => v.medio_pago !== 'efectivo').reduce((s, v) => s + v.cantidad * v.precio_venta, 0),
    [ventas],
  )

  async function handleActualizarDevuelta(productoId: string, cantidad: number, varianteId?: string | null) {
    await actualizarDevueltaEvento(eventoId, productoId, cantidad, varianteId)
    await loadData({ silent: true })
  }

  async function handleRegistrarVenta() {
    if (!ventaLineaInventarioId || ventaCantidad <= 0 || ventaPrecio <= 0) return
    const line = inventario.find((l) => l.id === ventaLineaInventarioId)
    if (!line) return
    setVentaSubmitting(true)
    const res = await registrarVentaEvento(eventoId, line.producto_id, ventaCantidad, ventaPrecio, ventaMedio)
    if (res && 'error' in res && res.error) showToast(res.error, 'error')
    else {
      showToast('Venta registrada')
      await loadData({ silent: true })
      setVentaLineaInventarioId('')
      setVentaCantidad(1)
      setVentaPrecio(0)
    }
    setVentaSubmitting(false)
  }

  async function handleEliminarVenta(ventaId: string) {
    await eliminarVentaEvento(ventaId)
    showToast('Venta eliminada')
    await loadData({ silent: true })
  }

  async function handleRegistrarGasto() {
    if (!gastoDesc || gastoMonto <= 0) return
    setGastoSubmitting(true)
    const res = await registrarGastoEvento(eventoId, gastoDesc, gastoMonto, gastoCategoria)
    if (res && 'error' in res && res.error) showToast(res.error, 'error')
    else {
      showToast('Gasto registrado')
      await loadData({ silent: true })
      setGastoDesc('')
      setGastoMonto(0)
    }
    setGastoSubmitting(false)
  }

  async function handleEliminarGasto(gastoId: string) {
    await eliminarGastoEvento(gastoId)
    showToast('Gasto eliminado')
    await loadData({ silent: true })
  }

  async function handleCerrarEvento() {
    setCerrando(true)
    const res = await cerrarEvento(eventoId)
    if (res && 'error' in res && res.error) {
      showToast(res.error, 'error')
      setCerrando(false)
      return
    }
    showToast('Evento cerrado y exportado al P&L')
    await loadData({ silent: true })
    setCerrando(false)
    setTab('consolidado')
  }

  if (tiendaLoading) return <ModuleTableSkeleton />
  if (!tienda) {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <p className="text-sm text-[#8A7D72]">No se encontró la tienda.</p>
      </div>
    )
  }
  if (!eventoId) {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <p className="text-sm text-[#8A7D72]">Evento no válido.</p>
      </div>
    )
  }
  if (loading) return <ModuleTableSkeleton />
  if (!evento) return null

  const activo = evento.estado === 'activo'
  const tabs = ['inventario', 'ventas', 'gastos', 'consolidado'] as const

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.push('/eventos')}
          className="text-sm text-[#8A7D72] hover:text-[#1A1510] mb-3 inline-flex items-center gap-1 transition"
        >
          ← Volver a eventos
        </button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-[#1E3A2F]" style={{ fontFamily: 'Fraunces, serif' }}>
                {evento.nombre}
              </h1>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  activo ? 'bg-[#E8F5EE] text-[#3A7D5A]' : 'bg-[#F0EBE4] text-[#8A7D72]'
                }`}
              >
                {activo ? 'Activo' : 'Cerrado'}
              </span>
            </div>
            <p className="text-sm text-[#8A7D72]">
              {formatFecha(evento.fecha_inicio)}
              {evento.fecha_fin ? ` → ${formatFecha(evento.fecha_fin)}` : ''}
              {evento.lugar ? ` · ${evento.lugar}` : ''}
            </p>
          </div>
          {canEdit && activo && (
            <button
              type="button"
              onClick={() => setConfirmCerrar(true)}
              disabled={cerrando}
              className="text-sm font-semibold px-4 py-2 rounded-xl border-2 transition disabled:opacity-50"
              style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
            >
              Cerrar evento
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Ingresos', value: formatCOP(totalIngresos), color: '#3A7D5A' },
          { label: 'Gastos', value: formatCOP(totalGastos), color: '#C44040' },
          { label: 'Utilidad', value: formatCOP(utilidad), color: utilidad >= 0 ? '#3A7D5A' : '#C44040' },
          { label: 'Rentabilidad', value: `${rentabilidad.toFixed(1)}%`, color: rentabilidad >= 0 ? '#3A7D5A' : '#C44040' },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border p-4"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-soft)' }}>
              {k.label}
            </p>
            <p className="text-xl font-bold" style={{ color: k.color }}>
              {k.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 mb-5 bg-[#F0EBE4] p-1 rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg capitalize transition"
            style={{
              background: tab === t ? 'var(--color-surface)' : 'transparent',
              color: tab === t ? 'var(--color-accent)' : 'var(--color-text-soft)',
              boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {t === 'inventario' ? 'Inventario' : t === 'ventas' ? 'Ventas' : t === 'gastos' ? 'Gastos' : 'Consolidado'}
          </button>
        ))}
      </div>

      {tab === 'inventario' && (
        <div className="space-y-4">
          {activo && canEdit && (
            <ImportCSV
              descripcion="Columnas: producto* (nombre exacto), cantidad_llevada*"
              onDescargarPlantilla={descargarPlantillaInventario}
              onProcesar={async (filas) => {
                const res = await importarInventarioEvento(eventoId, filas)
                if (res.exitosos > 0) await loadData({ silent: true })
                return res
              }}
            />
          )}
          {activo && canEdit && (
            <div className="rounded-2xl border p-4 space-y-3" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-soft)' }}>
                Agregar productos al evento
              </p>

              <div className="flex gap-3 flex-wrap items-end">
                <div className="flex-1 min-w-48">
                  <ProductoSelect
                    opciones={opcionesProductos}
                    value={invProductoId}
                    onChange={(id) => {
                      setInvProductoId(id)
                      setInvVarianteId('')
                    }}
                  />
                </div>
                {invProductoId && variantesPorProducto.has(invProductoId) && (
                  <div className="w-48">
                    <p className="text-xs text-[#8A7D72] mb-1">Variante</p>
                    <select
                      value={invVarianteId}
                      onChange={(e) => setInvVarianteId(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Seleccionar variante</option>
                      {(variantesPorProducto.get(invProductoId) ?? []).map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.nombre} (stock: {v.stock_actual})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="w-24">
                  <p className="text-xs text-[#8A7D72] mb-1">Cant.</p>
                  <input
                    type="number"
                    min={1}
                    value={invCantidad}
                    onChange={(e) => setInvCantidad(Number(e.target.value))}
                    className={inputClass}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!invProductoId || invCantidad <= 0) return
                    const prod = productos.find((p) => p.id === invProductoId)
                    if (!prod) return
                    if (variantesPorProducto.has(invProductoId) && !invVarianteId) return
                    const variante = invVarianteId
                      ? variantesPorProducto.get(invProductoId)?.find((v) => v.id === invVarianteId)
                      : undefined
                    const label = variante ? `${prod.nombre} — ${variante.nombre}` : prod.nombre
                    setInvItems((prev) => {
                      const key = invVarianteId || invProductoId
                      const exists = prev.find((i) => (i.variante_id ?? i.producto_id) === key)
                      if (exists) {
                        return prev.map((i) =>
                          (i.variante_id ?? i.producto_id) === key ? { ...i, cantidad: i.cantidad + invCantidad } : i,
                        )
                      }
                      return [
                        ...prev,
                        {
                          producto_id: prod.id,
                          variante_id: invVarianteId || undefined,
                          nombre: label,
                          cantidad: invCantidad,
                        },
                      ]
                    })
                    setInvProductoId('')
                    setInvVarianteId('')
                    setInvCantidad(1)
                  }}
                  disabled={
                    !invProductoId || (variantesPorProducto.has(invProductoId) && !invVarianteId)
                  }
                  className="text-sm font-semibold px-4 py-2 rounded-xl transition disabled:opacity-50"
                  style={{ background: 'var(--color-primary)', color: 'white' }}
                >
                  + Añadir
                </button>
              </div>

              {invProductoId &&
                (() => {
                  const prod = productos.find((p) => p.id === invProductoId)
                  if (!prod) return null
                  const stockDisponible = invVarianteId
                    ? (variantesPorProducto.get(invProductoId)?.find((v) => v.id === invVarianteId)?.stock_actual ?? 0)
                    : (productos.find((p) => p.id === invProductoId)?.stock_actual ?? 0)
                  const sobrePasa = invCantidad > stockDisponible
                  return (
                    <p className={`text-xs ${sobrePasa ? 'text-[#C44040]' : 'text-[#8A7D72]'}`}>
                      Stock disponible: {stockDisponible} unidades
                      {sobrePasa && ' — ⚠️ Estás llevando más de lo que tienes en stock'}
                    </p>
                  )
                })()}

              {invItems.length > 0 && (
                <div className="rounded-xl border divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {invItems.map((item) => (
                    <div
                      key={`${item.producto_id}-${item.variante_id ?? ''}`}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <span style={{ color: 'var(--color-text)' }}>{item.nombre}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                          {item.cantidad} uds
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setInvItems((prev) =>
                              prev.filter(
                                (i) =>
                                  `${i.producto_id}-${i.variante_id ?? ''}` !==
                                  `${item.producto_id}-${item.variante_id ?? ''}`,
                              ),
                            )
                          }
                          className="text-xs text-[#1A1510]/40 hover:text-red-500 transition"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {invItems.length > 0 && (
                <button
                  type="button"
                  disabled={invSubmitting}
                  onClick={async () => {
                    if (!eventoId || !tienda) return
                    setInvSubmitting(true)
                    try {
                      const snapshot = [...invItems]
                      let errores = 0
                      for (const item of snapshot) {
                        const res = await agregarInventarioEvento(
                          eventoId,
                          item.producto_id,
                          item.cantidad,
                          item.variante_id,
                        )
                        if (res && 'error' in res && res.error) {
                          errores++
                        }
                      }
                      if (errores > 0) showToast(`${errores} producto(s) no se pudieron guardar`, 'error')
                      else showToast(`${snapshot.length} producto(s) agregados al evento`)
                      setInvItems([])

                      const supabase = createClient()
                      const { data, error } = await supabase
                        .from('evento_inventario')
                        .select('*, productos(nombre, precio_venta), variante_id, producto_variantes(nombre, precio_venta)')
                        .eq('evento_id', eventoId)
                        .eq('tienda_id', tienda.id)
                        .order('created_at')
                      if (error) console.error('inventario recargado error:', error)
                      setInventario((data ?? []) as EventoInventario[])
                    } finally {
                      setInvSubmitting(false)
                    }
                  }}
                  className="w-full text-sm font-semibold px-4 py-2 rounded-xl transition disabled:opacity-50"
                  style={{ background: 'var(--color-accent)', color: 'white' }}
                >
                  {invSubmitting ? 'Guardando...' : `Guardar ${invItems.length} producto(s) en el evento`}
                </button>
              )}
            </div>
          )}

          {inventario.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-soft)' }}>
              No hay productos en este evento.
            </p>
          ) : (
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
              <table className="w-full text-sm">
                <thead style={{ background: 'var(--color-background)' }}>
                  <tr>
                    {['Producto', 'Llevadas', 'Vendidas', 'Devueltas', 'Sobrante', 'Eliminar'].map((h) => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide ${
                          h === 'Eliminar' ? 'text-right' : 'text-left'
                        }`}
                        style={{ color: 'var(--color-text-soft)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inventario.map((item) => {
                    const sobrante = item.cantidad_llevada - item.cantidad_vendida - item.cantidad_devuelta
                    const pv = item.producto_variantes as { nombre?: string } | null | undefined
                    const baseNombre = item.productos?.nombre ?? item.producto_id
                    const nombreFila = pv?.nombre ? `${baseNombre} — ${pv.nombre}` : baseNombre
                    return (
                      <tr key={item.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                        <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>
                          {nombreFila}
                        </td>
                        <td className="px-4 py-3">
                          {activo ? (
                            <input
                              key={`llevada-${item.id}`}
                              type="number"
                              min={1}
                              defaultValue={item.cantidad_llevada}
                              onBlur={async (e) => {
                                const nueva = Number(e.target.value)
                                if (nueva === item.cantidad_llevada || nueva <= 0) return
                                const supabase = createClient()
                                await supabase
                                  .from('evento_inventario')
                                  .update({ cantidad_llevada: nueva })
                                  .eq('id', item.id)
                                  .eq('tienda_id', tienda.id)
                                await loadData({ silent: true })
                              }}
                              className="w-16 px-2 py-1 rounded-lg border text-sm text-center"
                              style={{
                                borderColor: 'var(--color-border)',
                                background: 'var(--color-surface)',
                                color: 'var(--color-text)',
                              }}
                            />
                          ) : (
                            <span style={{ color: 'var(--color-text-soft)' }}>{item.cantidad_llevada}</span>
                          )}
                        </td>
                        <td className="px-4 py-3" style={{ color: 'var(--color-text-soft)' }}>
                          {item.cantidad_vendida}
                        </td>
                        <td className="px-4 py-3">
                          {activo ? (
                            <input
                              key={`devuelta-${item.id}-${item.cantidad_devuelta}`}
                              type="number"
                              min={0}
                              max={item.cantidad_llevada}
                              defaultValue={item.cantidad_devuelta}
                              onBlur={(e) =>
                                void handleActualizarDevuelta(
                                  item.producto_id,
                                  Number(e.target.value),
                                  item.variante_id,
                                )
                              }
                              className="w-16 px-2 py-1 rounded-lg border text-sm text-center"
                              style={{
                                borderColor: 'var(--color-border)',
                                background: 'var(--color-surface)',
                                color: 'var(--color-text)',
                              }}
                            />
                          ) : (
                            <span style={{ color: 'var(--color-text-soft)' }}>{item.cantidad_devuelta}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold" style={{ color: sobrante > 0 ? '#D4A853' : 'var(--color-text-soft)' }}>
                          {sobrante}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {activo && canEdit && (
                            <button
                              type="button"
                              onClick={async () => {
                                const res = await eliminarInventarioEvento(item.id)
                                if (res && 'error' in res && res.error) {
                                  showToast(res.error, 'error')
                                  return
                                }
                                const supabase = createClient()
                                const { data } = await supabase
                                  .from('evento_inventario')
                                  .select('*, productos(nombre, precio_venta), variante_id, producto_variantes(nombre, precio_venta)')
                                  .eq('evento_id', eventoId)
                                  .eq('tienda_id', tienda.id)
                                  .order('created_at')
                                setInventario((data ?? []) as EventoInventario[])
                                showToast('Producto eliminado del evento')
                              }}
                              className="text-xs text-[#1A1510]/40 hover:text-red-500 transition"
                            >
                              Eliminar
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'ventas' && (
        <div className="space-y-4">
          {activo && canEdit && (
            <ImportCSV
              descripcion="Columnas: producto* (nombre exacto), cantidad*, precio_venta (opcional, usa el del producto), medio_pago* (efectivo, transferencia, nequi, datafono)"
              onDescargarPlantilla={descargarPlantillaVentas}
              onProcesar={async (filas) => {
                const res = await importarVentasEvento(eventoId, filas)
                if (res.exitosos > 0) await loadData({ silent: true })
                return res
              }}
            />
          )}
          {activo && canEdit && (
            <div className="rounded-2xl border p-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-soft)' }}>
                Registrar venta
              </p>
              <div className="flex gap-3 flex-wrap items-end">
                <div className="flex-1 min-w-48">
                  <ProductoSelect
                    opciones={opcionesInventarioEvento}
                    value={ventaLineaInventarioId}
                    onChange={(lineId) => {
                      setVentaLineaInventarioId(lineId)
                      const line = inventario.find((l) => l.id === lineId)
                      const p = line ? productos.find((x) => x.id === line.producto_id) : undefined
                      const pv = line?.producto_variantes as { precio_venta?: number } | null | undefined
                      const precio = pv?.precio_venta ?? p?.precio_venta ?? 0
                      if (precio > 0) setVentaPrecio(precio)
                    }}
                  />
                </div>
                <div className="w-20">
                  <p className="text-xs text-[#8A7D72] mb-1">Cant.</p>
                  <input
                    type="number"
                    min={1}
                    value={ventaCantidad}
                    onChange={(e) => setVentaCantidad(Number(e.target.value))}
                    className={inputClass}
                  />
                </div>
                <div className="w-32">
                  <p className="text-xs text-[#8A7D72] mb-1">Precio</p>
                  <input
                    type="number"
                    min={0}
                    value={ventaPrecio || ''}
                    onChange={(e) => setVentaPrecio(Number(e.target.value))}
                    className={inputClass}
                    placeholder="0"
                  />
                </div>
                <div className="w-36">
                  <p className="text-xs text-[#8A7D72] mb-1">Medio de pago</p>
                  <select value={ventaMedio} onChange={(e) => setVentaMedio(e.target.value)} className={inputClass}>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="nequi">Nequi / Daviplata</option>
                    <option value="datafono">Datáfono</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => void handleRegistrarVenta()}
                  disabled={ventaSubmitting || !ventaLineaInventarioId || ventaPrecio <= 0}
                  className="text-sm font-semibold px-4 py-2 rounded-xl transition disabled:opacity-50"
                  style={{ background: 'var(--color-accent)', color: 'white' }}
                >
                  {ventaSubmitting ? 'Guardando...' : '+ Venta'}
                </button>
              </div>
            </div>
          )}

          {ventas.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-soft)' }}>
              No hay ventas registradas.
            </p>
          ) : (
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
              <table className="w-full text-sm">
                <thead style={{ background: 'var(--color-background)' }}>
                  <tr>
                    {['Producto', 'Cant.', 'Precio', 'Total', 'Medio', ''].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-soft)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ventas.map((v) => (
                    <tr key={v.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>
                        {v.productos?.nombre}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--color-text-soft)' }}>
                        {v.cantidad}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--color-text-soft)' }}>
                        {formatCOP(v.precio_venta)}
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: 'var(--color-text)' }}>
                        {formatCOP(v.cantidad * v.precio_venta)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full capitalize"
                          style={{ background: 'var(--color-accent-pale)', color: 'var(--color-accent)' }}
                        >
                          {v.medio_pago}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {activo && canEdit && (
                          <button
                            type="button"
                            onClick={() => void handleEliminarVenta(v.id)}
                            className="text-xs text-[#1A1510]/40 hover:text-red-500 transition"
                          >
                            Eliminar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'gastos' && (
        <div className="space-y-4">
          {activo && canEdit && (
            <ImportCSV
              descripcion="Columnas: descripcion*, monto*, categoria (opcional)"
              onDescargarPlantilla={descargarPlantillaGastos}
              onProcesar={async (filas) => {
                const res = await importarGastosEvento(eventoId, filas)
                if (res.exitosos > 0) await loadData({ silent: true })
                return res
              }}
            />
          )}
          {activo && canEdit && (
            <div className="rounded-2xl border p-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-soft)' }}>
                Registrar gasto
              </p>
              <div className="flex gap-3 flex-wrap items-end">
                <div className="flex-1 min-w-48">
                  <p className="text-xs text-[#8A7D72] mb-1">Descripción</p>
                  <input
                    type="text"
                    value={gastoDesc}
                    onChange={(e) => setGastoDesc(e.target.value)}
                    className={inputClass}
                    placeholder="Ej: Transporte ida y vuelta"
                  />
                </div>
                <div className="w-32">
                  <p className="text-xs text-[#8A7D72] mb-1">Monto</p>
                  <input
                    type="number"
                    min={0}
                    value={gastoMonto || ''}
                    onChange={(e) => setGastoMonto(Number(e.target.value))}
                    className={inputClass}
                    placeholder="0"
                  />
                </div>
                <div className="w-36">
                  <p className="text-xs text-[#8A7D72] mb-1">Categoría</p>
                  <select value={gastoCategoria} onChange={(e) => setGastoCategoria(e.target.value)} className={inputClass}>
                    {['Transporte', 'Alimentación', 'Stand / Arriendo', 'Empaque', 'Marketing', 'Otro'].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => void handleRegistrarGasto()}
                  disabled={gastoSubmitting || !gastoDesc || gastoMonto <= 0}
                  className="text-sm font-semibold px-4 py-2 rounded-xl transition disabled:opacity-50"
                  style={{ background: 'var(--color-accent)', color: 'white' }}
                >
                  {gastoSubmitting ? 'Guardando...' : '+ Gasto'}
                </button>
              </div>
            </div>
          )}

          {gastos.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-soft)' }}>
              No hay gastos registrados.
            </p>
          ) : (
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
              <table className="w-full text-sm">
                <thead style={{ background: 'var(--color-background)' }}>
                  <tr>
                    {['Descripción', 'Categoría', 'Monto', ''].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-soft)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gastos.map((g) => (
                    <tr key={g.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>
                        {g.descripcion}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--color-background)', color: 'var(--color-text-soft)' }}
                        >
                          {g.categoria}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: 'var(--color-text)' }}>
                        {formatCOP(g.monto)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {activo && canEdit && (
                          <button
                            type="button"
                            onClick={() => void handleEliminarGasto(g.id)}
                            className="text-xs text-[#1A1510]/40 hover:text-red-500 transition"
                          >
                            Eliminar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'consolidado' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-soft)' }}>
                Caja del evento
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--color-text-soft)' }}>💵 Efectivo</span>
                  <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                    {formatCOP(ingresosEfectivo)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--color-text-soft)' }}>📱 Transferencias / Digital</span>
                  <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                    {formatCOP(ingresosTransferencia)}
                  </span>
                </div>
                <div
                  className="flex justify-between text-sm font-bold border-t pt-2"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <span>Total ingresos</span>
                  <span style={{ color: '#3A7D5A' }}>{formatCOP(totalIngresos)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-soft)' }}>
                Rentabilidad
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--color-text-soft)' }}>Ingresos totales</span>
                  <span className="font-semibold" style={{ color: '#3A7D5A' }}>
                    {formatCOP(totalIngresos)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--color-text-soft)' }}>Gastos totales</span>
                  <span className="font-semibold" style={{ color: '#C44040' }}>
                    -{formatCOP(totalGastos)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t pt-2" style={{ borderColor: 'var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text)' }}>Utilidad neta</span>
                  <span style={{ color: utilidad >= 0 ? '#3A7D5A' : '#C44040' }}>{formatCOP(utilidad)}</span>
                </div>
                <p className="text-xs text-right" style={{ color: 'var(--color-text-soft)' }}>
                  Margen: {rentabilidad.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-soft)' }}>
              Inventario final
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['Producto', 'Llevadas', 'Vendidas', 'Devueltas', 'Sobrante'].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-soft)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inventario.map((item) => {
                  const sobrante = item.cantidad_llevada - item.cantidad_vendida - item.cantidad_devuelta
                  const pv = item.producto_variantes as { nombre?: string } | null | undefined
                  const baseNombre = item.productos?.nombre ?? item.producto_id
                  const nombreFila = pv?.nombre ? `${baseNombre} — ${pv.nombre}` : baseNombre
                  return (
                    <tr key={item.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                      <td className="px-3 py-2 font-medium" style={{ color: 'var(--color-text)' }}>
                        {nombreFila}
                      </td>
                      <td className="px-3 py-2" style={{ color: 'var(--color-text-soft)' }}>
                        {item.cantidad_llevada}
                      </td>
                      <td className="px-3 py-2" style={{ color: 'var(--color-text-soft)' }}>
                        {item.cantidad_vendida}
                      </td>
                      <td className="px-3 py-2" style={{ color: 'var(--color-text-soft)' }}>
                        {item.cantidad_devuelta}
                      </td>
                      <td className="px-3 py-2 font-semibold" style={{ color: sobrante > 0 ? '#D4A853' : 'var(--color-text-soft)' }}>
                        {sobrante}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {!activo && (
            <div className="rounded-2xl border border-[#E8F5EE] bg-[#E8F5EE]/40 p-4 text-sm text-[#3A7D5A]">
              ✓ Este evento fue cerrado y sus ventas y gastos fueron exportados al P&L automáticamente.
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={confirmCerrar}
        title="Cerrar evento"
        message="¿Cerrar este evento? Sus ventas y gastos se exportarán automáticamente al P&L mensual. Esta acción no se puede deshacer."
        confirmLabel="Cerrar y exportar"
        danger
        onConfirm={() => {
          setConfirmCerrar(false)
          void handleCerrarEvento()
        }}
        onCancel={() => setConfirmCerrar(false)}
      />

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
