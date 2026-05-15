-- Variante opcional por línea de inventario de evento
ALTER TABLE evento_inventario
  ADD COLUMN IF NOT EXISTS variante_id UUID REFERENCES producto_variantes (id);
