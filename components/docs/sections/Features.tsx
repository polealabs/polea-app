export default function Features() {
  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[2px] text-[#8A7D72]">Producto</p>
        <h1 className="font-serif text-3xl text-[#1A1510] mt-1">Módulos de la app</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          'Dashboard: KPIs, gráfico semanal, alertas de inventario y últimas ventas.',
          'Productos: CRUD, filtros chip (Todos/Agotado/Stock bajo), validación duplicados.',
          'Entradas de stock: registro, trigger automático y últimas 50 entradas.',
          'Ventas: multi-producto, 5 canales, 7 plataformas, cálculo neto y validación stock.',
          'Clientes: ficha, buscador y visibilidad de compras.',
          'Gastos: 6 categorías, selector de mes y resumen mensual.',
          'Proveedores: categorías múltiples, buscador e importación CSV con separador |.',
        ].map((item) => (
          <div key={item} className="bg-white rounded-2xl border border-[#EDE5DC] p-5 text-sm text-[#4A3F35]">
            {item}
          </div>
        ))}
      </div>
    </section>
  )
}
