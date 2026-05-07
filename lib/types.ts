export interface Tienda {
  id: string
  owner_id: string
  nombre: string
  ciudad?: string
  nit?: string
  representante?: string
  telefono?: string
  email?: string
  direccion?: string
  logo_url?: string
  categoria?: string
  whatsapp?: string
  moneda?: string
  tema?: string
  created_at: string
}

export type Rol = 'owner' | 'admin' | 'vendedor' | 'readonly'

export interface Miembro {
  id: string
  tienda_id: string
  user_id: string
  rol: Rol
  email?: string
  invitado_por?: string
  created_at: string
}

export interface Invitacion {
  id: string
  tienda_id: string
  email: string
  rol: Rol
  token: string
  aceptada: boolean
  expires_at: string
  created_at: string
}

export interface Producto {
  id: string
  tienda_id: string
  nombre: string
  sku?: string
  tipo: 'Producto terminado' | 'Materia prima' | 'Empaque' | 'Material POP'
  foto_url?: string
  precio_venta: number
  costo_produccion?: number
  stock_actual: number
  stock_minimo: number
  tiene_variantes?: boolean
  unidades_defectuosas?: number
  created_at: string
}

export interface ProductoAtributo {
  id: string
  tienda_id: string
  producto_id: string
  nombre: string
  created_at: string
}

export interface ProductoVariante {
  id: string
  tienda_id: string
  producto_id: string
  nombre: string
  atributos: Record<string, string>
  precio_venta?: number
  costo_produccion?: number
  stock_actual: number
  stock_minimo: number
  sku?: string
  activa: boolean
  created_at: string
}

export interface Cliente {
  id: string
  tienda_id: string
  nombre: string
  telefono?: string
  direccion?: string
  ciudad?: string
  correo?: string
  fecha_creacion?: string
  created_at: string
}

export interface Entrada {
  id: string
  tienda_id: string
  producto_id: string
  proveedor_id?: string
  cantidad: number
  costo_unitario: number
  fecha: string
  notas?: string
  created_at: string
}

export type TipoPago = 'contado' | 'contado_pendiente' | 'cuotas'
export type FrecuenciaCuota = 'semanal' | 'quincenal' | 'mensual'
export type EstadoCuentaPagar = 'pendiente' | 'parcial' | 'pagada'

export interface CuentaPorPagar {
  id: string
  tienda_id: string
  proveedor_id?: string
  entrada_id?: string
  descripcion: string
  monto_total: number
  monto_pagado: number
  fecha_vencimiento?: string
  tipo_pago: TipoPago
  numero_cuotas: number
  frecuencia_cuotas?: FrecuenciaCuota
  estado: EstadoCuentaPagar
  notas?: string
  created_at: string
}

export interface CuotaPago {
  id: string
  tienda_id: string
  cuenta_id: string
  numero_cuota: number
  monto: number
  fecha_vencimiento: string
  fecha_pago?: string
  estado: 'pendiente' | 'pagada'
  created_at: string
}

export interface Venta {
  id: string
  tienda_id: string
  producto_id: string
  cliente_id?: string
  cantidad: number
  precio_venta: number
  canal: 'WhatsApp' | 'Instagram' | 'Web' | 'Presencial' | 'Tienda multimarca'
  plataforma_pago:
    | 'Wompi'
    | 'Bold'
    | 'Transferencia'
    | 'Efectivo'
    | 'Nequi'
    | 'Daviplata'
    | 'Contraentrega'
  costo_transaccion: number
  neto: number
  fecha: string
  created_at: string
}

export type TipoGasto = 'variable' | 'fijo' | 'financiero' | 'compra_inventario'

export const CATEGORIAS_GASTO: Record<TipoGasto, { label: string; subcategorias: string[] }> = {
  variable: {
    label: 'Gasto variable',
    subcategorias: [
      'Empaques y materiales',
      'Envíos y transporte',
      'Comisiones de ventas',
      'Pasarelas de pago',
      'Insumos de producción',
      'Otro variable',
    ],
  },
  fijo: {
    label: 'Gasto fijo',
    subcategorias: [
      'Arriendo',
      'Nómina / honorarios',
      'Publicidad y pauta digital',
      'Fotografía y contenido',
      'Suscripciones y software',
      'Ferias y eventos',
      'Otro fijo',
    ],
  },
  financiero: {
    label: 'Gasto financiero',
    subcategorias: ['Intereses de crédito', 'Cuota de préstamo', 'Otro financiero'],
  },
  compra_inventario: {
    label: 'Compra de inventario',
    subcategorias: ['Materia prima', 'Producto terminado', 'Insumos', 'Otro'],
  },
}

export interface Gasto {
  id: string
  tienda_id: string
  descripcion: string
  monto: number
  fecha: string
  categoria: string
  tipo_gasto?: TipoGasto
  subcategoria?: string
  proveedor_id?: string
  created_at: string
}

export interface VentaCabecera {
  id: string
  tienda_id: string
  cliente_id?: string
  canal: 'WhatsApp' | 'Instagram' | 'Web' | 'Presencial' | 'Tienda multimarca'
  plataforma_pago: 'Wompi' | 'Bold' | 'Transferencia' | 'Efectivo' | 'Nequi' | 'Daviplata' | 'Contraentrega'
  medio_pago_id?: string
  envio?: number
  fecha: string
  total_bruto: number
  total_costo_transaccion: number
  total_neto: number
  created_at: string
}

export interface VentaItem {
  id: string
  cabecera_id: string
  tienda_id: string
  producto_id: string
  variante_id?: string
  variante_nombre?: string
  cantidad: number
  precio_venta: number
  descuento: number
  costo_transaccion: number
  neto: number
  created_at: string
}

export interface Proveedor {
  id: string
  tienda_id: string
  nombre: string
  categorias?: string[]
  telefono?: string
  nit?: string
  ciudad?: string
  created_at: string
}

export type TipoDocumento = 'cotizacion' | 'cuenta_cobro'
export type EstadoDocumento = 'borrador' | 'enviado' | 'aceptado' | 'rechazado' | 'pagado'

export interface ItemDocumento {
  descripcion: string
  cantidad: number
  precio_unitario: number
  subtotal: number
}

export interface Documento {
  id: string
  tienda_id: string
  tipo: TipoDocumento
  numero: string
  cliente_id?: string
  destinatario_nombre: string
  destinatario_nit?: string
  destinatario_email?: string
  destinatario_telefono?: string
  destinatario_ciudad?: string
  concepto?: string
  items: ItemDocumento[]
  subtotal: number
  descuento: number
  total: number
  banco?: string
  tipo_cuenta?: string
  numero_cuenta?: string
  titular_cuenta?: string
  cedula_titular?: string
  fecha: string
  fecha_vencimiento?: string
  estado: EstadoDocumento
  notas?: string
  created_at: string
}

export interface TiendaConsignataria {
  id: string
  tienda_id: string
  nombre: string
  contacto?: string
  telefono?: string
  ciudad?: string
  nit?: string
  porcentaje_comision: number
  activa: boolean
  created_at: string
}

export interface Consignacion {
  id: string
  tienda_id: string
  consignataria_id: string
  salida_id?: string
  producto_id: string
  cantidad: number
  unidades_disponibles: number
  costo_unitario: number
  fecha: string
  estado: 'activa' | 'liquidada' | 'devuelta'
  created_at: string
}

export interface ConsignacionSalida {
  id: string
  tienda_id: string
  consignataria_id: string
  fecha: string
  notas?: string
  created_at: string
}

export interface ConsignacionMovimiento {
  id: string
  tienda_id: string
  consignacion_id: string
  tipo: 'devolucion' | 'liquidacion'
  cantidad: number
  precio_venta?: number
  total_bruto?: number
  comision?: number
  neto?: number
  fecha: string
  notas?: string
  created_at: string
}

export interface Perfil {
  id: string
  nombre?: string
  updated_at: string
}

export interface Liquidacion {
  id: string
  tienda_id: string
  consignataria_id: string
  fecha: string
  mes: string
  total_vendido: number
  porcentaje_comision: number
  comision: number
  neto: number
  notas?: string
  consignaciones_ids: string[]
  created_at: string
}

export type TipoDevolucion = 'defectuoso' | 'cambio'
export type ResolucionDevolucion = 'reembolso' | 'credito' | 'cambio_mismo' | 'cambio_otro'

export interface DevolucionVenta {
  id: string
  tienda_id: string
  venta_id: string
  fecha: string
  tipo: TipoDevolucion
  resolucion: ResolucionDevolucion
  producto_original_id: string
  cantidad: number
  precio_original: number
  producto_cambio_id?: string
  precio_cambio?: number
  diferencia: number
  motivo?: string
  notas?: string
  mes_contable: string
  created_at: string
}

export type TipoMedioPago =
  | 'efectivo'
  | 'transferencia'
  | 'datafono'
  | 'pasarela_web'
  | 'cuotas'
  | 'contraentrega'
  | 'nequi_daviplata'

export interface MedioPago {
  id: string
  tienda_id: string
  nombre: string
  tipo: TipoMedioPago
  comision_porcentaje: number
  tarifa_fija: number
  cobra_iva: boolean
  activo: boolean
  created_at: string
}
