-- IVA opcional (aditivo, tasa general 19%) por negocio y por tienda aliada.
--
-- Modelo: el IVA se SUMA encima del precio base. Es un recaudo a favor de la
-- DIAN, NO es ingreso del negocio, por lo que NO entra al P&L (ventas netas,
-- utilidades y margenes no cambian); solo se registra y se muestra aparte.
--
--   tiendas.cobra_iva                 -> el negocio cobra IVA en sus ventas
--   tiendas_consignatarias.cobra_iva  -> la tienda aliada cobra IVA al liquidar
--   ventas_cabecera.iva               -> IVA recaudado en la venta
--   consignacion_movimientos.iva      -> IVA recaudado en una liquidacion/devolucion
--   liquidaciones.iva                 -> IVA recaudado en una liquidacion masiva
--
-- Idempotente (ADD COLUMN IF NOT EXISTS).

ALTER TABLE public.tiendas
  ADD COLUMN IF NOT EXISTS cobra_iva boolean NOT NULL DEFAULT false;

ALTER TABLE public.tiendas_consignatarias
  ADD COLUMN IF NOT EXISTS cobra_iva boolean NOT NULL DEFAULT false;

ALTER TABLE public.ventas_cabecera
  ADD COLUMN IF NOT EXISTS iva numeric NOT NULL DEFAULT 0;

ALTER TABLE public.consignacion_movimientos
  ADD COLUMN IF NOT EXISTS iva numeric NOT NULL DEFAULT 0;

ALTER TABLE public.liquidaciones
  ADD COLUMN IF NOT EXISTS iva numeric NOT NULL DEFAULT 0;
