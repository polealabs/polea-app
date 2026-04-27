'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTienda } from '@/lib/hooks/useTienda'
import { crearVentaMulti, eliminarVenta } from './actions'
import { calcularNetoConDescuento } from '@/lib/utils'
import ConfirmModal from '@/components/ui/ConfirmModal'
import ClienteInlineForm from '@/components/ui/ClienteInlineForm'
import ImportCSV from '@/components/ui/ImportCSV'
import Toast from '@/components/ui/Toast'
import { ModuleTableSkeleton } from '@/components/skeletons/ModuleTableSkeleton'
import { descargarCSV } from '@/lib/csv'
import { useToast } from '@/lib/hooks/useToast'
import { importarVentas } from './actions-import'
import type { Producto, Cliente, VentaCabecera } from '@/lib/types'

type VentaConDetalles = VentaCabecera & {
  cliente_nombre?: string
  items: {
    producto_nombre: string
    cantidad: number
    precio_venta: number
    descuento: number
    neto: number
  }[]
}

type VentaCabeceraRaw = VentaCabecera & {
  clientes?: { nombre?: string } | { nombre?: string }[] | null
  venta_items?: {
    cantidad: number
    precio_venta: number
    descuento: number
    neto: number
    productos?: { nombre?: string } | { nombre?: string }[] | null
  }[]
}

type LineaFormulario = {
  producto_id: string
  cantidad: number
  precio_venta: number
  precio_original: number
  descuento: number // 0-100
}

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-[#1A1510]/20 bg-white text-[#1A1510] placeholder:text-[#1A1510]/40 focus:outline-none focus:ring-2 focus:ring-[#C4622D]/40 focus:border-[#C4622D] transition text-sm'
const labelClass = 'block text-xs font-medium text-[#1A1510]/60 mb-1'

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)
}

function formatFecha(fecha: string) {
  return new Date(fecha + 'T12:00:00').toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Máximo de unidades permitidas en la línea `lineIndex` (resto del mismo producto en otras líneas descontado del stock). */
function maxCantidadPorLinea(
  lineas: { producto_id: string; cantidad: number }[],
  lineIndex: number,
  productos: Producto[],
) {
  const l = lineas[lineIndex]
  if (!l?.producto_id) return null
  const p = productos.find((x) => x.id === l.producto_id)
  if (!p) return null
  const usadoOtras = lineas.reduce((s, ol, j) => {
    if (j === lineIndex || ol.producto_id !== l.producto_id) return s
    const c = Number(ol.cantidad)
    return s + (Number.isFinite(c) ? Math.max(0, c) : 0)
  }, 0)
  return Math.max(0, p.stock_actual - usadoOtras)
}

function descargarPlantillaVentas() {
  descargarCSV('plantilla_ventas.csv', [
    ['venta_id', 'producto_nombre', 'cantidad', 'precio_venta', 'descuento', 'canal', 'plataforma_pago', 'fecha', 'cliente_nombre'],
    ['1', 'Aretes luna plateados', '1', '85000', '0', 'WhatsApp', 'Nequi', '2026-01-20', 'María García'],
    ['1', 'Collar sol dorado', '2', '120000', '10', 'WhatsApp', 'Nequi', '2026-01-20', 'María García'],
    ['2', 'Anillo minimalista', '1', '65000', '0', 'Instagram', 'Efectivo', '2026-01-21', ''],
  ])
}

function canalBadgeClass(canal: VentaCabecera['canal']) {
  switch (canal) {
    case 'WhatsApp':
      return 'bg-[#25D366] text-white'
    case 'Instagram':
      return 'bg-[#E1306C] text-white'
    case 'Web':
      return 'bg-[#3B82F6] text-white'
    case 'Presencial':
      return 'bg-[#6B7280] text-white'
    case 'Tienda multimarca':
      return 'bg-[#D4A853] text-[#1A1510]'
    default:
      return 'bg-[#6B7280] text-white'
  }
}

export default function VentasPage() {
  const { tienda, loading: tiendaLoading, canEdit, canDelete } = useTienda()
  const [productos, setProductos] = useState<Producto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [ventas, setVentas] = useState<VentaConDetalles[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [mesActual, setMesActual] = useState(() => new Date().toISOString().slice(0, 7))
  const [filtroCanalStr, setFiltroCanalStr] = useState('')
  const [filtroPlataformaStr, setFiltroPlataformaStr] = useState('')
  const [busquedaCliente, setBusquedaCliente] = useState('')

  const [canal, setCanal] = useState<VentaCabecera['canal']>('WhatsApp')
  const [plataforma, setPlataforma] = useState<VentaCabecera['plataforma_pago']>('Efectivo')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [clienteId, setClienteId] = useState('')
  const [showClienteForm, setShowClienteForm] = useState(false)
  const { toasts, showToast, removeToast } = useToast()

  const [lineas, setLineas] = useState<LineaFormulario[]>([
    { producto_id: '', cantidad: 1, precio_venta: 0, precio_original: 0, descuento: 0 },
  ])

  const fetchVentas = useCallback(async () => {
    if (!tienda) return
    const supabase = createClient()
    const start = `${mesActual}-01`
    const nextMonth = new Date(`${mesActual}-01T12:00:00`)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    const end = nextMonth.toISOString().slice(0, 10)

    const { data } = await supabase
      .from('ventas_cabecera')
      .select(
        `
      *,
      clientes(nombre),
      venta_items(
        cantidad, precio_venta, descuento, neto,
        productos(nombre)
      )
    `,
      )
      .eq('tienda_id', tienda.id)
      .gte('fecha', start)
      .lt('fecha', end)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100)

    const mapped: VentaConDetalles[] = (data ?? []).map((v: VentaCabeceraRaw) => ({
      ...v,
      cliente_nombre: Array.isArray(v.clientes)
        ? v.clientes[0]?.nombre ?? 'Sin cliente'
        : v.clientes?.nombre ?? 'Sin cliente',
      items: (v.venta_items ?? []).map((i) => ({
        producto_nombre: Array.isArray(i.productos) ? i.productos[0]?.nombre ?? '—' : i.productos?.nombre ?? '—',
        cantidad: i.cantidad,
        precio_venta: i.precio_venta,
        descuento: i.descuento ?? 0,
        neto: i.neto,
      })),
    }))
    setVentas(mapped)
  }, [mesActual, tienda])

  const fetchData = useCallback(async () => {
    if (!tienda) return
    const supabase = createClient()
    const [{ data: productosData }, { data: clientesData }] = await Promise.all([
      supabase.from('productos').select('*').eq('tienda_id', tienda.id).order('nombre'),
      supabase.from('clientes').select('*').eq('tienda_id', tienda.id).order('nombre'),
    ])
    setProductos(productosData ?? [])
    setClientes(clientesData ?? [])
    await fetchVentas()
    setLoading(false)
  }, [fetchVentas, tienda])

  useEffect(() => {
    if (!tienda) return
    const timeoutId = window.setTimeout(() => {
      void fetchData()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [fetchData, tienda, mesActual])

  async function handleClienteCreado(cliente: { id: string; nombre: string }) {
    if (!tienda) return
    const supabase = createClient()
    const { data } = await supabase
      .from('clientes')
      .select('id, nombre, telefono, ciudad, correo, created_at, tienda_id')
      .eq('tienda_id', tienda.id)
      .order('nombre')
    const lista = (data ?? []) as Cliente[]
    setClientes(lista)
    const nombreNorm = cliente.nombre.trim().toLowerCase()
    const nuevo = lista.find((c) => c.nombre.trim().toLowerCase() === nombreNorm)
    if (nuevo) setClienteId(nuevo.id)
    showToast('Cliente creado y seleccionado')
  }

  function agregarLinea() {
    setLineas((prev) => [
      ...prev,
      { producto_id: '', cantidad: 1, precio_venta: 0, precio_original: 0, descuento: 0 },
    ])
  }

  function eliminarLinea(i: number) {
    setLineas((prev) => prev.filter((_, idx) => idx !== i))
  }

  function actualizarLinea(i: number, campo: string, valor: string | number) {
    setError(null)
    setLineas((prev) =>
      prev.map((l, idx) => {
        if (idx !== i) return l
        if (campo === 'producto_id') {
          const prod = productos.find((p) => p.id === valor)
          return {
            ...l,
            producto_id: valor as string,
            precio_venta: prod?.precio_venta ?? 0,
            precio_original: prod?.precio_venta ?? 0,
          }
        }
        return { ...l, [campo]: valor }
      }),
    )
  }

  async function handleSubmit() {
    if (lineas.some((l) => !l.producto_id || l.cantidad < 1)) {
      setError('Completa todos los productos antes de guardar')
      return
    }
    const primeraAdvertencia = advertenciasStockPorLinea.find((m) => m != null)
    if (primeraAdvertencia) {
      setError(primeraAdvertencia)
      return
    }
    setSubmitting(true)
    setError(null)
    const result = await crearVentaMulti({
      cliente_id: clienteId || undefined,
      canal,
      plataforma_pago: plataforma,
      fecha,
      lineas: lineas.map((l) => ({
        producto_id: l.producto_id,
        cantidad: l.cantidad,
        precio_venta: l.precio_venta,
        descuento: l.descuento ?? 0,
      })),
    })
    if (result?.error) {
      setError(result.error)
      showToast(result.error, 'error')
    } else {
      setShowForm(false)
      setLineas([{ producto_id: '', cantidad: 1, precio_venta: 0, precio_original: 0, descuento: 0 }])
      setCanal('WhatsApp')
      setPlataforma('Efectivo')
      setClienteId('')
      setShowClienteForm(false)
      setFecha(new Date().toISOString().split('T')[0])
      await fetchData()
      showToast('Venta registrada')
    }
    setSubmitting(false)
  }

  async function handleDelete() {
    if (!confirmDelete) return
    const result = await eliminarVenta(confirmDelete)
    if (result?.error) {
      setError(result.error)
      showToast(result.error, 'error')
    } else {
      setConfirmDelete(null)
      await fetchVentas()
      showToast('Venta eliminada')
    }
  }

  const resumen = useMemo(() => {
    const total_bruto = lineas.reduce((s, l) => s + l.precio_venta * l.cantidad, 0)
    const total_descuentos = lineas.reduce(
      (s, l) => s + Math.round(l.precio_venta * l.cantidad * (l.descuento / 100)),
      0
    )
    const total_costo_transaccion = lineas.reduce((s, l) => {
      const { costoTransaccion } = calcularNetoConDescuento(
        l.precio_venta,
        l.cantidad,
        l.descuento,
        plataforma
      )
      return s + costoTransaccion
    }, 0)
    const total_neto = lineas.reduce((s, l) => {
      const { neto } = calcularNetoConDescuento(
        l.precio_venta,
        l.cantidad,
        l.descuento,
        plataforma
      )
      return s + neto
    }, 0)
    return { total_bruto, total_descuentos, total_costo_transaccion, total_neto }
  }, [lineas, plataforma])

  const advertenciasStockPorLinea = lineas.map((l, i) => {
    if (!l.producto_id) return null
    const p = productos.find((x) => x.id === l.producto_id)
    if (!p) return null
    const max = maxCantidadPorLinea(lineas, i, productos)
    const c = Number(l.cantidad)
    const cant = Number.isFinite(c) ? c : 0
    if (max == null) return null
    if (p.stock_actual <= 0) {
      return 'Sin stock: no se puede vender este producto hasta tener existencias.'
    }
    if (max === 0 && cant >= 1) {
      return 'No quedan unidades para esta línea: el stock ya está asignado en otras líneas del mismo producto.'
    }
    if (cant > max) {
      return `Cantidad mayor al disponible: máximo ${max} uds. en esta línea (stock en almacén: ${p.stock_actual}).`
    }
    return null
  })

  const hayConflictoStock = advertenciasStockPorLinea.some((m) => m != null)

  const maxFecha = new Date().toISOString().split('T')[0]
  const hayProductoConStock = productos.some((p) => p.stock_actual > 0)
  const ventasFiltradas = ventas.filter((v) => {
    const matchCanal = filtroCanalStr === '' || v.canal === filtroCanalStr
    const matchPlataforma = filtroPlataformaStr === '' || v.plataforma_pago === filtroPlataformaStr
    const matchCliente = !busquedaCliente || (v.cliente_nombre?.toLowerCase() ?? '').includes(busquedaCliente.toLowerCase())
    return matchCanal && matchPlataforma && matchCliente
  })

  if (tiendaLoading || loading) {
    return (
      <div className="bg-cream min-h-[50vh]">
        <ModuleTableSkeleton maxWidthClass="max-w-6xl" rows={8} />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto" style={{ background: 'var(--color-background)' }}>
      <ConfirmModal
        open={confirmDelete !== null}
        title="Eliminar venta"
        message="¿Seguro que deseas eliminar esta venta completa?"
        confirmLabel="Eliminar"
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(null)}
        danger
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>Ventas</h1>
          <p className="text-sm text-[#1A1510]/50 mt-0.5">Últimas {ventas.length} ventas registradas</p>
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
                setShowClienteForm(false)
              }}
              className="btn-primary text-white text-sm font-semibold px-4 py-2 rounded-lg"
              disabled={productos.length === 0 || !hayProductoConStock}
              title={
                productos.length > 0 && !hayProductoConStock
                  ? 'No hay productos con stock disponible'
                  : undefined
              }
            >
              + Nueva venta
            </button>
          )}
        </div>
      </div>

      <ImportCSV
        onDescargarPlantilla={descargarPlantillaVentas}
        onProcesar={async (filas) => {
          const res = await importarVentas(filas)
          if (res.exitosos > 0) {
            showToast(`${res.exitosos} venta${res.exitosos > 1 ? 's' : ''} importada${res.exitosos > 1 ? 's' : ''}`)
          }
          if (res.exitosos > 0 && tienda) await fetchData()
          return res
        }}
        descripcion="El descuento va en porcentaje (ej: 10 = 10%). Agrupa productos de la misma venta con el mismo venta_id · Fechas: DD/MM/YYYY o YYYY-MM-DD"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div
          className="bg-white rounded-2xl border border-[#EDE5DC] p-4 shadow-sm"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <p className="text-xs mb-1" style={{ color: 'var(--color-text-soft)' }}>Ventas del mes</p>
          <p className="text-xl font-serif font-medium" style={{ color: 'var(--color-primary)' }}>
            {formatCOP(ventasFiltradas.reduce((s, v) => s + v.total_neto, 0))}
          </p>
        </div>
        <div
          className="bg-white rounded-2xl border border-[#EDE5DC] p-4 shadow-sm"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <p className="text-xs mb-1" style={{ color: 'var(--color-text-soft)' }}>Transacciones</p>
          <p className="text-xl font-serif font-medium" style={{ color: 'var(--color-primary)' }}>{ventasFiltradas.length}</p>
        </div>
        <div
          className="bg-white rounded-2xl border border-[#EDE5DC] p-4 shadow-sm"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <p className="text-xs mb-1" style={{ color: 'var(--color-text-soft)' }}>Ticket promedio</p>
          <p className="text-xl font-serif font-medium" style={{ color: 'var(--color-primary)' }}>
            {ventasFiltradas.length > 0
              ? formatCOP(ventasFiltradas.reduce((s, v) => s + v.total_neto, 0) / ventasFiltradas.length)
              : '$0'}
          </p>
        </div>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <select
          value={filtroCanalStr}
          onChange={(e) => setFiltroCanalStr(e.target.value)}
          className={inputClass + ' max-w-[200px]'}
        >
          <option value="">Todos los canales</option>
          <option value="WhatsApp">WhatsApp</option>
          <option value="Instagram">Instagram</option>
          <option value="Web">Web</option>
          <option value="Presencial">Presencial</option>
          <option value="Tienda multimarca">Tienda multimarca</option>
        </select>
        <select
          value={filtroPlataformaStr}
          onChange={(e) => setFiltroPlataformaStr(e.target.value)}
          className={inputClass + ' max-w-[200px]'}
        >
          <option value="">Todas las plataformas</option>
          <option value="Wompi">Wompi</option>
          <option value="Bold">Bold</option>
          <option value="Nequi">Nequi</option>
          <option value="Daviplata">Daviplata</option>
          <option value="Transferencia">Transferencia</option>
          <option value="Efectivo">Efectivo</option>
          <option value="Contraentrega">Contraentrega</option>
        </select>
        <input
          type="text"
          value={busquedaCliente}
          onChange={e => setBusquedaCliente(e.target.value)}
          placeholder="Buscar por cliente..."
          className={inputClass}
          style={{ minWidth: '180px' }}
        />
        {(filtroCanalStr || filtroPlataformaStr || busquedaCliente) && (
          <button
            onClick={() => {
              setFiltroCanalStr('')
              setFiltroPlataformaStr('')
              setBusquedaCliente('')
            }}
            className="text-xs text-[#C4622D] font-medium hover:underline px-2"
          >
            Limpiar filtros
          </button>
        )}
      </div>
      {(filtroCanalStr || filtroPlataformaStr || busquedaCliente) && (
        <p className="text-xs text-[#8A7D72] mb-3">
          Mostrando {ventasFiltradas.length} venta{ventasFiltradas.length !== 1 ? 's' : ''}
          {filtroCanalStr ? ` · ${filtroCanalStr}` : ''}
          {filtroPlataformaStr ? ` · ${filtroPlataformaStr}` : ''}
          {busquedaCliente ? ` · Cliente: "${busquedaCliente}"` : ''}
        </p>
      )}

      {canEdit && showForm && (
        <div className="bg-white rounded-2xl border border-[#EDE5DC] p-6 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>Canal</label>
              <select className={inputClass} value={canal} onChange={(e) => setCanal(e.target.value as VentaCabecera['canal'])}>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Instagram">Instagram</option>
                <option value="Web">Web</option>
                <option value="Presencial">Presencial</option>
                <option value="Tienda multimarca">Tienda multimarca</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Plataforma</label>
              <select
                className={inputClass}
                value={plataforma}
                onChange={(e) => setPlataforma(e.target.value as VentaCabecera['plataforma_pago'])}
              >
                <option value="Wompi">Wompi</option>
                <option value="Bold">Bold</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Nequi">Nequi</option>
                <option value="Daviplata">Daviplata</option>
                <option value="Contraentrega">Contraentrega</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Fecha</label>
              <input
                type="date"
                max={maxFecha}
                className={inputClass}
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Cliente (opcional)</label>
              {!showClienteForm ? (
                <div className="flex gap-2">
                  <select
                    value={clienteId}
                    onChange={(e) => setClienteId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Sin cliente</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowClienteForm(true)}
                    className="text-xs text-[#C4622D] hover:underline whitespace-nowrap font-medium px-2"
                  >
                    + Nuevo
                  </button>
                </div>
              ) : (
                <ClienteInlineForm
                  tiendaId={tienda!.id}
                  onCreado={(cliente) => void handleClienteCreado(cliente)}
                  onCancelar={() => setShowClienteForm(false)}
                />
              )}
            </div>
          </div>

          <div className="mt-6 border-t border-[#EDE5DC] pt-4">
            <h3 className="text-sm font-semibold text-[#1E3A2F] mb-4">Productos</h3>
            <div className="space-y-4">
              {lineas.map((l, i) => {
                const prod = productos.find((p) => p.id === l.producto_id)
                const maxLinea = prod ? maxCantidadPorLinea(lineas, i, productos) : null
                const { neto: netoLinea, costoTransaccion: costoLinea } = calcularNetoConDescuento(
                  l.precio_venta,
                  l.cantidad,
                  l.descuento,
                  plataforma
                )
                const stockMsg = advertenciasStockPorLinea[i]
                return (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start rounded-xl border border-[#EDE5DC] p-4">
                    <div className="md:col-span-4">
                      <label className={labelClass}>Producto</label>
                      <select
                        className={inputClass}
                        value={l.producto_id}
                        onChange={(e) => actualizarLinea(i, 'producto_id', e.target.value)}
                      >
                        <option value="">Selecciona producto</option>
                        {productos.map((p) => (
                          <option key={p.id} value={p.id} disabled={p.stock_actual <= 0}>
                            {p.nombre} — {p.stock_actual} uds. disponibles
                          </option>
                        ))}
                      </select>
                      {prod && (
                        <p
                          className={`text-xs mt-1.5 font-medium ${
                            prod.stock_actual <= 0
                              ? 'text-red-600'
                              : maxLinea !== null && l.cantidad > maxLinea
                                ? 'text-amber-700'
                                : 'text-[#1E3A2F]/70'
                          }`}
                        >
                          Stock en almacén: {prod.stock_actual} uds.
                          {maxLinea !== null && maxLinea < prod.stock_actual && (
                            <span className="text-[#1A1510]/55 font-normal">
                              {' '}
                              · Máx. en esta línea: {maxLinea}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>Cantidad</label>
                      <input
                        type="number"
                        min={1}
                        max={maxLinea != null && maxLinea > 0 ? maxLinea : undefined}
                        className={`${inputClass} ${stockMsg ? 'border-amber-500/80 focus:ring-amber-500/30' : ''}`}
                        value={l.cantidad === 0 ? '' : l.cantidad}
                        onChange={(e) => {
                          const val = e.target.value
                          actualizarLinea(i, 'cantidad', val === '' ? 0 : Number(val))
                        }}
                        aria-invalid={stockMsg ? true : undefined}
                      />
                      {stockMsg && <p className="text-xs text-amber-800 mt-1.5 leading-snug">{stockMsg}</p>}
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>Precio</label>
                      <input
                        type="number"
                        min={0}
                        className={inputClass}
                        value={l.precio_venta === 0 ? '' : l.precio_venta}
                        onChange={(e) => {
                          const val = e.target.value
                          actualizarLinea(i, 'precio_venta', val === '' ? 0 : Number(val))
                        }}
                      />
                      {l.precio_venta < l.precio_original && (
                        <p className="text-xs text-[#C4622D] mt-1">
                          Rebaja sobre precio lista: {formatCOP(l.precio_original - l.precio_venta)}
                        </p>
                      )}
                    </div>
                    <div className="md:col-span-3">
                      <label className={labelClass}>Descuento (%)</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={l.descuento === 0 ? '' : l.descuento}
                          onChange={(e) => {
                            const val = e.target.value
                            actualizarLinea(i, 'descuento', val === '' ? 0 : Math.min(100, Math.max(0, Number(val))))
                          }}
                          placeholder="0"
                          className={inputClass + ' pr-8'}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8A7D72]">%</span>
                      </div>
                      {l.descuento > 0 && (
                        <p className="text-xs text-[#C4622D] mt-0.5">
                          - {formatCOP(Math.round(l.precio_venta * l.cantidad * (l.descuento / 100)))} de
                          descuento
                        </p>
                      )}
                      <p className="text-xs text-[#8A7D72] mt-1">
                        Neto línea:{' '}
                        <span className="font-semibold text-[#1E3A2F]">{formatCOP(netoLinea)}</span>
                        {costoLinea > 0 && (
                          <span className="text-[#C4B8B0]"> · Costo tx: {formatCOP(costoLinea)}</span>
                        )}
                      </p>
                    </div>
                    <div className="md:col-span-1 flex md:flex-col items-end gap-2 justify-start pt-6">
                      {lineas.length > 1 && (
                        <button
                          type="button"
                          className="text-sm text-red-500 hover:text-red-600"
                          onClick={() => eliminarLinea(i)}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <button type="button" onClick={agregarLinea} className="mt-4 text-sm text-[#C4622D] font-medium hover:underline">
              + Agregar producto
            </button>

            <div className="mt-6 border-t border-[#EDE5DC] pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-[#1A1510]/60">Total bruto</p>
                <p className="text-base font-semibold text-[#1A1510]">{formatCOP(resumen.total_bruto)}</p>
              </div>
              {resumen.total_descuentos > 0 && (
                <div>
                  <p className="text-xs text-[#1A1510]/60">Total descuentos</p>
                  <p className="text-base font-semibold text-[#C4622D]">
                    - {formatCOP(resumen.total_descuentos)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-[#1A1510]/60">Total costo transacción</p>
                <p className="text-base font-semibold text-[#1A1510]">{formatCOP(resumen.total_costo_transaccion)}</p>
              </div>
              <div className="md:col-span-3">
                <p className="text-xs text-[#1A1510]/60">Total neto</p>
                <p className="text-xl font-bold text-[#1E3A2F]">{formatCOP(resumen.total_neto)}</p>
              </div>
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg">{error}</p>}

          <div className="mt-5 flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setShowClienteForm(false)
              }}
              className="text-sm text-[#1A1510]/60 hover:text-[#1A1510] px-4 py-2 rounded-lg border border-[#1A1510]/20 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting || hayConflictoStock}
              title={hayConflictoStock ? 'Corrige las cantidades según el stock disponible' : undefined}
              className="btn-primary text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {ventas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#EDE5DC] p-12 text-center shadow-sm">
          <p className="text-[#1A1510]/40 text-sm">Aún no tienes ventas registradas.</p>
        </div>
      ) : ventasFiltradas.length === 0 && (filtroCanalStr || filtroPlataformaStr || busquedaCliente) ? (
        <div className="bg-white rounded-2xl border border-[#EDE5DC] p-12 text-center shadow-sm">
          <p className="text-[#8A7D72] text-sm">No hay ventas con estos filtros.</p>
          <button
            onClick={() => {
              setFiltroCanalStr('')
              setFiltroPlataformaStr('')
              setBusquedaCliente('')
            }}
            className="mt-2 text-sm text-[#C4622D] font-medium hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#EDE5DC] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-[#EDE5DC] bg-[#FAF6F0]" style={{ background: 'var(--color-background)' }}>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">Fecha</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">Cliente</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">Canal</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">Productos</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">Total neto</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">Acción</th>
              </tr>
            </thead>
            <tbody>
              {ventasFiltradas.map((v, i) => (
                <tr
                  key={v.id}
                  className={`border-b border-[#EDE5DC]/70 hover:bg-[#FAF6F0]/60 transition ${
                    i === ventasFiltradas.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <td className="px-5 py-4 text-[#1A1510]/70">{formatFecha(v.fecha)}</td>
                  <td className="px-5 py-4 text-[#1A1510]/80">{v.cliente_nombre ?? 'Sin cliente'}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${canalBadgeClass(v.canal)}`}>
                      {v.canal}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[#1A1510]/80">
                    {v.items.map((it) => `${it.producto_nombre} × ${it.cantidad}`).join(', ')}
                  </td>
                  <td className="px-5 py-4 text-right font-bold text-[#1E3A2F]">{formatCOP(v.total_neto)}</td>
                  <td className="px-5 py-4 text-right">
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(v.id)}
                        className="text-sm text-[#C44040] hover:underline"
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
        </div>
      )}
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
