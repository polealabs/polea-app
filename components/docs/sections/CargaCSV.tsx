export default function CargaCSV() {
  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[2px] text-[#8A7D72]">Guía</p>
        <h1 className="font-serif text-3xl text-[#1A1510] mt-1">Carga masiva CSV</h1>
      </header>

      <div className="bg-white rounded-2xl border border-[#EDE5DC] p-6">
        <ul className="list-disc pl-5 text-sm text-[#4A3F35] space-y-1">
          <li>Detección automática de separador (coma o punto y coma).</li>
          <li>Normalización de fechas en múltiples formatos.</li>
          <li>Limpieza de BOM y encabezados.</li>
          <li>Validación fila por fila con mensajes legibles.</li>
          <li>Reporte final con conteo de importados y errores.</li>
        </ul>
      </div>

      <div className="bg-white rounded-2xl border border-[#EDE5DC] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#FAF6F0] border-b border-[#EDE5DC]">
              <th className="text-left px-6 py-3 text-[#8A7D72] font-semibold">Módulo</th>
              <th className="text-left px-6 py-3 text-[#8A7D72] font-semibold">Particularidad</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#EDE5DC]/70">
              <td className="px-6 py-3 text-[#1A1510] font-medium">Ventas</td>
              <td className="px-6 py-3 text-[#4A3F35]">Usa venta_id para agrupar múltiples productos.</td>
            </tr>
            <tr>
              <td className="px-6 py-3 text-[#1A1510] font-medium">Proveedores</td>
              <td className="px-6 py-3 text-[#4A3F35]">
                Usa separador | para múltiples categorías.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
