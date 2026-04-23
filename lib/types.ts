export interface Tienda {
  id: string
  owner_id: string
  nombre: string
  ciudad?: string
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
  stock_actual: number
  stock_minimo: number
  created_at: string
}

export interface Cliente {
  id: string
  tienda_id: string
  nombre: string
  telefono?: string
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

export interface Gasto {
  id: string
  tienda_id: string
  proveedor_id?: string
  descripcion: string
  monto: number
  categoria: 'Producción' | 'Empaque' | 'Envíos' | 'Marketing' | 'Plataformas' | 'Otro'
  fecha: string
  created_at: string
}

export interface VentaCabecera {
  id: string
  tienda_id: string
  cliente_id?: string
  canal: 'WhatsApp' | 'Instagram' | 'Web' | 'Presencial' | 'Tienda multimarca'
  plataforma_pago: 'Wompi' | 'Bold' | 'Transferencia' | 'Efectivo' | 'Nequi' | 'Daviplata' | 'Contraentrega'
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
