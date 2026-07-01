'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireEdit, requireDelete, requireFinanzas } from '@/lib/tienda-server'

async function getTiendaId() {
  const { tienda_id } = await requireEdit()
  return tienda_id
}

function normalizarNombre(v: FormDataEntryValue | null) {
  return String(v ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

function normalizarSku(v: FormDataEntryValue | null) {
  const s = String(v ?? '').trim()
  return s === '' ? null : s
}

async function assertNombreYSKUUnicos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tienda_id: string,
  nombre: string,
  sku: string | null,
  excluirProductoId?: string,
) {
  const base = () =>
    supabase.from('productos').select('id').eq('tienda_id', tienda_id).limit(1)

  const qNombre = base().ilike('nombre', nombre)
  const { data: dupNombre, error: e1 } = excluirProductoId
    ? await qNombre.neq('id', excluirProductoId)
    : await qNombre
  if (e1) return { error: e1.message as string }
  if (dupNombre && dupNombre.length > 0) {
    return {
      error: 'Ya existe otro producto con el mismo nombre en tu tienda.',
      warning: true as const,
    }
  }

  if (sku) {
    const qSku = base().eq('sku', sku)
    const { data: dupSku, error: e2 } = excluirProductoId
      ? await qSku.neq('id', excluirProductoId)
      : await qSku
    if (e2) return { error: e2.message as string }
    if (dupSku && dupSku.length > 0) {
      return {
        error: 'Ya existe otro producto con el mismo SKU en tu tienda.',
        warning: true as const,
      }
    }
  }

  return null
}

export async function crearProducto(formData: FormData) {
  try {
    const supabase = await createClient()
    const tienda_id = await getTiendaId()
    const nombre = normalizarNombre(formData.get('nombre'))
    const sku = normalizarSku(formData.get('sku'))
    if (!nombre) return { error: 'El nombre es obligatorio' }

    const duplicado = await assertNombreYSKUUnicos(supabase, tienda_id, nombre, sku)
    if (duplicado) return duplicado

    const precio_venta = Number(formData.get('precio_venta'))
    if (isNaN(precio_venta) || precio_venta < 0) {
      return { error: 'El precio de venta debe ser un número válido' }
    }
    const costo_raw = Number(formData.get('costo_produccion'))
    const costo_produccion = isNaN(costo_raw) || costo_raw <= 0 ? null : costo_raw

    const { data, error } = await supabase
      .from('productos')
      .insert({
        tienda_id,
        nombre,
        sku,
        tipo: formData.get('tipo') as string,
        precio_venta,
        costo_produccion,
        stock_minimo: Number(formData.get('stock_minimo')),
      })
      .select('id')
      .single()
    if (error) return { error: error.message }
    revalidatePath('/productos')
    return { ok: true, id: data.id }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function editarProducto(id: string, formData: FormData) {
  try {
    const supabase = await createClient()
    const tienda_id = await getTiendaId()
    const nombre = normalizarNombre(formData.get('nombre'))
    const sku = normalizarSku(formData.get('sku'))
    if (!nombre) return { error: 'El nombre es obligatorio' }

    const duplicado = await assertNombreYSKUUnicos(supabase, tienda_id, nombre, sku, id)
    if (duplicado) return duplicado

    const precio_venta = Number(formData.get('precio_venta'))
    if (isNaN(precio_venta) || precio_venta < 0) {
      return { error: 'El precio de venta debe ser un número válido' }
    }
    const costo_raw = Number(formData.get('costo_produccion'))
    const costo_produccion = isNaN(costo_raw) || costo_raw <= 0 ? null : costo_raw

    const estadoRaw = formData.get('estado') as string
    const estado = ['activo', 'archivado'].includes(estadoRaw) ? estadoRaw : undefined
    const { error } = await supabase
      .from('productos')
      .update({
        nombre,
        sku,
        tipo: formData.get('tipo') as string,
        precio_venta,
        costo_produccion,
        stock_minimo: Number(formData.get('stock_minimo')),
        ...(estado ? { estado } : {}),
      })
      .eq('id', id)
      .eq('tienda_id', tienda_id)
    if (error) return { error: error.message }
    revalidatePath('/productos')
    return { success: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function eliminarProducto(id: string) {
  try {
    const { tienda_id, supabase } = await requireDelete()
    const { error } = await supabase
      .from('productos')
      .delete()
      .eq('id', id)
      .eq('tienda_id', tienda_id)
    if (error) return { error: error.message }
    revalidatePath('/productos')
    return { success: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

// Ajuste manual del stock de un producto SIMPLE. Solo owner/admin (requireFinanzas),
// ya que corrige el valor del inventario. El stock de productos con variantes se
// edita por variante (producto_variantes.stock_actual), no aquí.
export async function ajustarStockProducto(producto_id: string, nuevoStock: number) {
  try {
    const { tienda_id, supabase } = await requireFinanzas()
    if (!Number.isFinite(nuevoStock) || nuevoStock < 0 || !Number.isInteger(nuevoStock)) {
      return { error: 'El stock debe ser un número entero mayor o igual a 0' }
    }
    const { data: variantes } = await supabase
      .from('producto_variantes')
      .select('id')
      .eq('tienda_id', tienda_id)
      .eq('producto_id', producto_id)
      .limit(1)
    if (variantes && variantes.length > 0) {
      return { error: 'Este producto tiene variantes: ajusta el stock de cada variante.' }
    }
    const { error } = await supabase
      .from('productos')
      .update({ stock_actual: nuevoStock })
      .eq('id', producto_id)
      .eq('tienda_id', tienda_id)
    if (error) return { error: error.message }
    revalidatePath('/productos')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

// Registrar unidades defectuosas ANTES de venderlas: descuenta stock e incrementa
// unidades_defectuosas. Para variantes, descuenta el stock de la variante y suma el
// defecto al producto padre (las variantes no tienen columna de defectuosas).
export async function registrarDefectuoso(
  producto_id: string,
  cantidad: number,
  variante_id?: string,
) {
  try {
    const { tienda_id, supabase } = await requireEdit()
    if (!Number.isFinite(cantidad) || cantidad < 1 || !Number.isInteger(cantidad)) {
      return { error: 'La cantidad debe ser un número entero mayor o igual a 1' }
    }

    if (variante_id) {
      const { data: variante } = await supabase
        .from('producto_variantes')
        .select('stock_actual')
        .eq('id', variante_id)
        .eq('tienda_id', tienda_id)
        .maybeSingle()
      if (!variante) return { error: 'Variante no encontrada' }
      if ((variante.stock_actual ?? 0) < cantidad) {
        return { error: `Stock insuficiente: solo hay ${variante.stock_actual ?? 0} uds.` }
      }
      await supabase.rpc('ajustar_stock_variante', { p_variante_id: variante_id, p_delta: -cantidad })
      // Suma el defecto al producto padre (stock del padre es 0, se mantiene).
      await supabase.rpc('registrar_defectuoso_producto', {
        p_producto_id: producto_id,
        p_cantidad: cantidad,
      })
    } else {
      const { data: prod } = await supabase
        .from('productos')
        .select('stock_actual')
        .eq('id', producto_id)
        .eq('tienda_id', tienda_id)
        .maybeSingle()
      if (!prod) return { error: 'Producto no encontrado' }
      if ((prod.stock_actual ?? 0) < cantidad) {
        return { error: `Stock insuficiente: solo hay ${prod.stock_actual ?? 0} uds.` }
      }
      await supabase.rpc('registrar_defectuoso_producto', {
        p_producto_id: producto_id,
        p_cantidad: cantidad,
      })
    }

    revalidatePath('/productos')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}
