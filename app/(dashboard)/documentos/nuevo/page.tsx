'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTienda } from '@/lib/hooks/useTienda'
import type { Cliente, ItemDocumento, Producto, Proveedor, TipoDocumento } from '@/lib/types'
import { crearDocumento } from '../actions'
import Toast from '@/components/ui/Toast'
import { useToast } from '@/lib/hooks/useToast'

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-[#EDE5DC] bg-white text-ink placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30'

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(n)
}

type ItemFormulario = ItemDocumento & { producto_id?: string; manual?: boolean }

function nuevoItem(): ItemFormulario {
  return { descripcion: '', cantidad: 1, precio_unitario: 0, subtotal: 0, manual: false }
}

function numeroALetras(num: number): string {
  const unidades = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte']
  const decenas = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
  const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos']

  if (num === 0) return 'cero pesos m/cte'
  if (num === 100) return 'cien pesos m/cte'

  let valor = Math.floor(Math.max(0, num))
  let resultado = ''

  if (valor >= 1000000) {
    const millones = Math.floor(valor / 1000000)
    resultado += millones === 1 ? 'un millón ' : `${numeroALetras(millones).replace(' pesos m/cte', '')} millones `
    valor %= 1000000
  }
  if (valor >= 1000) {
    const miles = Math.floor(valor / 1000)
    resultado += miles === 1 ? 'mil ' : `${numeroALetras(miles).replace(' pesos m/cte', '')} mil `
    valor %= 1000
  }
  if (valor >= 100) {
    resultado += centenas[Math.floor(valor / 100)] + ' '
    valor %= 100
  }
  if (valor > 20) {
    resultado += decenas[Math.floor(valor / 10)]
    if (valor % 10 > 0) resultado += ' y ' + unidades[valor % 10]
  } else if (valor > 0) {
    resultado += unidades[valor]
  }

  return resultado.trim() + ' pesos m/cte'
}

export default function NuevoDocumentoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { tienda } = useTienda()
  const { toasts, showToast, removeToast } = useToast()

  const tipoParam = searchParams.get('tipo')
  const tipoInicial: TipoDocumento = tipoParam === 'cuenta_cobro' ? 'cuenta_cobro' : 'cotizacion'

  const [tipo, setTipo] = useState<TipoDocumento>(tipoInicial)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [clienteId, setClienteId] = useState('')
  const [proveedorId, setProveedorId] = useState('')
  const [destinatarioNombre, setDestinatarioNombre] = useState('')
  const [destinatarioNit, setDestinatarioNit] = useState('')
  const [destinatarioEmail, setDestinatarioEmail] = useState('')
  const [destinatarioTelefono, setDestinatarioTelefono] = useState('')
  const [destinatarioCiudad, setDestinatarioCiudad] = useState('')
  const [concepto, setConcepto] = useState('')
  const [items, setItems] = useState<ItemFormulario[]>([nuevoItem()])
  const [descuento, setDescuento] = useState(0)
  const [banco, setBanco] = useState('')
  const [tipoCuenta, setTipoCuenta] = useState('Ahorros')
  const [numeroCuenta, setNumeroCuenta] = useState('')
  const [titularCuenta, setTitularCuenta] = useState('')
  const [cedulaTitular, setCedulaTitular] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [notas, setNotas] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modoDestinatario, setModoDestinatario] = useState<'cliente' | 'manual'>('cliente')
  const [totalCuentaCobro, setTotalCuentaCobro] = useState(0)

  useEffect(() => {
    const id = window.setTimeout(() => setTipo(tipoInicial), 0)
    return () => window.clearTimeout(id)
  }, [tipoInicial])

  useEffect(() => {
    if (!tienda) return
    const supabase = createClient()
    const id = window.setTimeout(() => {
      void Promise.all([
        supabase.from('clientes').select('*').eq('tienda_id', tienda.id).order('nombre'),
        supabase.from('proveedores').select('id, nombre, telefono, ciudad, nit').eq('tienda_id', tienda.id).order('nombre'),
        supabase
          .from('productos')
          .select('id, nombre, precio_venta, tienda_id, stock_actual, stock_minimo, tipo, created_at')
          .eq('tienda_id', tienda.id)
          .gt('stock_actual', 0)
          .order('nombre'),
      ]).then(([clientesRes, proveedoresRes, productosRes]) => {
        setClientes((clientesRes.data ?? []) as Cliente[])
        setProveedores((proveedoresRes.data ?? []) as Proveedor[])
        setProductos((productosRes.data ?? []) as Producto[])
      })
    }, 0)
    return () => window.clearTimeout(id)
  }, [tienda])

  function actualizarItem(i: number, campo: keyof ItemFormulario, valor: string | number) {
    const nuevos = [...items]
    if (campo === 'producto_id') {
      if (valor === 'manual' || valor === '') {
        nuevos[i] = {
          ...nuevos[i],
          producto_id: undefined,
          manual: true,
        }
      } else {
        const prod = productos.find((p) => p.id === valor)
        if (prod) {
          nuevos[i] = {
            ...nuevos[i],
            producto_id: prod.id,
            descripcion: prod.nombre,
            precio_unitario: prod.precio_venta,
            subtotal: (Number(nuevos[i].cantidad) || 0) * prod.precio_venta,
            manual: false,
          }
        }
      }
      setItems(nuevos)
      return
    }

    nuevos[i] = { ...nuevos[i], [campo]: valor }
    if (campo === 'cantidad' || campo === 'precio_unitario') {
      nuevos[i].subtotal = (Number(nuevos[i].cantidad) || 0) * (Number(nuevos[i].precio_unitario) || 0)
    }
    if (campo === 'descripcion') {
      nuevos[i].manual = true
    }
    setItems(nuevos)
  }

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.subtotal, 0), [items])
  const descuentoValor = useMemo(() => Math.round(subtotal * (descuento / 100)), [subtotal, descuento])
  const total = useMemo(
    () => (tipo === 'cotizacion' ? subtotal - descuentoValor : Number(concepto.match(/\d+/)?.[0] ?? 0)),
    [tipo, subtotal, descuentoValor, concepto],
  )

  function seleccionarCliente(valor: string) {
    setClienteId(valor)
    if (!valor) {
      setModoDestinatario('manual')
      return
    }
    const cliente = clientes.find((c) => c.id === valor)
    setModoDestinatario('cliente')
    if (!cliente) return
    setDestinatarioNombre(cliente.nombre ?? '')
    setDestinatarioEmail(cliente.correo ?? '')
    setDestinatarioTelefono(cliente.telefono ?? '')
    setDestinatarioCiudad(cliente.ciudad ?? '')
  }

  function seleccionarProveedor(valor: string) {
    setProveedorId(valor)
    if (!valor) {
      setModoDestinatario('manual')
      return
    }
    const proveedor = proveedores.find((p) => p.id === valor)
    setModoDestinatario('cliente')
    if (!proveedor) return
    setDestinatarioNombre(proveedor.nombre ?? '')
    setDestinatarioNit(proveedor.nit ?? '')
    setDestinatarioTelefono(proveedor.telefono ?? '')
    setDestinatarioCiudad(proveedor.ciudad ?? '')
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!destinatarioNombre.trim()) {
      setError('El nombre del destinatario es obligatorio')
      return
    }
    if (tipo === 'cotizacion' && items.length === 0) {
      setError('Agrega al menos un ítem')
      return
    }

    setSubmitting(true)
    setError(null)

    const payload =
      tipo === 'cotizacion'
        ? {
            tipo,
            cliente_id: clienteId || undefined,
            destinatario_nombre: destinatarioNombre.trim(),
            destinatario_nit: destinatarioNit.trim() || undefined,
            destinatario_email: destinatarioEmail.trim() || undefined,
            destinatario_telefono: destinatarioTelefono.trim() || undefined,
            destinatario_ciudad: destinatarioCiudad.trim() || undefined,
            concepto: concepto.trim() || undefined,
            items: items.map(({ descripcion, cantidad, precio_unitario, subtotal }) => ({
              descripcion,
              cantidad,
              precio_unitario,
              subtotal,
            })),
            subtotal,
            descuento: Math.min(100, Math.max(0, descuento)),
            total: subtotal - descuentoValor,
            banco: undefined,
            tipo_cuenta: undefined,
            numero_cuenta: undefined,
            titular_cuenta: undefined,
            cedula_titular: undefined,
            fecha,
            fecha_vencimiento: fechaVencimiento || undefined,
            notas: notas.trim() || undefined,
          }
        : {
            tipo,
            cliente_id: undefined,
            destinatario_nombre: destinatarioNombre.trim(),
            destinatario_nit: destinatarioNit.trim() || undefined,
            destinatario_email: destinatarioEmail.trim() || undefined,
            destinatario_telefono: destinatarioTelefono.trim() || undefined,
            destinatario_ciudad: destinatarioCiudad.trim() || undefined,
            concepto: concepto.trim() || undefined,
            items: [{ descripcion: concepto.trim() || 'Cuenta de cobro', cantidad: 1, precio_unitario: totalCuentaCobro, subtotal: totalCuentaCobro }],
            subtotal: totalCuentaCobro,
            descuento: 0,
            total: totalCuentaCobro,
            banco: banco.trim() || undefined,
            tipo_cuenta: tipoCuenta || undefined,
            numero_cuenta: numeroCuenta.trim() || undefined,
            titular_cuenta: titularCuenta.trim() || undefined,
            cedula_titular: cedulaTitular.trim() || undefined,
            fecha,
            fecha_vencimiento: fechaVencimiento || undefined,
            notas: notas.trim() || undefined,
          }

    const res = await crearDocumento(payload)
    if (res?.error) {
      setError(res.error)
      setSubmitting(false)
      return
    }
    showToast('Documento guardado')
    if (res.id) router.push(`/documentos/${res.id}/pdf`)
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>Nuevo documento</h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="bg-white rounded-2xl border border-[#EDE5DC] p-5 shadow-sm">
          <label className="block text-xs font-medium text-ink-soft mb-1">Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoDocumento)} className={inputClass}>
            <option value="cotizacion">Cotización</option>
            <option value="cuenta_cobro">Cuenta de cobro</option>
          </select>
        </div>

        <div className="bg-white rounded-2xl border border-[#EDE5DC] p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-ink mb-3">Destinatario</h2>
          <div className="flex gap-2 mb-3">
            <button type="button" onClick={() => setModoDestinatario('cliente')} className={`text-xs px-3 py-1.5 rounded-full border ${modoDestinatario === 'cliente' ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-pale)]' : 'border-[#EDE5DC] text-ink-soft'}`}>
              {tipo === 'cuenta_cobro' ? 'Proveedor existente' : 'Cliente existente'}
            </button>
            <button type="button" onClick={() => setModoDestinatario('manual')} className={`text-xs px-3 py-1.5 rounded-full border ${modoDestinatario === 'manual' ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-pale)]' : 'border-[#EDE5DC] text-ink-soft'}`}>Escribir manualmente</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {modoDestinatario === 'cliente' && (
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-ink-soft mb-1">
                  {tipo === 'cuenta_cobro' ? 'Proveedor existente' : 'Cliente existente'}
                </label>
                {tipo === 'cuenta_cobro' ? (
                  <select value={proveedorId} onChange={(e) => seleccionarProveedor(e.target.value)} className={inputClass}>
                    <option value="">Selecciona un proveedor</option>
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                ) : (
                  <select value={clienteId} onChange={(e) => seleccionarCliente(e.target.value)} className={inputClass}>
                    <option value="">Selecciona un cliente</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1">Nombre *</label>
              <input value={destinatarioNombre} onChange={(e) => setDestinatarioNombre(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1">NIT / Cédula del destinatario</label>
              <input
                type="text"
                value={destinatarioNit}
                onChange={(e) => setDestinatarioNit(e.target.value)}
                placeholder="900123456-1"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1">Email</label>
              <input value={destinatarioEmail} onChange={(e) => setDestinatarioEmail(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1">Teléfono</label>
              <input value={destinatarioTelefono} onChange={(e) => setDestinatarioTelefono(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1">Ciudad</label>
              <input value={destinatarioCiudad} onChange={(e) => setDestinatarioCiudad(e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>

        {tipo === 'cotizacion' ? (
          <div className="bg-white rounded-2xl border border-[#EDE5DC] p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-ink mb-3">Productos/Servicios</h2>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end bg-[#FAF6F0] border border-[#EDE5DC] rounded-xl p-3">
                  <div className="md:col-span-5">
                    <label className="block text-xs font-medium text-ink-soft mb-1">Descripción</label>
                    <div className="flex flex-col gap-1">
                      <select
                        value={it.manual ? 'manual' : it.producto_id ?? ''}
                        onChange={(e) => actualizarItem(i, 'producto_id', e.target.value)}
                        className={inputClass}
                      >
                        <option value="">— Seleccionar producto —</option>
                        {productos.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} · {formatCOP(p.precio_venta)}
                          </option>
                        ))}
                        <option value="manual">✏ Escribir manualmente</option>
                      </select>
                      {(it.manual || !it.producto_id) && (
                        <input
                          placeholder="Descripción del servicio o producto"
                          value={it.descripcion}
                          onChange={(e) => actualizarItem(i, 'descripcion', e.target.value)}
                          className={inputClass}
                        />
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2"><label className="block text-xs font-medium text-ink-soft mb-1">Cant</label><input type="number" min={0} value={it.cantidad} onChange={(e) => actualizarItem(i, 'cantidad', Number(e.target.value))} className={inputClass} /></div>
                  <div className="md:col-span-2"><label className="block text-xs font-medium text-ink-soft mb-1">Precio unit</label><input type="number" min={0} value={it.precio_unitario} onChange={(e) => actualizarItem(i, 'precio_unitario', Number(e.target.value))} className={inputClass} /></div>
                  <div className="md:col-span-2"><label className="block text-xs font-medium text-ink-soft mb-1">Subtotal</label><div className="px-3 py-2 rounded-lg border border-[#EDE5DC] bg-white text-sm text-ink">{formatCOP(it.subtotal)}</div></div>
                  <div className="md:col-span-1"><button type="button" onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))} className="text-xs text-red-500 hover:underline">×</button></div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setItems((prev) => [...prev, nuevoItem()])} className="mt-2 text-xs font-medium text-[var(--color-accent)] hover:underline">+ Agregar ítem</button>
            <div className="mt-4 bg-[#F9EDE5] rounded-xl p-4 border border-[#EDE5DC]">
              <div className="flex justify-between text-sm"><span className="text-ink-soft">Subtotal</span><span className="text-ink font-medium">{formatCOP(subtotal)}</span></div>
              <div className="flex justify-between items-center text-sm mt-2"><span className="text-ink-soft">Descuento (%)</span><input type="number" min={0} max={100} value={descuento} onChange={(e) => setDescuento(Number(e.target.value))} className="w-24 px-2 py-1 rounded-lg border border-[#EDE5DC] bg-white text-right" /></div>
              <div className="flex justify-between text-sm mt-2 pt-2 border-t border-[#EDE5DC]"><span className="text-ink font-semibold">Total</span><span className="text-[var(--color-primary)] font-bold">{formatCOP(total)}</span></div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 bg-white rounded-2xl border border-[#EDE5DC] p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-ink mb-3">Información del cobro</h2>
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1">Valor total</label>
              <input type="number" min={0} value={totalCuentaCobro} onChange={(e) => setTotalCuentaCobro(Number(e.target.value))} className={`${inputClass} text-lg font-semibold`} />
              <p className="text-xs text-ink-soft mt-1 italic">{numeroALetras(totalCuentaCobro)}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1">Concepto</label>
              <textarea value={concepto} onChange={(e) => setConcepto(e.target.value)} className={`${inputClass} min-h-[90px]`} />
            </div>
          </div>
        )}

        {tipo === 'cuenta_cobro' && (
          <div className="bg-white rounded-2xl border border-[#EDE5DC] p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-ink mb-3">Datos bancarios</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-ink-soft mb-1">Banco</label><input value={banco} onChange={(e) => setBanco(e.target.value)} className={inputClass} /></div>
              <div><label className="block text-xs font-medium text-ink-soft mb-1">Tipo de cuenta</label><select value={tipoCuenta} onChange={(e) => setTipoCuenta(e.target.value)} className={inputClass}><option value="Ahorros">Ahorros</option><option value="Corriente">Corriente</option><option value="Nequi">Nequi</option><option value="Daviplata">Daviplata</option></select></div>
              <div><label className="block text-xs font-medium text-ink-soft mb-1">Número de cuenta</label><input value={numeroCuenta} onChange={(e) => setNumeroCuenta(e.target.value)} className={inputClass} /></div>
              <div><label className="block text-xs font-medium text-ink-soft mb-1">Titular de la cuenta</label><input value={titularCuenta} onChange={(e) => setTitularCuenta(e.target.value)} className={inputClass} /></div>
              <div className="md:col-span-2"><label className="block text-xs font-medium text-ink-soft mb-1">Cédula del titular</label><input value={cedulaTitular} onChange={(e) => setCedulaTitular(e.target.value)} className={inputClass} /></div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white rounded-2xl border border-[#EDE5DC] p-5 shadow-sm">
          <div><label className="block text-xs font-medium text-ink-soft mb-1">Fecha del documento</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClass} /></div>
          <div><label className="block text-xs font-medium text-ink-soft mb-1">{tipo === 'cotizacion' ? 'Válida hasta' : 'Fecha de vencimiento'}</label><input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} className={inputClass} /></div>
          <div className="md:col-span-2"><label className="block text-xs font-medium text-ink-soft mb-1">Notas adicionales</label><textarea value={notas} onChange={(e) => setNotas(e.target.value)} className={`${inputClass} min-h-[90px]`} /></div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <Link href="/documentos" className="text-sm text-ink-soft hover:text-ink px-4 py-2 rounded-lg border border-[#EDE5DC]">Cancelar</Link>
          <button type="submit" className="btn-primary text-sm font-semibold px-4 py-2 rounded-lg" disabled={submitting}>{submitting ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </form>

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
