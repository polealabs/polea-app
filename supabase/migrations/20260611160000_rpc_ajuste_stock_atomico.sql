-- Funciones para ajustar stock de forma ATOMICA y evitar condiciones de carrera.
--
-- Varios flujos (entradas, consignaciones, devoluciones, cierre de evento)
-- hacian read-modify-write desde JS: leian stock_actual, calculaban el nuevo
-- valor y lo escribian. Bajo concurrencia, dos operaciones leen el mismo valor
-- y una pisa a la otra (lost update). Estas funciones hacen el ajuste en una
-- sola sentencia UPDATE (atomica a nivel de fila).
--
-- SECURITY INVOKER (default): corren con los permisos y RLS del usuario que
-- llama, asi que el aislamiento por tienda (politicas *_tenant_rls) sigue
-- aplicando; un usuario solo puede ajustar stock de su propia tienda.
--
-- El clamp con greatest(0, ...) replica el Math.max(0, ...) que ya hacia el
-- codigo (el stock nunca queda negativo).

CREATE OR REPLACE FUNCTION public.ajustar_stock_producto(p_producto_id uuid, p_delta numeric)
RETURNS void LANGUAGE sql AS $$
  UPDATE public.productos
  SET stock_actual = GREATEST(0, stock_actual + p_delta)
  WHERE id = p_producto_id;
$$;

CREATE OR REPLACE FUNCTION public.ajustar_stock_variante(p_variante_id uuid, p_delta numeric)
RETURNS void LANGUAGE sql AS $$
  UPDATE public.producto_variantes
  SET stock_actual = GREATEST(0, stock_actual + p_delta)
  WHERE id = p_variante_id;
$$;

-- Devolucion por defectuoso: descuenta stock y suma a unidades_defectuosas
-- en una sola sentencia (ambas columnas atomicas).
CREATE OR REPLACE FUNCTION public.registrar_defectuoso_producto(p_producto_id uuid, p_cantidad numeric)
RETURNS void LANGUAGE sql AS $$
  UPDATE public.productos
  SET stock_actual = GREATEST(0, stock_actual - p_cantidad),
      unidades_defectuosas = COALESCE(unidades_defectuosas, 0) + p_cantidad
  WHERE id = p_producto_id;
$$;

GRANT EXECUTE ON FUNCTION public.ajustar_stock_producto(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ajustar_stock_variante(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_defectuoso_producto(uuid, numeric) TO authenticated;
