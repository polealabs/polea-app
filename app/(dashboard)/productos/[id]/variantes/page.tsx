'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTienda } from '@/lib/hooks/useTienda'
import type { ProductoVariante } from '@/lib/types'

type ProductoBasico = {
  id: string
  nombre: string
  precio_venta?: number
  costo_produccion?: number
}

export default function VariantesProductoPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id
  const { tienda } = useTienda()

  const [producto, setProducto] = useState<ProductoBasico | null>(null)
  const [variantes, setVariantes] = useState<ProductoVariante[]>([])
  const [atributos, setAtributos] = useState<{ nombre: string; valores: string[] }[]>([])
  const [loading, setLoading] = useState(true)
  const [showFormAtributo, setShowFormAtributo] = useState(false)
  const [nuevoAtributo, setNuevoAtributo] = useState('')
  const [nuevosValores, setNuevosValores] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  const cargarTodo = useCallback(async () => {
    if (!id) return
    setLoading(true)

    const { data: prod } = await supabase.from('productos').select('*').eq('id', id).single()
    setProducto(prod as ProductoBasico)

    await supabase.from('producto_atributos').select('*').eq('producto_id', id).order('created_at')

    const { data: vars } = await supabase
      .from('producto_variantes')
      .select('*')
      .eq('producto_id', id)
      .eq('activa', true)
      .order('nombre')

    const varsList = (vars ?? []) as ProductoVariante[]
    setVariantes(varsList)

    if (varsList.length > 0) {
      const attrMap = new Map<string, Set<string>>()
      varsList.forEach((v) => {
        Object.entries((v.atributos ?? {}) as Record<string, string>).forEach(([key, val]) => {
          if (!attrMap.has(key)) attrMap.set(key, new Set())
          attrMap.get(key)!.add(val)
        })
      })
      setAtributos(
        [...attrMap.entries()].map(([nombre, valores]) => ({
          nombre,
          valores: [...valores],
        })),
      )
    } else {
      setAtributos([])
    }

    setLoading(false)
  }, [id, supabase])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void cargarTodo()
    }, 0)
    return () => window.clearTimeout(t)
  }, [cargarTodo])

  function generarCombinaciones(attrs: { nombre: string; valores: string[] }[]): Record<string, string>[] {
    if (attrs.length === 0) return []
    const result: Record<string, string>[] = [{}]
    for (const attr of attrs) {
      const nuevas: Record<string, string>[] = []
      for (const combo of result) {
        for (const valor of attr.valores) {
          nuevas.push({ ...combo, [attr.nombre]: valor })
        }
      }
      result.splice(0, result.length, ...nuevas)
    }
    return result
  }

  async function agregarAtributo() {
    if (!nuevoAtributo.trim() || !nuevosValores.trim() || !tienda || !id) return
    setGuardando(true)
    setError(null)

    const valores = nuevosValores
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)

    const nuevosAtributosState = [...atributos, { nombre: nuevoAtributo.trim(), valores }]
    const combinaciones = generarCombinaciones(nuevosAtributosState)

    await supabase.from('producto_atributos').upsert({
      tienda_id: tienda.id,
      producto_id: id,
      nombre: nuevoAtributo.trim(),
    })

    const variantesExistentes = new Set(variantes.map((v) => JSON.stringify(v.atributos)))
    const variantesNuevas = combinaciones.filter((combo) => !variantesExistentes.has(JSON.stringify(combo)))

    if (variantesNuevas.length > 0) {
      const inserts = variantesNuevas.map((combo) => ({
        tienda_id: tienda.id,
        producto_id: id,
        nombre: Object.values(combo).join(' / '),
        atributos: combo,
        precio_venta: producto?.precio_venta ?? 0,
        costo_produccion: producto?.costo_produccion ?? null,
        stock_actual: 0,
        stock_minimo: 0,
        activa: true,
      }))

      const { error: errInsert } = await supabase.from('producto_variantes').insert(inserts)
      if (errInsert) {
        setError(errInsert.message)
        setGuardando(false)
        return
      }
    }

    setAtributos(nuevosAtributosState)
    setNuevoAtributo('')
    setNuevosValores('')
    setShowFormAtributo(false)

    const { data: vars } = await supabase
      .from('producto_variantes')
      .select('*')
      .eq('producto_id', id)
      .eq('activa', true)
      .order('nombre')
    setVariantes((vars ?? []) as ProductoVariante[])
    setGuardando(false)
  }

  async function actualizarVariante(
    varianteId: string,
    campo: 'precio_venta' | 'stock_actual' | 'stock_minimo' | 'sku',
    valor: number | string,
  ) {
    await supabase.from('producto_variantes').update({ [campo]: valor }).eq('id', varianteId)
    setVariantes((prev) => prev.map((v) => (v.id === varianteId ? { ...v, [campo]: valor } : v)))
  }

  async function desactivarVariante(varianteId: string) {
    await supabase.from('producto_variantes').update({ activa: false }).eq('id', varianteId)
    setVariantes((prev) => prev.filter((v) => v.id !== varianteId))
  }

  if (loading) {
    return <div className="p-6 text-sm text-[#8A7D72]">Cargando variantes...</div>
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto" style={{ background: 'var(--color-background)' }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs text-[#8A7D72] mb-1">Inventario / {producto?.nombre ?? 'Producto'} / Variantes</p>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
            Variantes del producto
          </h1>
        </div>
        <button
          type="button"
          onClick={() => router.push('/productos')}
          className="text-sm font-medium hover:underline"
          style={{ color: 'var(--color-accent)' }}
        >
          Volver
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#EDE5DC] p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            Atributos actuales
          </h2>
          <button
            type="button"
            onClick={() => setShowFormAtributo((s) => !s)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--color-accent)', color: 'white' }}
          >
            + Agregar atributo
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {atributos.length > 0 ? (
            atributos.map((a) => (
              <span
                key={a.nombre}
                className="text-xs px-3 py-1.5 rounded-full border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                {a.nombre}: {a.valores.join(', ')}
              </span>
            ))
          ) : (
            <p className="text-xs text-[#8A7D72]">Sin atributos configurados todavia.</p>
          )}
        </div>

        {showFormAtributo && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-[#EDE5DC]">
            <input
              type="text"
              value={nuevoAtributo}
              onChange={(e) => setNuevoAtributo(e.target.value)}
              placeholder="Talla, Color, Tamano"
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--color-border)' }}
            />
            <input
              type="text"
              value={nuevosValores}
              onChange={(e) => setNuevosValores(e.target.value)}
              placeholder="S, M, L, XL"
              className="w-full px-3 py-2 rounded-lg border text-sm md:col-span-2"
              style={{ borderColor: 'var(--color-border)' }}
            />
            <div className="md:col-span-3 flex justify-end">
              <button
                type="button"
                onClick={() => void agregarAtributo()}
                disabled={guardando}
                className="text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
                style={{ background: 'var(--color-accent)', color: 'white' }}
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg mb-4">{error}</p>}

      {variantes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#EDE5DC] p-8 text-sm text-[#8A7D72]">
          Este producto no tiene variantes todavia. Agrega un atributo como Talla o Color para comenzar.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#EDE5DC] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="border-b border-[#EDE5DC]">
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-[#8A7D72]">Variante</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-[#8A7D72]">SKU</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-[#8A7D72]">Precio</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-[#8A7D72]">Stock</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-[#8A7D72]">Stock minimo</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-[#8A7D72]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {variantes.map((v) => (
                  <tr key={v.id} className="border-b border-[#EDE5DC]/70 last:border-0">
                    <td className="px-4 py-3 font-medium text-sm" style={{ color: 'var(--color-text)' }}>
                      {v.nombre}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        defaultValue={v.sku ?? ''}
                        onBlur={(e) => void actualizarVariante(v.id, 'sku', e.target.value)}
                        className="w-20 px-2 py-1 text-xs rounded border"
                        style={{ borderColor: 'var(--color-border)' }}
                        placeholder="SKU"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        defaultValue={v.precio_venta ?? producto?.precio_venta ?? 0}
                        onBlur={(e) => void actualizarVariante(v.id, 'precio_venta', Number(e.target.value))}
                        className="w-28 px-2 py-1 text-xs rounded border"
                        style={{ borderColor: 'var(--color-border)' }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        defaultValue={v.stock_actual}
                        onBlur={(e) => void actualizarVariante(v.id, 'stock_actual', Number(e.target.value))}
                        className="w-20 px-2 py-1 text-xs rounded border"
                        style={{ borderColor: 'var(--color-border)' }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        defaultValue={v.stock_minimo}
                        onBlur={(e) => void actualizarVariante(v.id, 'stock_minimo', Number(e.target.value))}
                        className="w-20 px-2 py-1 text-xs rounded border"
                        style={{ borderColor: 'var(--color-border)' }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => void desactivarVariante(v.id)} className="text-xs text-red-500 hover:underline">
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
