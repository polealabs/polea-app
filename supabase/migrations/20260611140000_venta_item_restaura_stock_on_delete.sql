-- Restaura stock al eliminar una venta.
--
-- venta_items tenia solo trg_venta_item_resta_stock (AFTER INSERT, descuenta),
-- sin contraparte en DELETE. eliminarVenta borra la ventas_cabecera y los
-- venta_items se cascadean (FK cabecera_id ON DELETE CASCADE), pero el stock
-- nunca se devolvia -> el inventario quedaba descontado de menos en cada venta
-- eliminada.
--
-- Este trigger es el espejo del de INSERT y maneja variantes igual:
-- si la linea tiene variante_id restaura producto_variantes, si no, productos.

CREATE OR REPLACE FUNCTION public.fn_venta_item_suma_stock()
RETURNS trigger LANGUAGE plpgsql AS $function$
begin
  if OLD.variante_id is not null then
    update producto_variantes
    set stock_actual = stock_actual + OLD.cantidad
    where id = OLD.variante_id;
  else
    update productos
    set stock_actual = stock_actual + OLD.cantidad
    where id = OLD.producto_id;
  end if;
  return OLD;
end;
$function$;

DROP TRIGGER IF EXISTS trg_venta_item_suma_stock ON venta_items;
CREATE TRIGGER trg_venta_item_suma_stock
  AFTER DELETE ON venta_items
  FOR EACH ROW EXECUTE FUNCTION public.fn_venta_item_suma_stock();
