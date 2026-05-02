-- Cuentas por pagar y cuotas (compras a crédito desde entradas)
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS notas text;

CREATE TABLE IF NOT EXISTS cuentas_por_pagar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tienda_id uuid NOT NULL REFERENCES tiendas (id) ON DELETE CASCADE,
  proveedor_id uuid REFERENCES proveedores (id) ON DELETE SET NULL,
  entrada_id uuid REFERENCES entradas (id) ON DELETE SET NULL,
  descripcion text NOT NULL,
  monto_total numeric NOT NULL CHECK (monto_total >= 0),
  monto_pagado numeric NOT NULL DEFAULT 0 CHECK (monto_pagado >= 0),
  fecha_vencimiento date,
  tipo_pago text NOT NULL CHECK (tipo_pago IN ('contado', 'contado_pendiente', 'cuotas')),
  numero_cuotas integer NOT NULL DEFAULT 1 CHECK (numero_cuotas >= 1),
  frecuencia_cuotas text CHECK (frecuencia_cuotas IN ('semanal', 'quincenal', 'mensual')),
  estado text NOT NULL CHECK (estado IN ('pendiente', 'parcial', 'pagada')),
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cuentas_por_pagar_tienda_estado ON cuentas_por_pagar (tienda_id, estado);
CREATE INDEX IF NOT EXISTS idx_cuentas_por_pagar_vencimiento ON cuentas_por_pagar (tienda_id, fecha_vencimiento);

CREATE TABLE IF NOT EXISTS cuotas_pago (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tienda_id uuid NOT NULL REFERENCES tiendas (id) ON DELETE CASCADE,
  cuenta_id uuid NOT NULL REFERENCES cuentas_por_pagar (id) ON DELETE CASCADE,
  numero_cuota integer NOT NULL CHECK (numero_cuota >= 1),
  monto numeric NOT NULL CHECK (monto >= 0),
  fecha_vencimiento date NOT NULL,
  fecha_pago date,
  estado text NOT NULL CHECK (estado IN ('pendiente', 'pagada')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cuenta_id, numero_cuota)
);

CREATE INDEX IF NOT EXISTS idx_cuotas_pago_tienda_estado ON cuotas_pago (tienda_id, estado);
CREATE INDEX IF NOT EXISTS idx_cuotas_pago_vencimiento ON cuotas_pago (tienda_id, fecha_vencimiento);
