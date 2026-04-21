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
