'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTienda } from '@/lib/hooks/useTienda'
import { useToast } from '@/lib/hooks/useToast'
import Toast from '@/components/ui/Toast'
import { crearVentaMulti } from '@/app/(dashboard)/ventas/actions'
import { toLocalISODateString, calcularComisionMedioPago } from '@/lib/utils'
import type { MedioPago } from '@/lib/types'

// --- Types ---
interface EventoActivo {
  id: string
  nombre: string
  lugar?: string | null
}

interface EventoInvItem {
  producto_id: string
  variante_id: string | null
  cantidad_llevada: number
  cantidad_vendida: number
  cantidad_devuelta: number
}

interface VariantePOS {
  id: string
  nombre: string
  precio_venta: number | null
  stock_actual: number
}

interface ProductoPOS {
  id: string
  nombre: string
  precio_venta: number
  stock_actual: number
  tiene_variantes: boolean
  variantes: VariantePOS[]
}

interface ClientePOS {
  id: string
  nombre: string
  telefono?: string | null
}

interface ItemCarrito {
  key: string
  productoId: string
  varianteId: string | null
  nombre: string
  varianteNombre: string | null
  precio: number
  cantidad: number
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)

export default function POSPage() {
  const { tienda } = useTienda()
  const { toasts, showToast, removeToast } = useToast()

  // Data
  const [todos, setTodos] = useState<ProductoPOS[]>([])
  const [eventos, setEventos] = useState<EventoActivo[]>([])
  const [mediosPago, setMediosPago] = useState<MedioPago[]>([])
  const [clientes, setClientes] = useState<ClientePOS[]>([])
  const [eventoInventario, setEventoInventario] = useState<EventoInvItem[]>([])

  // Loading
  const [loading, setLoading] = useState(true)
  const [loadingInv, setLoadingInv] = useState(false)

  // Filters
  const [busqueda, setBusqueda] = useState('')
  const [eventoId, setEventoId] = useState('')

  // Cart
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [descuentoGlobal, setDescuentoGlobal] = useState(0)
  const [envio, setEnvio] = useState(0)
  const [medioPagoId, setMedioPagoId] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [clienteQuery, setClienteQuery] = useState('')
  const [showClienteList, setShowClienteList] = useState(false)

  // Modal
  const [modalVariante, setModalVariante] = useState<ProductoPOS | null>(null)

  // UI
  const [procesando, setProcesando] = useState(false)
  const [tabMobile, setTabMobile] = useState<'catalogo' | 'carrito'>('catalogo')

  // Refs
  const clienteRef = useRef<HTMLDivElement>(null)

  // --- Click outside para cerrar lista de clientes ---
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (clienteRef.current && !clienteRef.current.contains(e.target as Node)) {
        setShowClienteList(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // --- Load initial data ---
  useEffect(() => {
    if (!tienda) return
    const supabase = createClient()

    async function cargar() {
      setLoading(true)
      const [prodsRes, eventosRes, mediosRes, clientesRes] = await Promise.all([
        supabase
          .from('productos')
          .select('id, nombre, precio_venta, stock_actual, tiene_variantes, producto_variantes(id, nombre, precio_venta, stock_actual)')
          .eq('tienda_id', tienda!.id)
          .eq('estado', 'activo')
          .order('nombre'),
        supabase
          .from('eventos')
          .select('id, nombre, lugar')
          .eq('tienda_id', tienda!.id)
          .eq('estado', 'activo')
          .order('fecha_inicio', { ascending: false }),
        supabase
          .from('medios_pago')
          .select('*')
          .eq('tienda_id', tienda!.id)
          .eq('activo', true)
          .order('nombre'),
        supabase
          .from('clientes')
          .select('id, nombre, telefono')
          .eq('tienda_id', tienda!.id)
          .order('nombre'),
      ])

      const prods: ProductoPOS[] = ((prodsRes.data as any[]) ?? []).map((p) => ({
        id: p.id,
        nombre: p.nombre,
        precio_venta: p.precio_venta,
        stock_actual: p.stock_actual,
        tiene_variantes: (p.producto_variantes?.length ?? 0) > 0,
        variantes: ((p.producto_variantes as any[]) ?? []).map((v) => ({
          id: v.id,
          nombre: v.nombre,
          precio_venta: v.precio_venta,
          stock_actual: v.stock_actual,
        })),
      }))

      setTodos(prods)
      setEventos((eventosRes.data as EventoActivo[]) ?? [])
      setMediosPago((mediosRes.data as MedioPago[]) ?? [])
      setClientes((clientesRes.data as ClientePOS[]) ?? [])
      if (mediosRes.data && mediosRes.data.length > 0) {
        setMedioPagoId((mediosRes.data[0] as MedioPago).id)
      }
      setLoading(false)
    }
    void cargar()
  }, [tienda])

  // --- Load event inventory ---
  useEffect(() => {
    if (!eventoId || !tienda) {
      setEventoInventario([])
      return
    }
    const supabase = createClient()
    setLoadingInv(true)
    supabase
      .from('evento_inventario')
      .select('producto_id, variante_id, cantidad_llevada, cantidad_vendida, cantidad_devuelta')
      .eq('evento_id', eventoId)
      .eq('tienda_id', tienda.id)
      .then(({ data }) => {
        setEventoInventario((data as EventoInvItem[]) ?? [])
        setLoadingInv(false)
      })
  }, [eventoId, tienda])

  // --- Computed catalog ---
  const catalogo = useMemo(() => {
    let prods = todos

    if (eventoId) {
      const dispProd = new Map<string, number>()
      const dispVar = new Map<string, number>()
      for (const item of eventoInventario) {
        const disp = item.cantidad_llevada - item.cantidad_vendida - item.cantidad_devuelta
        if (item.variante_id) {
          dispVar.set(item.variante_id, (dispVar.get(item.variante_id) ?? 0) + disp)
        }
        dispProd.set(item.producto_id, (dispProd.get(item.producto_id) ?? 0) + disp)
      }

      prods = prods
        .filter((p) => (dispProd.get(p.id) ?? 0) > 0)
        .map((p) => ({
          ...p,
          stock_actual: dispProd.get(p.id) ?? 0,
          variantes: p.variantes
            .filter((v) => (dispVar.get(v.id) ?? 0) > 0)
            .map((v) => ({ ...v, stock_actual: dispVar.get(v.id) ?? 0 })),
        }))
    } else {
      prods = prods.filter((p) =>
        p.tiene_variantes ? p.variantes.some((v) => v.stock_actual > 0) : p.stock_actual > 0
      )
    }

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      prods = prods.filter((p) => p.nombre.toLowerCase().includes(q))
    }

    return prods
  }, [todos, eventoId, eventoInventario, busqueda])

  // --- Refetch products (after sale) ---
  async function refetchProductos() {
    if (!tienda) return
    const supabase = createClient()
    const { data } = await supabase
      .from('productos')
      .select('id, nombre, precio_venta, stock_actual, tiene_variantes, producto_variantes(id, nombre, precio_venta, stock_actual)')
      .eq('tienda_id', tienda.id)
      .eq('estado', 'activo')
      .order('nombre')
    if (data) {
      setTodos(((data as any[]) ?? []).map((p) => ({
        id: p.id,
        nombre: p.nombre,
        precio_venta: p.precio_venta,
        stock_actual: p.stock_actual,
        tiene_variantes: (p.producto_variantes?.length ?? 0) > 0,
        variantes: ((p.producto_variantes as any[]) ?? []).map((v) => ({
          id: v.id,
          nombre: v.nombre,
          precio_venta: v.precio_venta,
          stock_actual: v.stock_actual,
        })),
      })))
    }
    if (eventoId) {
      const { data: inv } = await supabase
        .from('evento_inventario')
        .select('producto_id, variante_id, cantidad_llevada, cantidad_vendida, cantidad_devuelta')
        .eq('evento_id', eventoId)
        .eq('tienda_id', tienda.id)
      setEventoInventario((inv as EventoInvItem[]) ?? [])
    }
  }

  // --- Cart operations ---
  function agregarAlCarrito(prod: ProductoPOS, variante?: VariantePOS) {
    const key = variante ? `${prod.id}-${variante.id}` : `${prod.id}-base`
    const precio = variante?.precio_venta ?? prod.precio_venta
    setCarrito((prev) => {
      const existing = prev.find((i) => i.key === key)
      if (existing) {
        return prev.map((i) => i.key === key ? { ...i, cantidad: i.cantidad + 1 } : i)
      }
      return [...prev, {
        key,
        productoId: prod.id,
        varianteId: variante?.id ?? null,
        nombre: prod.nombre,
        varianteNombre: variante?.nombre ?? null,
        precio,
        cantidad: 1,
      }]
    })
    if (variante) setModalVariante(null)
  }

  function handleClickProducto(prod: ProductoPOS) {
    const variantesConStock = prod.variantes.filter((v) => v.stock_actual > 0)
    if (prod.tiene_variantes && variantesConStock.length > 0) {
      setModalVariante(prod)
    } else if (!prod.tiene_variantes) {
      agregarAlCarrito(prod)
    }
  }

  function setCantidad(key: string, delta: number) {
    setCarrito((prev) =>
      prev
        .map((i) => i.key === key ? { ...i, cantidad: Math.max(0, i.cantidad + delta) } : i)
        .filter((i) => i.cantidad > 0)
    )
  }

  function eliminarItem(key: string) {
    setCarrito((prev) => prev.filter((i) => i.key !== key))
  }

  // --- Totals ---
  const subtotalBruto = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0)
  const descuentoMonto = Math.round(subtotalBruto * (descuentoGlobal / 100))
  const subtotal = subtotalBruto - descuentoMonto
  const medioPago = mediosPago.find((m) => m.id === medioPagoId)
  const comInfo = medioPago ? calcularComisionMedioPago(subtotal, envio, medioPago) : null
  const totalFinal = comInfo ? comInfo.neto : subtotal + envio
  const itemCount = carrito.reduce((s, i) => s + i.cantidad, 0)

  // --- Client search ---
  const clienteSeleccionado = clientes.find((c) => c.id === clienteId)
  const clientesFiltrados = useMemo(() => {
    const q = clienteQuery.trim().toLowerCase()
    if (!q) return clientes.slice(0, 8)
    return clientes.filter((c) => c.nombre.toLowerCase().includes(q)).slice(0, 8)
  }, [clientes, clienteQuery])

  // --- Checkout ---
  async function cobrar() {
    if (carrito.length === 0) { showToast('El carrito está vacío', 'error'); return }
    if (!medioPagoId) { showToast('Selecciona un medio de pago', 'error'); return }
    setProcesando(true)
    try {
      const result = await crearVentaMulti({
        canal: 'Presencial',
        medio_pago_id: medioPagoId,
        cliente_id: clienteId || undefined,
        envio: envio || 0,
        fecha: toLocalISODateString(),
        evento_id: eventoId || undefined,
        lineas: carrito.map((i) => ({
          producto_id: i.productoId,
          variante_id: i.varianteId ?? undefined,
          cantidad: i.cantidad,
          precio_venta: i.precio,
          descuento: descuentoGlobal,
        })),
      })
      if (result?.error) {
        showToast(result.error, 'error')
      } else {
        const total = totalFinal
        setCarrito([])
        setDescuentoGlobal(0)
        setEnvio(0)
        setClienteId('')
        setClienteQuery('')
        showToast(`Venta de ${fmt(total)} registrada`)
        void refetchProductos()
      }
    } finally {
      setProcesando(false)
    }
  }

  // --- Render helpers ---
  const catalogoPanel = (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Toolbar */}
      <div
        className="px-4 py-3 border-b flex flex-wrap gap-2 items-center"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      >
        <div className="relative flex-1 min-w-[160px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: 'var(--color-text-faint)' }}>
            🔍
          </span>
          <input
            type="text"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)' }}
          />
        </div>
        {eventos.length > 0 && (
          <select
            value={eventoId}
            onChange={(e) => { setEventoId(e.target.value); setBusqueda('') }}
            className="text-sm rounded-lg border px-3 py-2 focus:outline-none"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)' }}
          >
            <option value="">Todos los productos</option>
            {eventos.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.nombre}{ev.lugar ? ` — ${ev.lugar}` : ''}
              </option>
            ))}
          </select>
        )}
        <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
          {catalogo.length} producto{catalogo.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto p-4" style={{ background: 'var(--color-background)' }}>
        {loadingInv ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} />
          </div>
        ) : catalogo.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <span className="text-3xl">📦</span>
            <p className="text-sm text-center" style={{ color: 'var(--color-text-soft)' }}>
              {eventoId ? 'Sin productos disponibles en este evento' : 'No hay productos con stock disponible'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {catalogo.map((prod) => {
              const enCarrito = carrito.filter((i) => i.productoId === prod.id).reduce((s, i) => s + i.cantidad, 0)
              const precioMin = prod.tiene_variantes
                ? Math.min(...prod.variantes.map((v) => v.precio_venta ?? prod.precio_venta))
                : prod.precio_venta
              return (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => handleClickProducto(prod)}
                  className="relative text-left rounded-xl border p-3 flex flex-col gap-1.5 transition-all hover:shadow-md active:scale-[0.97]"
                  style={{
                    borderColor: enCarrito > 0 ? 'var(--color-accent)' : 'var(--color-border)',
                    background: enCarrito > 0 ? 'var(--color-accent-pale)' : 'var(--color-surface)',
                  }}
                >
                  {enCarrito > 0 && (
                    <span
                      className="absolute top-2 right-2 w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                      style={{ background: 'var(--color-accent)' }}
                    >
                      {enCarrito}
                    </span>
                  )}
                  <p className="text-sm font-medium leading-tight pr-6" style={{ color: 'var(--color-text)' }}>
                    {prod.nombre}
                  </p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>
                    {prod.tiene_variantes ? `Desde ${fmt(precioMin)}` : fmt(prod.precio_venta)}
                  </p>
                  <p
                    className="text-[11px]"
                    style={{ color: !prod.tiene_variantes && prod.stock_actual <= 3 ? '#C44040' : 'var(--color-text-faint)' }}
                  >
                    {prod.tiene_variantes
                      ? `${prod.variantes.filter((v) => v.stock_actual > 0).length} variante${prod.variantes.filter((v) => v.stock_actual > 0).length !== 1 ? 's' : ''}`
                      : `Stock: ${prod.stock_actual} uds`}
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  const carritoPanel = (
    <div
      className="w-full lg:w-[360px] flex-shrink-0 flex flex-col border-t lg:border-t-0 lg:border-l"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
    >
      {/* Cart header */}
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
        <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
          Carrito{' '}
          {itemCount > 0 && (
            <span className="text-xs font-normal" style={{ color: 'var(--color-text-soft)' }}>
              ({itemCount} ud{itemCount !== 1 ? 's' : ''})
            </span>
          )}
        </h2>
        {carrito.length > 0 && (
          <button
            type="button"
            onClick={() => setCarrito([])}
            className="text-[11px] hover:underline"
            style={{ color: 'var(--color-text-soft)' }}
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {carrito.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <span className="text-2xl">🛒</span>
            <p className="text-sm" style={{ color: 'var(--color-text-faint)' }}>Agrega productos al carrito</p>
          </div>
        ) : (
          <>
            <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {carrito.map((item) => (
                <div key={item.key} className="px-4 py-3 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{item.nombre}</p>
                    {item.varianteNombre && (
                      <p className="text-[11px] truncate" style={{ color: 'var(--color-text-soft)' }}>{item.varianteNombre}</p>
                    )}
                    <p className="text-[11px]" style={{ color: 'var(--color-accent)' }}>{fmt(item.precio)} c/u</p>
                  </div>
                  {/* Quantity controls */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCantidad(item.key, -1)}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-sm border transition hover:bg-gray-100"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-medium" style={{ color: 'var(--color-text)' }}>{item.cantidad}</span>
                    <button
                      type="button"
                      onClick={() => setCantidad(item.key, +1)}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-sm border transition hover:bg-gray-100"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    >
                      +
                    </button>
                  </div>
                  <p className="text-sm font-semibold w-[72px] text-right flex-shrink-0" style={{ color: 'var(--color-text)' }}>
                    {fmt(item.precio * item.cantidad)}
                  </p>
                  <button
                    type="button"
                    onClick={() => eliminarItem(item.key)}
                    className="w-5 h-5 flex items-center justify-center text-xs rounded transition hover:bg-red-50 hover:text-red-500"
                    style={{ color: 'var(--color-text-faint)' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Adjustments */}
            <div className="px-4 py-3 border-t space-y-2.5" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2">
                <label className="text-xs flex-1" style={{ color: 'var(--color-text-soft)' }}>Descuento global (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={descuentoGlobal || ''}
                  onChange={(e) => setDescuentoGlobal(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                  placeholder="0"
                  className="w-20 text-right px-2 py-1.5 text-sm rounded-lg border focus:outline-none"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)' }}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs flex-1" style={{ color: 'var(--color-text-soft)' }}>Envío ($)</label>
                <input
                  type="number"
                  min={0}
                  value={envio || ''}
                  onChange={(e) => setEnvio(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                  className="w-24 text-right px-2 py-1.5 text-sm rounded-lg border focus:outline-none"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)' }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Totals + checkout */}
      <div className="border-t px-4 py-4 space-y-3" style={{ borderColor: 'var(--color-border)' }}>
        {/* Summary */}
        {carrito.length > 0 && (
          <div className="space-y-1 pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex justify-between text-xs" style={{ color: 'var(--color-text-soft)' }}>
              <span>Subtotal</span>
              <span>{fmt(subtotalBruto)}</span>
            </div>
            {descuentoGlobal > 0 && (
              <div className="flex justify-between text-xs" style={{ color: '#3A7D5A' }}>
                <span>Descuento ({descuentoGlobal}%)</span>
                <span>−{fmt(descuentoMonto)}</span>
              </div>
            )}
            {envio > 0 && (
              <div className="flex justify-between text-xs" style={{ color: 'var(--color-text-soft)' }}>
                <span>Envío</span>
                <span>+{fmt(envio)}</span>
              </div>
            )}
            {comInfo && comInfo.comision_total > 0 && (
              <div className="flex justify-between text-xs" style={{ color: 'var(--color-text-soft)' }}>
                <span>Comisión {medioPago?.nombre}</span>
                <span>−{fmt(comInfo.comision_total)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold pt-1" style={{ color: 'var(--color-text)' }}>
              <span>Total neto</span>
              <span style={{ color: 'var(--color-accent)' }}>{fmt(totalFinal)}</span>
            </div>
          </div>
        )}

        {/* Cliente */}
        <div ref={clienteRef} className="relative">
          <label className="text-[11px] block mb-1" style={{ color: 'var(--color-text-soft)' }}>Cliente (opcional)</label>
          {clienteSeleccionado ? (
            <div
              className="flex items-center justify-between px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--color-accent)', background: 'var(--color-accent-pale)', color: 'var(--color-text)' }}
            >
              <span className="truncate">{clienteSeleccionado.nombre}</span>
              <button type="button" onClick={() => { setClienteId(''); setClienteQuery('') }}
                className="ml-2 text-xs flex-shrink-0" style={{ color: 'var(--color-text-soft)' }}>✕</button>
            </div>
          ) : (
            <input
              type="text"
              value={clienteQuery}
              onChange={(e) => { setClienteQuery(e.target.value); setShowClienteList(true) }}
              onFocus={() => setShowClienteList(true)}
              placeholder="Buscar cliente..."
              className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)' }}
            />
          )}
          {showClienteList && !clienteSeleccionado && clientesFiltrados.length > 0 && (
            <div
              className="absolute bottom-full mb-1 left-0 right-0 rounded-xl border shadow-xl z-30 max-h-44 overflow-y-auto"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              {clientesFiltrados.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={() => { setClienteId(c.id); setClienteQuery(''); setShowClienteList(false) }}
                  className="w-full text-left px-3 py-2.5 text-sm transition hover:bg-[#FAF6F0]"
                  style={{ color: 'var(--color-text)' }}
                >
                  {c.nombre}
                  {c.telefono && (
                    <span className="text-xs ml-2" style={{ color: 'var(--color-text-soft)' }}>{c.telefono}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Medio pago */}
        <div>
          <label className="text-[11px] block mb-1" style={{ color: 'var(--color-text-soft)' }}>Medio de pago</label>
          {mediosPago.length === 0 ? (
            <p className="text-xs" style={{ color: '#C44040' }}>No hay medios de pago activos.</p>
          ) : (
            <select
              value={medioPagoId}
              onChange={(e) => setMedioPagoId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)' }}
            >
              <option value="">Seleccionar...</option>
              {mediosPago.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          )}
        </div>

        {/* Cobrar */}
        <button
          type="button"
          onClick={() => void cobrar()}
          disabled={procesando || carrito.length === 0 || !medioPagoId}
          className="w-full py-3 rounded-xl font-semibold text-sm text-white transition disabled:opacity-40"
          style={{ background: 'var(--color-accent)' }}
        >
          {procesando ? 'Registrando...' : carrito.length === 0 ? 'Carrito vacío' : `Cobrar ${fmt(totalFinal)}`}
        </button>
      </div>
    </div>
  )

  // --- Loading state ---
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div
          className="w-6 h-6 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  return (
    <div style={{ height: 'calc(100vh - 56px)' }} className="flex flex-col overflow-hidden">
      {/* Mobile tab bar */}
      <div
        className="lg:hidden flex border-b flex-shrink-0"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      >
        {(['catalogo', 'carrito'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setTabMobile(tab)}
            className="flex-1 py-2.5 text-sm font-medium transition"
            style={{
              color: tabMobile === tab ? 'var(--color-accent)' : 'var(--color-text-soft)',
              borderBottom: tabMobile === tab ? '2px solid var(--color-accent)' : '2px solid transparent',
            }}
          >
            {tab === 'catalogo' ? 'Catálogo' : `Carrito${itemCount > 0 ? ` (${itemCount})` : ''}`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Desktop: both panels */}
        <div className="hidden lg:flex flex-1 overflow-hidden">
          {catalogoPanel}
          {carritoPanel}
        </div>
        {/* Mobile: selected tab */}
        <div className="flex lg:hidden flex-1 overflow-hidden">
          {tabMobile === 'catalogo' ? catalogoPanel : carritoPanel}
        </div>
      </div>

      {/* Variant modal */}
      {modalVariante && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div
            className="rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
            style={{ background: 'var(--color-surface)' }}
          >
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{modalVariante.nombre}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-soft)' }}>Elige una variante</p>
              </div>
              <button
                type="button"
                onClick={() => setModalVariante(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                style={{ color: 'var(--color-text-soft)' }}
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {modalVariante.variantes.filter((v) => v.stock_actual > 0).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => agregarAlCarrito(modalVariante, v)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition hover:shadow-sm active:scale-[0.98]"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)' }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{v.nombre}</p>
                    <p
                      className="text-[11px]"
                      style={{ color: v.stock_actual <= 3 ? '#C44040' : 'var(--color-text-faint)' }}
                    >
                      Stock: {v.stock_actual} uds
                    </p>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>
                    {fmt(v.precio_venta ?? modalVariante.precio_venta)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
