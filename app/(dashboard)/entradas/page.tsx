'use client'

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTienda } from '@/lib/hooks/useTienda'
import {
  crearEntradas,
  eliminarEntrada,
  registrarEntradaCompleta,
  registrarPagoCuenta,
} from './actions'
import type { CuentaPorPagar, CuotaPago, Entrada, Producto, ProductoVariante, Proveedor } from '@/lib/types'
import ConfirmModal from '@/components/ui/ConfirmModal'
import ImportCSV from '@/components/ui/ImportCSV'
import { Tooltip } from '@/components/ui/Tooltip'
import ProductoSelect from '@/components/ui/ProductoSelect'
import ProveedorInlineForm from '@/components/ui/ProveedorInlineForm'
import Toast from '@/components/ui/Toast'
import { ModuleTableSkeleton } from '@/components/skeletons/ModuleTableSkeleton'
import { descargarCSV } from '@/lib/csv'
import { useToast } from '@/lib/hooks/useToast'
import { importarEntradas } from './actions-import'

const TIPOS: Producto['tipo'][] = [
  'Producto terminado',
  'Materia prima',
  'Empaque',
  'Material POP',
]

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-[#1A1510]/20 bg-white text-[#1A1510] placeholder:text-[#1A1510]/40 focus:outline-none focus:ring-2 focus:ring-[#C4622D]/40 focus:border-[#C4622D] transition text-sm'
const labelClass = 'block text-xs font-medium text-[#1A1510]/60 mb-1'

type EntradaConProducto = Entrada & {
  producto_nombre: string
  producto_tipo: Producto['tipo']
}

type CuentaListaRow = CuentaPorPagar & {
  proveedores?: { nombre: string } | null
  cuotas_pago?: CuotaPago[] | null
}

type LineaForm = {
  id: string
  producto_id: string
  cantidad: string
  costo_unitario: string
}

function toLocalISODateString() {
  const hoy = new Date()
  const local = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
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
    [
      'fecha',
      'producto_nombre',
      'variante_nombre',
      'cantidad',
      'costo_unitario',
      'proveedor_nombre',
      'notas',
    ],
    ['2026-01-15', 'Anillo rojo', 'Talla 3', '5', '45000', 'Joyero supremo', 'Pedido enero'],
    ['2026-01-15', 'Anillo rojo', 'Talla 4', '3', '45000', 'Joyero supremo', ''],
    ['2026-01-15', 'Collar sol dorado', '', '10', '60000', 'Proveedor XYZ', ''],
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

function generarVistaCuotas(
  cantidad: number,
  costoUnitario: number,
  numCuotas: number,
  frecuencia: 'semanal' | 'quincenal' | 'mensual',
  fechaPrimera: string,
  fechaFallback: string,
) {
  const montoTotal = cantidad * costoUnitario
  if (montoTotal <= 0 || numCuotas < 2) return []
  const montoCuota = Math.round(montoTotal / numCuotas)
  const base = fechaPrimera || fechaFallback
  const d = new Date(base + 'T12:00:00')
  const out: { n: number; fecha: string; monto: number }[] = []
  for (let i = 1; i <= numCuotas; i++) {
    const monto = i === numCuotas ? montoTotal - montoCuota * (numCuotas - 1) : montoCuota
    out.push({ n: i, fecha: d.toISOString().split('T')[0], monto })
    if (frecuencia === 'semanal') d.setDate(d.getDate() + 7)
    else if (frecuencia === 'quincenal') d.setDate(d.getDate() + 15)
    else d.setMonth(d.getMonth() + 1)
  }
  return out
}

function EntradasPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mainTab = searchParams.get('tab') === 'por-pagar' ? 'por-pagar' : 'historial'

  const { tienda, loading: tiendaLoading, canEdit } = useTienda()
  const [productos, setProductos] = useState<Producto[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [entradas, setEntradas] = useState<EntradaConProducto[]>([])
  const [cuentasPendientes, setCuentasPendientes] = useState<CuentaListaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingCuentas, setLoadingCuentas] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showProveedorForm, setShowProveedorForm] = useState(false)
  const [showProveedorFormBulk, setShowProveedorFormBulk] = useState(false)
  const [proveedorIdSeleccionado, setProveedorIdSeleccionado] = useState('')
  const [mesActual, setMesActual] = useState(() => {
    const hoy = new Date()
    const local = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000)
    return local.toISOString().slice(0, 7)
  })
  const [busqueda, setBusqueda] = useState('')
  const today = useMemo(() => toLocalISODateString(), [])
  const [fecha, setFecha] = useState(today)
  const [lineas, setLineas] = useState<LineaForm[]>([nuevaLinea()])
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const { toasts, showToast, removeToast } = useToast()

  const [modoProducto, setModoProducto] = useState<'existente' | 'nuevo'>('existente')
  const [productoId, setProductoId] = useState('')
  const [varianteId, setVarianteId] = useState('')
  const [variantesDisponibles, setVariantesDisponibles] = useState<ProductoVariante[]>([])
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoPrecioVenta, setNuevoPrecioVenta] = useState(0)
  const [nuevoCosto, setNuevoCosto] = useState(0)
  const [nuevoTipo, setNuevoTipo] = useState<Producto['tipo']>('Producto terminado')
  const [nuevoSku, setNuevoSku] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [costoUnitario, setCostoUnitario] = useState(0)
  const [proveedorId, setProveedorId] = useState('')
  const [fechaRecepcion, setFechaRecepcion] = useState(() => toLocalISODateString())
  const [notas, setNotas] = useState('')
  const [tipoPago, setTipoPago] = useState<'contado' | 'contado_pendiente' | 'cuotas'>('contado')
  const [fechaPago, setFechaPago] = useState(() => toLocalISODateString())
  const [numeroCuotas, setNumeroCuotas] = useState(2)
  const [frecuenciaCuotas, setFrecuenciaCuotas] = useState<'semanal' | 'quincenal' | 'mensual'>('mensual')
  const [fechaPrimeraCuota, setFechaPrimeraCuota] = useState('')

  const [modalPago, setModalPago] = useState<CuentaListaRow | null>(null)
  const [fechaModalPago, setFechaModalPago] = useState(() => toLocalISODateString())
  const [cuotasSeleccionadas, setCuotasSeleccionadas] = useState<Set<string>>(new Set())
  const [submittingPago, setSubmittingPago] = useState(false)

  const montoTotalEntrada = cantidad * costoUnitario
  const vistaCuotasPreview = useMemo(
    () =>
      tipoPago === 'cuotas'
        ? generarVistaCuotas(
            cantidad,
            costoUnitario,
            numeroCuotas,
            frecuenciaCuotas,
            fechaPrimeraCuota,
            fechaRecepcion,
          )
        : [],
    [tipoPago, cantidad, costoUnitario, numeroCuotas, frecuenciaCuotas, fechaPrimeraCuota, fechaRecepcion],
  )

  const nombreProductoResumen =
    modoProducto === 'existente'
      ? productos.find((p) => p.id === productoId)?.nombre ?? '—'
      : nuevoNombre.trim() || '—'

  const fetchData = useCallback(async (tiendaId: string, mes: string) => {
    const supabase = createClient()
    const start = `${mes}-01`
    const nextMonth = new Date(`${mes}-01T12:00:00`)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    const end = nextMonth.toISOString().slice(0, 10)

    const [{ data: productosData }, { data: entradasData }, { data: provData }] = await Promise.all([
      supabase.from('productos').select('*').eq('tienda_id', tiendaId).neq('estado', 'archivado').order('nombre'),
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

  const fetchCuentas = useCallback(async (tiendaId: string) => {
    setLoadingCuentas(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('cuentas_por_pagar')
      .select('*, proveedores(nombre), cuotas_pago(*)')
      .eq('tienda_id', tiendaId)
      .in('estado', ['pendiente', 'parcial'])
      .order('fecha_vencimiento', { ascending: true })

    if (error) {
      setCuentasPendientes([])
      setLoadingCuentas(false)
      return
    }
    setCuentasPendientes((data ?? []) as CuentaListaRow[])
    setLoadingCuentas(false)
  }, [])

  useEffect(() => {
    if (!tienda) return
    void fetchData(tienda.id, mesActual)
  }, [fetchData, mesActual, tienda])

  useEffect(() => {
    if (!tienda || mainTab !== 'por-pagar') return
    void fetchCuentas(tienda.id)
  }, [fetchCuentas, mainTab, tienda])

  function setTab(tab: 'historial' | 'por-pagar') {
    router.push(tab === 'por-pagar' ? '/entradas?tab=por-pagar' : '/entradas', { scroll: false })
  }

  function resetFormularioUnificado() {
    setModoProducto('existente')
    setProductoId('')
    setVarianteId('')
    setVariantesDisponibles([])
    setNuevoNombre('')
    setNuevoPrecioVenta(0)
    setNuevoCosto(0)
    setNuevoTipo('Producto terminado')
    setNuevoSku('')
    setCantidad(1)
    setCostoUnitario(0)
    setProveedorId('')
    setFechaRecepcion(toLocalISODateString())
    setNotas('')
    setTipoPago('contado')
    setFechaPago(toLocalISODateString())
    setNumeroCuotas(2)
    setFrecuenciaCuotas('mensual')
    setFechaPrimeraCuota('')
  }

  function actualizarLinea(id: string, patch: Partial<LineaForm>) {
    setLineas((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  function agregarLinea() {
    setLineas((prev) => [...prev, nuevaLinea()])
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
    if (nuevo) {
      setProveedorIdSeleccionado(nuevo.id)
      setProveedorId(nuevo.id)
    }
    setShowProveedorForm(false)
    showToast('Proveedor creado y seleccionado')
  }

  async function handleProveedorCreadoBulk(prov: { id: string; nombre: string }) {
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
    setShowProveedorFormBulk(false)
    showToast('Proveedor creado y seleccionado')
  }

  async function handleGuardarUnificado() {
    if (!tienda) return
    setSubmitting(true)
    setError(null)

    if (modoProducto === 'existente' && !productoId) {
      const mensaje = 'Selecciona un producto o cambia a «Producto nuevo».'
      setError(mensaje)
      showToast(mensaje, 'error')
      setSubmitting(false)
      return
    }
    if (modoProducto === 'nuevo') {
      if (!nuevoNombre.trim()) {
        const mensaje = 'El nombre del producto nuevo es obligatorio.'
        setError(mensaje)
        showToast(mensaje, 'error')
        setSubmitting(false)
        return
      }
      if (nuevoPrecioVenta <= 0) {
        const mensaje = 'Indica un precio de venta mayor a 0 para el producto nuevo.'
        setError(mensaje)
        showToast(mensaje, 'error')
        setSubmitting(false)
        return
      }
    }
    if (cantidad < 1 || costoUnitario < 0) {
      const mensaje = 'Cantidad y costo unitario deben ser válidos.'
      setError(mensaje)
      showToast(mensaje, 'error')
      setSubmitting(false)
      return
    }

    const payload: Parameters<typeof registrarEntradaCompleta>[0] = {
      cantidad,
      costo_unitario: costoUnitario,
      proveedor_id: proveedorId || undefined,
      fecha: fechaRecepcion,
      notas: notas.trim() || undefined,
      tipo_pago: tipoPago,
      fecha_pago:
        tipoPago === 'contado'
          ? fechaPago || fechaRecepcion
          : tipoPago === 'contado_pendiente'
            ? fechaPago || undefined
            : undefined,
      numero_cuotas: tipoPago === 'cuotas' ? numeroCuotas : undefined,
      frecuencia_cuotas: tipoPago === 'cuotas' ? frecuenciaCuotas : undefined,
      fecha_primera_cuota: tipoPago === 'cuotas' ? fechaPrimeraCuota || fechaRecepcion : undefined,
    }

    if (modoProducto === 'existente') {
      payload.producto_id = productoId
      if (varianteId) payload.variante_id = varianteId
    } else {
      payload.nuevo_producto = {
        nombre: nuevoNombre.trim(),
        precio_venta: nuevoPrecioVenta,
        costo_produccion: nuevoCosto > 0 ? nuevoCosto : undefined,
        tipo: nuevoTipo,
        sku: nuevoSku.trim() || undefined,
      }
    }

    const result = await registrarEntradaCompleta(payload)
    if (result && 'error' in result && result.error) {
      setError(result.error)
      showToast(result.error, 'error')
    } else {
      setShowForm(false)
      setShowProveedorForm(false)
      resetFormularioUnificado()
      await fetchData(tienda.id, mesActual)
      await fetchCuentas(tienda.id)
      showToast('Entrada registrada')
    }
    setSubmitting(false)
  }

  async function handleGuardarCsvLineas() {
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
      .filter(
        (l) =>
          l.producto_id &&
          !Number.isNaN(l.cantidad) &&
          l.cantidad >= 1 &&
          !Number.isNaN(l.costo_unitario) &&
          l.costo_unitario >= 0,
      )

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
      setShowProveedorFormBulk(false)
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

  async function abrirModalPago(c: CuentaListaRow) {
    setModalPago(c)
    setFechaModalPago(toLocalISODateString())
    setCuotasSeleccionadas(new Set())
  }

  async function ejecutarPagoModal() {
    if (!modalPago || !tienda) return
    setSubmittingPago(true)
    try {
      if (modalPago.tipo_pago === 'contado_pendiente') {
        const res = await registrarPagoCuenta(modalPago.id, undefined, fechaModalPago)
        if (res && 'error' in res && res.error) showToast(res.error, 'error')
        else {
          showToast('Pago registrado')
          setModalPago(null)
          await fetchCuentas(tienda.id)
        }
      } else if (modalPago.tipo_pago === 'cuotas') {
        const pendientes = (modalPago.cuotas_pago ?? []).filter((c) => c.estado === 'pendiente')
        const ids = pendientes.filter((c) => cuotasSeleccionadas.has(c.id)).map((c) => c.id)
        if (ids.length === 0) {
          showToast('Selecciona al menos una cuota', 'error')
          setSubmittingPago(false)
          return
        }
        for (const id of ids) {
          const res = await registrarPagoCuenta(modalPago.id, id, fechaModalPago)
          if (res && 'error' in res && res.error) {
            showToast(res.error, 'error')
            setSubmittingPago(false)
            return
          }
        }
        showToast('Pagos de cuotas registrados')
        setModalPago(null)
        await fetchCuentas(tienda.id)
      }
    } finally {
      setSubmittingPago(false)
    }
  }

  const entradasFiltradas =
    busqueda.trim() === ''
      ? entradas
      : entradas.filter((e) => e.producto_nombre.toLowerCase().includes(busqueda.toLowerCase()))

  async function cargarVariantes(productoIdSel: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('producto_variantes')
      .select('*')
      .eq('producto_id', productoIdSel)
      .eq('activa', true)
      .order('nombre')
    return (data ?? []) as ProductoVariante[]
  }

  const togglePagoClass = (active: boolean) =>
    `flex-1 text-xs font-semibold px-3 py-2.5 rounded-xl border transition text-center ${
      active
        ? 'border-[#1E3A2F] bg-[#1E3A2F] text-white'
        : 'border-[#1A1510]/15 bg-white text-[#1A1510]/70 hover:border-[#C4622D]/40'
    }`

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

      {modalPago && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4"
            style={{ background: 'var(--color-surface)' }}
          >
            <div className="flex justify-between items-start gap-2">
              <div>
                <p className="font-semibold text-[#1E3A2F]">Registrar pago</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-soft)' }}>
                  {modalPago.descripcion}
                </p>
              </div>
              <button
                type="button"
                className="text-xl text-[#1A1510]/40 hover:text-[#1A1510]"
                onClick={() => setModalPago(null)}
              >
                ✕
              </button>
            </div>

            <div>
              <label className={labelClass}>Fecha de pago</label>
              <input
                type="date"
                value={fechaModalPago}
                onChange={(e) => setFechaModalPago(e.target.value)}
                className={inputClass}
              />
            </div>

            {modalPago.tipo_pago === 'contado_pendiente' && (
              <p className="text-xs" style={{ color: 'var(--color-text-soft)' }}>
                Se registrará el gasto por el saldo pendiente ({formatCOP(modalPago.monto_total - modalPago.monto_pagado)}
                ).
              </p>
            )}

            {modalPago.tipo_pago === 'cuotas' && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                <p className="text-xs font-medium" style={{ color: 'var(--color-text-soft)' }}>
                  Cuotas pendientes
                </p>
                {(modalPago.cuotas_pago ?? [])
                  .filter((c) => c.estado === 'pendiente')
                  .sort((a, b) => a.numero_cuota - b.numero_cuota)
                  .map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 text-sm cursor-pointer py-1 border-b border-[#1A1510]/8 last:border-0"
                    >
                      <input
                        type="checkbox"
                        checked={cuotasSeleccionadas.has(c.id)}
                        onChange={(e) => {
                          setCuotasSeleccionadas((prev) => {
                            const next = new Set(prev)
                            if (e.target.checked) next.add(c.id)
                            else next.delete(c.id)
                            return next
                          })
                        }}
                      />
                      <span>
                        Cuota {c.numero_cuota} · {formatCOP(c.monto)} · vence {formatFecha(c.fecha_vencimiento)}
                      </span>
                    </label>
                  ))}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setModalPago(null)}
                className="text-sm px-4 py-2 rounded-lg border border-[#1A1510]/20"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={submittingPago}
                onClick={() => void ejecutarPagoModal()}
                className="btn-primary text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {submittingPago ? 'Guardando...' : modalPago.tipo_pago === 'cuotas' ? 'Registrar pago de cuotas' : 'Pagar todo'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
            Entradas
          </h1>
          <p className="text-sm text-[#1A1510]/50 mt-0.5">Stock y compras</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-[#1A1510]/15 overflow-hidden p-0.5 bg-white/80" style={{ background: 'var(--color-surface)' }}>
            <button
              type="button"
              onClick={() => setTab('historial')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                mainTab === 'historial' ? 'bg-[#1E3A2F] text-white' : 'text-[#1A1510]/60 hover:bg-[#FAF6F0]'
              }`}
            >
              Historial
            </button>
            <button
              type="button"
              onClick={() => setTab('por-pagar')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                mainTab === 'por-pagar' ? 'bg-[#1E3A2F] text-white' : 'text-[#1A1510]/60 hover:bg-[#FAF6F0]'
              }`}
            >
              Por pagar
            </button>
          </div>
          {mainTab === 'historial' && (
            <input
              type="month"
              value={mesActual}
              onChange={(e) => setMesActual(e.target.value)}
              className={inputClass + ' max-w-[160px]'}
            />
          )}
          {canEdit && mainTab === 'historial' && (
            <button
              onClick={() => {
                setShowForm(true)
                setError(null)
                setShowProveedorForm(false)
                setShowProveedorFormBulk(false)
                setProveedorIdSeleccionado('')
                setProveedorId('')
                setLineas([nuevaLinea()])
                resetFormularioUnificado()
              }}
              className="btn-primary text-white text-sm font-semibold px-4 py-2 rounded-lg"
            >
              + Nueva entrada
            </button>
          )}
        </div>
      </div>

      {canEdit && mainTab === 'historial' && (
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
          descripcion="CSV: fecha, producto_nombre, variante_nombre (opcional), cantidad, costo_unitario, proveedor_nombre, notas. Nombre de producto y proveedor deben coincidir con los registrados. Fechas: DD/MM/YYYY o YYYY-MM-DD"
        />
      )}

      {mainTab === 'historial' && (
        <>
          <div
            className="rounded-2xl border p-5 mb-6"
            style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)' }}
          >
            <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-soft)' }}>
              Total entradas del mes
            </p>
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
        </>
      )}

      {mainTab === 'historial' && productos.length === 0 && (
        <div
          className="rounded-2xl border border-[#1A1510]/8 p-12 text-center shadow-sm mb-6"
          style={{ background: 'var(--color-surface)' }}
        >
          <p className="text-[#1A1510]/40 text-sm">
            No hay productos aún. Usa «Producto nuevo» en la entrada para crear el primero al comprar stock.
          </p>
        </div>
      )}

      {canEdit && showForm && mainTab === 'historial' && (
        <div
          className="rounded-2xl border border-[#1A1510]/8 p-6 mb-6 shadow-sm space-y-6"
          style={{ background: 'var(--color-surface)' }}
        >
          <h2 className="text-base font-semibold text-[#1E3A2F]">Nueva entrada de inventario</h2>

          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-soft)' }}>
              1. El producto
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setModoProducto('existente')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${
                  modoProducto === 'existente'
                    ? 'bg-[#1E3A2F] text-white border-[#1E3A2F]'
                    : 'bg-white border-[#1A1510]/15 text-[#1A1510]/70'
                }`}
              >
                Producto existente
              </button>
              <button
                type="button"
                onClick={() => setModoProducto('nuevo')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${
                  modoProducto === 'nuevo'
                    ? 'bg-[#1E3A2F] text-white border-[#1E3A2F]'
                    : 'bg-white border-[#1A1510]/15 text-[#1A1510]/70'
                }`}
              >
                Producto nuevo
              </button>
            </div>

            {modoProducto === 'existente' && productos.length > 0 && (
              <div>
                <label className={labelClass}>Producto</label>
                <ProductoSelect
                  opciones={productos.map((p) => ({
                    id: p.id,
                    label: p.nombre,
                    sublabel: `Stock actual: ${p.stock_actual} uds`,
                  }))}
                  value={productoId}
                  onChange={(idSel) => {
                    setProductoId(idSel)
                    setVarianteId('')
                    void cargarVariantes(idSel).then((vars) => setVariantesDisponibles(vars))
                  }}
                  placeholder="Buscar producto..."
                />
                {variantesDisponibles.length > 0 && (
                  <select
                    value={varianteId}
                    onChange={(e) => setVarianteId(e.target.value)}
                    className={inputClass + ' mt-2'}
                  >
                    <option value="">Selecciona una variante</option>
                    {variantesDisponibles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nombre} — Stock: {v.stock_actual}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
            {modoProducto === 'existente' && productos.length === 0 && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                No hay productos en catálogo. Cambia a «Producto nuevo» para crear uno con esta compra.
              </p>
            )}

            {modoProducto === 'nuevo' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Nombre del producto *</label>
                  <input
                    className={inputClass}
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    placeholder="Ej: Anillo minimalista"
                  />
                </div>
                <div>
                  <label className={labelClass}>Precio de venta (COP) *</label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={nuevoPrecioVenta === 0 ? '' : nuevoPrecioVenta}
                    onChange={(e) => setNuevoPrecioVenta(e.target.value === '' ? 0 : Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className={labelClass}>Costo (opcional)</label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={nuevoCosto === 0 ? '' : nuevoCosto}
                    onChange={(e) => setNuevoCosto(e.target.value === '' ? 0 : Number(e.target.value))}
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-soft)' }}>
                    Costo total de fabricación para fijar tu margen. Se autocompleta con el costo unitario.
                  </p>
                </div>
                <div>
                  <label className={labelClass}>Tipo</label>
                  <select className={inputClass} value={nuevoTipo} onChange={(e) => setNuevoTipo(e.target.value as Producto['tipo'])}>
                    {TIPOS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>SKU (opcional)</label>
                  <input className={inputClass} value={nuevoSku} onChange={(e) => setNuevoSku(e.target.value)} />
                </div>
              </div>
            )}
          </section>

          <section className="space-y-3 border-t border-[#1A1510]/8 pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-soft)' }}>
              2. La entrada
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Cantidad</label>
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={cantidad}
                  onChange={(e) => setCantidad(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
              <div>
                <label className={labelClass}>Costo unitario (COP)</label>
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={costoUnitario === 0 ? '' : costoUnitario}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : Number(e.target.value)
                    setCostoUnitario(val)
                    if (modoProducto === 'nuevo' && nuevoCosto === 0) {
                      setNuevoCosto(val)
                    }
                  }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-soft)' }}>
                  Lo que pagaste en esta compra. Puede variar entre pedidos.
                </p>
              </div>
              <div className="flex items-end">
                <p className="text-sm font-medium text-[#1E3A2F] pb-2">
                  Total: {formatCOP(montoTotalEntrada)}
                </p>
              </div>
            </div>

            <div>
              <label className={labelClass}>Proveedor (opcional)</label>
              {!showProveedorForm ? (
                <div className="flex gap-2">
                  <select
                    value={proveedorId}
                    onChange={(e) => setProveedorId(e.target.value)}
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
                <ProveedorInlineForm onCreado={(prov) => void handleProveedorCreado(prov)} onCancelar={() => setShowProveedorForm(false)} />
              )}
            </div>

            <div>
              <label className={labelClass}>Fecha de recepción</label>
              <input
                type="date"
                value={fechaRecepcion}
                onChange={(e) => setFechaRecepcion(e.target.value)}
                className={`${inputClass} max-w-xs`}
              />
            </div>
            <div>
              <label className={labelClass}>Notas (opcional)</label>
              <textarea
                className={inputClass + ' min-h-[72px]'}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Referencia de factura, lote..."
              />
            </div>
          </section>

          <section className="space-y-3 border-t border-[#1A1510]/8 pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-soft)' }}>
              3. El pago
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button type="button" className={togglePagoClass(tipoPago === 'contado')} onClick={() => setTipoPago('contado')}>
                ✓ Pagué de contado
              </button>
              <button
                type="button"
                className={togglePagoClass(tipoPago === 'contado_pendiente')}
                onClick={() => setTipoPago('contado_pendiente')}
              >
                Pagaré después
              </button>
              <button type="button" className={togglePagoClass(tipoPago === 'cuotas')} onClick={() => setTipoPago('cuotas')}>
                En cuotas
              </button>
            </div>

            {tipoPago === 'contado' && (
              <div className="rounded-xl p-4 space-y-2 bg-[#E8F5EE]/60 border border-[#1E3A2F]/20">
                <label className={labelClass}>Fecha de pago</label>
                <input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} className={`${inputClass} max-w-xs`} />
                <p className="text-xs" style={{ color: 'var(--color-text-soft)' }}>
                  Se registrará automáticamente un gasto de Compra de inventario por {formatCOP(montoTotalEntrada)}.
                </p>
              </div>
            )}

            {tipoPago === 'contado_pendiente' && (
              <div className="rounded-xl p-4 space-y-2 bg-amber-50/80 border border-amber-200/60">
                <label className={labelClass}>Fecha de vencimiento</label>
                <input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} className={`${inputClass} max-w-xs`} />
                <p className="text-xs" style={{ color: 'var(--color-text-soft)' }}>
                  Se creará una alerta de pago pendiente por {formatCOP(montoTotalEntrada)}.
                </p>
              </div>
            )}

            {tipoPago === 'cuotas' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Número de cuotas</label>
                    <input
                      type="number"
                      min={2}
                      max={12}
                      className={inputClass}
                      value={numeroCuotas}
                      onChange={(e) => setNumeroCuotas(Math.min(12, Math.max(2, Number(e.target.value) || 2)))}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Fecha primera cuota</label>
                    <input
                      type="date"
                      value={fechaPrimeraCuota || fechaRecepcion}
                      onChange={(e) => setFechaPrimeraCuota(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['semanal', 'quincenal', 'mensual'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFrecuenciaCuotas(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                        frecuenciaCuotas === f ? 'bg-[#1E3A2F] text-white border-[#1E3A2F]' : 'border-[#1A1510]/15 bg-white'
                      }`}
                    >
                      {f === 'semanal' ? 'Semanal' : f === 'quincenal' ? 'Quincenal' : 'Mensual'}
                    </button>
                  ))}
                </div>
                {vistaCuotasPreview.length > 0 && (
                  <div className="rounded-xl border border-[#1A1510]/10 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ background: 'var(--color-background)' }}>
                          <th className="text-left px-3 py-2">Cuota</th>
                          <th className="text-left px-3 py-2">Vencimiento</th>
                          <th className="text-right px-3 py-2">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vistaCuotasPreview.map((row) => (
                          <tr key={row.n} className="border-t border-[#1A1510]/8">
                            <td className="px-3 py-2">{row.n}</td>
                            <td className="px-3 py-2">{formatFecha(row.fecha)}</td>
                            <td className="px-3 py-2 text-right font-medium">{formatCOP(row.monto)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="rounded-xl p-4 border-2 border-[#3A7D5A]/40 bg-[#E8F5EE]/50">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1E3A2F] mb-2">4. Resumen</p>
            <ul className="text-sm space-y-1" style={{ color: 'var(--color-text)' }}>
              <li>
                <span style={{ color: 'var(--color-text-soft)' }}>Producto:</span> {nombreProductoResumen}
              </li>
              <li>
                <span style={{ color: 'var(--color-text-soft)' }}>Cantidad:</span> {cantidad} unidades
              </li>
              <li>
                <span style={{ color: 'var(--color-text-soft)' }}>Costo total:</span> {formatCOP(montoTotalEntrada)}
              </li>
              <li>
                <span style={{ color: 'var(--color-text-soft)' }}>Pago:</span>{' '}
                {tipoPago === 'contado' && `Contado — gasto el ${formatFecha(fechaPago || fechaRecepcion)}`}
                {tipoPago === 'contado_pendiente' &&
                  `Pendiente — vence el ${fechaPago ? formatFecha(fechaPago) : '—'}`}
                {tipoPago === 'cuotas' &&
                  `${numeroCuotas} cuotas (${frecuenciaCuotas}) desde ${formatFecha(fechaPrimeraCuota || fechaRecepcion)}`}
              </li>
            </ul>
          </section>

          {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg">{error}</p>}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setShowProveedorForm(false)
                resetFormularioUnificado()
              }}
              className="text-sm text-[#1A1510]/60 hover:text-[#1A1510] px-4 py-2 rounded-lg border border-[#1A1510]/20 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleGuardarUnificado()}
              disabled={submitting}
              className="btn-primary text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Registrar entrada'}
            </button>
          </div>

          <details className="border-t border-[#1A1510]/8 pt-4">
            <summary className="text-xs font-medium text-[#C4622D] cursor-pointer">Importación rápida (varias líneas, solo contado)</summary>
            <p className="text-[11px] text-[#8A7D72] mt-2 mb-3">
              Varias líneas en una fecha con el CSV de arriba. No crea cuentas por pagar ni productos nuevos aquí.
            </p>
            <div className="mb-3">
              <label className={labelClass}>Fecha (todas las líneas)</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={`${inputClass} max-w-xs`} />
            </div>
            <div className="mb-3 max-w-lg">
              <label className={labelClass}>Proveedor (opcional)</label>
              {!showProveedorFormBulk ? (
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
                    onClick={() => setShowProveedorFormBulk(true)}
                    className="text-xs text-[#C4622D] font-medium"
                  >
                    + Nuevo
                  </button>
                </div>
              ) : (
                <ProveedorInlineForm
                  onCreado={(prov) => void handleProveedorCreadoBulk(prov)}
                  onCancelar={() => setShowProveedorFormBulk(false)}
                />
              )}
            </div>
            <div className="space-y-4">
              {lineas.map((linea) => (
                <div key={linea.id} className="grid grid-cols-1 gap-3 sm:grid-cols-12 items-end border rounded-xl p-4 bg-[#FAF6F0]/30">
                  <div className="sm:col-span-5">
                    <label className={labelClass}>Producto</label>
                    <ProductoSelect
                      opciones={productos.map((p) => ({
                        id: p.id,
                        label: p.nombre,
                        sublabel: `Stock actual: ${p.stock_actual} uds`,
                      }))}
                      value={linea.producto_id}
                      onChange={(id) => actualizarLinea(linea.id, { producto_id: id })}
                      placeholder="Buscar producto..."
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Cantidad</label>
                    <input
                      type="number"
                      min={1}
                      value={linea.cantidad}
                      onChange={(e) => actualizarLinea(linea.id, { cantidad: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className={labelClass}>Costo unitario</label>
                    <input
                      type="number"
                      min={0}
                      value={linea.costo_unitario}
                      onChange={(e) => actualizarLinea(linea.id, { costo_unitario: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={agregarLinea} className="mt-3 text-sm font-medium text-[#C4622D] hover:underline">
              + Agregar línea
            </button>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => void handleGuardarCsvLineas()}
                disabled={submitting || productos.length === 0}
                className="text-sm border border-[#1A1510]/20 px-4 py-2 rounded-lg hover:bg-[#FAF6F0] disabled:opacity-50"
              >
                Guardar líneas CSV
              </button>
            </div>
          </details>
        </div>
      )}

      {mainTab === 'historial' && entradas.length === 0 && (
        <div className="rounded-2xl border border-[#1A1510]/8 p-12 text-center shadow-sm" style={{ background: 'var(--color-surface)' }}>
          <p className="text-[#1A1510]/40 text-sm">Aún no tienes entradas en este mes.</p>
          <button
            onClick={() => {
              setShowForm(true)
              setShowProveedorForm(false)
              resetFormularioUnificado()
            }}
            className="mt-3 text-sm text-[#C4622D] font-medium hover:underline"
          >
            Registrar la primera
          </button>
        </div>
      )}

      {mainTab === 'historial' &&
        entradas.length > 0 &&
        (entradasFiltradas.length === 0 && busqueda.trim() !== '' ? (
          <div className="rounded-2xl border border-[#EDE5DC] p-12 text-center shadow-sm" style={{ background: 'var(--color-surface)' }}>
            <p className="text-[#8A7D72] text-sm">No se encontraron entradas para &quot;{busqueda}&quot;</p>
            <button onClick={() => setBusqueda('')} className="mt-2 text-sm text-[#C4622D] font-medium hover:underline">
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          entradasFiltradas.length > 0 && (
            <div className="rounded-2xl border border-[#1A1510]/8 shadow-sm overflow-hidden" style={{ background: 'var(--color-surface)' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-[#1A1510]/8 bg-[#FAF6F0]" style={{ background: 'var(--color-background)' }}>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">Fecha</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">Producto</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">Tipo</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">Cantidad</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                        <span className="inline-flex items-center justify-end gap-0">
                          Costo u.
                          <Tooltip texto="Precio al que compraste cada unidad a tu proveedor" />
                        </span>
                      </th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-[#1A1510]/50 uppercase tracking-wide">
                        <span className="inline-flex items-center justify-end gap-0">
                          Total
                          <Tooltip texto="Costo unitario × cantidad" />
                        </span>
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
                            className="text-xs font-medium hover:underline"
                            style={{ color: '#C44040' }}
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
          )
        ))}

      {mainTab === 'por-pagar' && (
        <div className="space-y-4">
          {loadingCuentas ? (
            <p className="text-sm text-[#8A7D72]">Cargando cuentas...</p>
          ) : cuentasPendientes.length === 0 ? (
            <div className="rounded-2xl border border-[#1A1510]/8 p-12 text-center" style={{ background: 'var(--color-surface)' }}>
              <p className="text-sm text-[#8A7D72]">No tienes cuentas por pagar pendientes.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#1A1510]/8 shadow-sm overflow-hidden" style={{ background: 'var(--color-surface)' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[800px]">
                  <thead>
                    <tr className="border-b border-[#1A1510]/8 bg-[#FAF6F0]" style={{ background: 'var(--color-background)' }}>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#1A1510]/50">Descripción</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#1A1510]/50">Proveedor</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#1A1510]/50">Total</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#1A1510]/50">Pagado</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#1A1510]/50">Pendiente</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#1A1510]/50">Vencimiento</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#1A1510]/50">Estado</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {cuentasPendientes.map((c) => {
                      const pend = Number(c.monto_total) - Number(c.monto_pagado)
                      return (
                        <tr key={c.id} className="border-b border-[#1A1510]/5 hover:bg-[#FAF6F0]/40">
                          <td className="px-4 py-3 max-w-[200px]">{c.descripcion}</td>
                          <td className="px-4 py-3 text-[#1A1510]/70">{c.proveedores?.nombre ?? '—'}</td>
                          <td className="px-4 py-3 text-right">{formatCOP(Number(c.monto_total))}</td>
                          <td className="px-4 py-3 text-right">{formatCOP(Number(c.monto_pagado))}</td>
                          <td className="px-4 py-3 text-right font-medium text-[#C4622D]">{formatCOP(pend)}</td>
                          <td className="px-4 py-3 text-xs">
                            {c.fecha_vencimiento ? formatFecha(c.fecha_vencimiento) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                c.estado === 'parcial' ? 'bg-amber-100 text-amber-900' : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {c.estado}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => abrirModalPago(c)}
                                className="text-xs text-[#C4622D] font-medium hover:underline"
                              >
                                Registrar pago
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  )
}

export default function EntradasPage() {
  return (
    <Suspense fallback={<ModuleTableSkeleton maxWidthClass="max-w-5xl" rows={8} />}>
      <EntradasPageContent />
    </Suspense>
  )
}
