-- Indices de rendimiento sobre columnas usadas en WHERE/JOIN/ORDER frecuentes.
-- Postgres NO indexa las foreign keys automaticamente, y casi todas las
-- consultas filtran por tienda_id (+ fecha) o joinean por *_id.
--
-- Idempotente (CREATE INDEX IF NOT EXISTS): seguro de re-correr y no choca con
-- indices existentes (p.ej. cuentas_por_pagar / cuotas_pago ya tienen los suyos).
--
-- Nota: CREATE INDEX toma un lock breve de escritura mientras construye. Para
-- esta escala es despreciable. Si alguna tabla fuera muy grande, ejecutar esa
-- linea aparte como CREATE INDEX CONCURRENTLY (fuera de transaccion).

-- ── Rutas calientes (corren en casi cada request) ──────────────────────────
CREATE INDEX IF NOT EXISTS idx_tiendas_owner_id            ON public.tiendas (owner_id);
CREATE INDEX IF NOT EXISTS idx_miembros_user_id            ON public.miembros (user_id);
CREATE INDEX IF NOT EXISTS idx_miembros_tienda_id          ON public.miembros (tienda_id);
CREATE INDEX IF NOT EXISTS idx_suscripciones_tienda_creado ON public.suscripciones (tienda_id, created_at DESC);

-- ── Ventas (reportes, dashboard, notificaciones) ───────────────────────────
CREATE INDEX IF NOT EXISTS idx_ventas_cabecera_tienda_fecha ON public.ventas_cabecera (tienda_id, fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_cabecera_cliente_id   ON public.ventas_cabecera (cliente_id);
CREATE INDEX IF NOT EXISTS idx_venta_items_cabecera_id      ON public.venta_items (cabecera_id);
CREATE INDEX IF NOT EXISTS idx_venta_items_tienda_creado    ON public.venta_items (tienda_id, created_at);
CREATE INDEX IF NOT EXISTS idx_venta_items_producto_id      ON public.venta_items (producto_id);

-- ── Inventario ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_productos_tienda_estado      ON public.productos (tienda_id, estado);
CREATE INDEX IF NOT EXISTS idx_producto_variantes_tienda    ON public.producto_variantes (tienda_id);
CREATE INDEX IF NOT EXISTS idx_producto_variantes_producto  ON public.producto_variantes (producto_id);
CREATE INDEX IF NOT EXISTS idx_entradas_tienda_fecha        ON public.entradas (tienda_id, fecha);
CREATE INDEX IF NOT EXISTS idx_entradas_producto_id         ON public.entradas (producto_id);

-- ── Finanzas / catalogos ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_gastos_tienda_fecha          ON public.gastos (tienda_id, fecha);
CREATE INDEX IF NOT EXISTS idx_clientes_tienda_id           ON public.clientes (tienda_id);
CREATE INDEX IF NOT EXISTS idx_proveedores_tienda_id        ON public.proveedores (tienda_id);
CREATE INDEX IF NOT EXISTS idx_medios_pago_tienda_id        ON public.medios_pago (tienda_id);
CREATE INDEX IF NOT EXISTS idx_documentos_tienda_id         ON public.documentos (tienda_id);
CREATE INDEX IF NOT EXISTS idx_devoluciones_tienda_mes      ON public.devoluciones_venta (tienda_id, mes_contable);
CREATE INDEX IF NOT EXISTS idx_devoluciones_venta_id        ON public.devoluciones_venta (venta_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_tienda_creado ON public.notificaciones (tienda_id, created_at DESC);

-- ── Tiendas aliadas (consignaciones) ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_consignatarias_tienda_id     ON public.tiendas_consignatarias (tienda_id);
CREATE INDEX IF NOT EXISTS idx_consig_salidas_tienda_id     ON public.consignacion_salidas (tienda_id);
CREATE INDEX IF NOT EXISTS idx_consignaciones_tienda_id     ON public.consignaciones (tienda_id);
CREATE INDEX IF NOT EXISTS idx_consignaciones_consignataria ON public.consignaciones (consignataria_id);
CREATE INDEX IF NOT EXISTS idx_consignaciones_salida_id     ON public.consignaciones (salida_id);
CREATE INDEX IF NOT EXISTS idx_consig_movs_consignacion     ON public.consignacion_movimientos (consignacion_id);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_tienda_id      ON public.liquidaciones (tienda_id);

-- ── Eventos ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_eventos_tienda_id            ON public.eventos (tienda_id);
CREATE INDEX IF NOT EXISTS idx_evento_inventario_evento     ON public.evento_inventario (evento_id);
CREATE INDEX IF NOT EXISTS idx_evento_ventas_evento         ON public.evento_ventas (evento_id);
CREATE INDEX IF NOT EXISTS idx_evento_gastos_evento         ON public.evento_gastos (evento_id);

-- ── Equipo / invitaciones ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_invitaciones_token           ON public.invitaciones (token);
