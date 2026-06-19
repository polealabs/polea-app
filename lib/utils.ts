/** Tasa general de IVA en Colombia (19%). El IVA es opcional por negocio/tienda aliada. */
export const TASA_IVA = 0.19

export function calcularCostoTransaccion(
  plataforma: string,
  precioVenta: number
): number {
  switch (plataforma) {
    case 'Wompi':
      return Math.round(precioVenta * 0.0299 + 900)
    case 'Bold':
      return Math.round(precioVenta * 0.0299)
    case 'Transferencia':
      return 0
    case 'Efectivo':
      return 0
    case 'Nequi':
      return 0
    case 'Daviplata':
      return 0
    case 'Contraentrega':
      return 0
    default:
      return 0
  }
}

export function calcularNeto(
  precioVenta: number,
  costoTransaccion: number
): number {
  return precioVenta - costoTransaccion
}

export function calcularNetoConDescuento(
  precioVenta: number,
  cantidad: number,
  descuentoPct: number,
  plataforma: string
): { bruto: number; descuentoTotal: number; baseNeta: number; costoTransaccion: number; neto: number } {
  const bruto = precioVenta * cantidad
  const descuentoTotal = Math.round(bruto * (descuentoPct / 100))
  const baseNeta = bruto - descuentoTotal
  const costoTransaccion = calcularCostoTransaccion(plataforma, baseNeta)
  const neto = calcularNeto(baseNeta, costoTransaccion)
  return { bruto, descuentoTotal, baseNeta, costoTransaccion, neto }
}

/** Formatea un número como pesos colombianos sin decimales. Null-safe. */
export function formatCOP(n: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(n || 0)
}

/** Supabase devuelve una relación to-one como objeto o (a veces) array; normaliza a objeto. */
export function unwrapRelacion<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null
  return Array.isArray(rel) ? (rel[0] ?? null) : rel
}

/** Fecha calendario local en YYYY-MM-DD (evita desfase UTC con toISOString). */
export function toLocalISODateString(d: Date = new Date()) {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

/** Mes calendario local en YYYY-MM. */
export function toLocalISOYearMonthString(d: Date = new Date()) {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 7)
}

export function calcularComisionMedioPago(
  subtotal: number,
  envio: number,
  medio: { comision_porcentaje: number; tarifa_fija: number; cobra_iva: boolean }
): {
  base_comision: number
  comision_base: number
  iva_comision: number
  comision_total: number
  neto: number
} {
  const base_comision = subtotal + envio
  const comision_base = Math.round(base_comision * (medio.comision_porcentaje / 100)) + medio.tarifa_fija
  const iva_comision = medio.cobra_iva ? Math.round(comision_base * 0.19) : 0
  const comision_total = comision_base + iva_comision
  const neto = base_comision - comision_total

  return { base_comision, comision_base, iva_comision, comision_total, neto }
}
