export default function BaseDatos() {
  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[2px] text-[#8A7D72]">Técnico</p>
        <h1 className="font-serif text-3xl text-[#1A1510] mt-1">Base de datos</h1>
      </header>

      <div className="bg-white rounded-2xl border border-[#EDE5DC] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#FAF6F0] border-b border-[#EDE5DC]">
              <th className="text-left px-6 py-3 text-[#8A7D72] font-semibold">Tabla</th>
              <th className="text-left px-6 py-3 text-[#8A7D72] font-semibold">Uso</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['tiendas', 'Datos de cada negocio'],
              ['productos', 'Catálogo y niveles de stock'],
              ['entradas', 'Reposición de inventario'],
              ['ventas_cabecera', 'Resumen de cada venta'],
              ['venta_items', 'Detalle de productos por venta'],
              ['clientes', 'Base de clientes'],
              ['gastos', 'Registro de egresos'],
              ['proveedores', 'Directorio de abastecimiento'],
            ].map(([name, use]) => (
              <tr key={name} className="border-b border-[#EDE5DC]/70 last:border-b-0">
                <td className="px-6 py-3 text-[#1A1510] font-medium">{name}</td>
                <td className="px-6 py-3 text-[#4A3F35]">{use}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-2xl border border-[#EDE5DC] p-6 text-sm text-[#4A3F35] space-y-2">
        <p>
          Trigger 1: <strong>entrada -&gt; suma stock</strong>.
        </p>
        <p>
          Trigger 2: <strong>venta -&gt; resta stock</strong>.
        </p>
      </div>

      <div className="bg-[#F9EDE5] border border-[#E8845A]/20 rounded-2xl p-6">
        <p className="text-sm text-[#4A3F35]">
          <strong className="text-[#1E3A2F]">Nota crítica:</strong> el stock nunca se calcula en frontend;
          se mantiene como fuente de verdad en la base de datos.
        </p>
      </div>
    </section>
  )
}
