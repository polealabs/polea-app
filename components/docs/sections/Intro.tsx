export default function Intro() {
  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[2px] text-[#8A7D72]">Introducción</p>
        <h1 className="font-serif text-3xl text-[#1A1510] mt-1">¿Qué es Polea?</h1>
      </header>

      <div className="bg-white rounded-2xl border border-[#EDE5DC] p-6 space-y-4">
        <p className="text-sm text-[#4A3F35] leading-relaxed">
          Polea es un SaaS administrativo para tiendas colombianas multicanal. Centraliza
          inventario, ventas, costos y gastos en una sola operación diaria.
        </p>
        <div>
          <p className="text-sm font-semibold text-[#1E3A2F] mb-2">Problemas que resuelve</p>
          <ul className="list-disc pl-5 text-sm text-[#4A3F35] space-y-1">
            <li>Inventario disperso o desactualizado entre canales.</li>
            <li>Finanzas operativas sin trazabilidad del neto real.</li>
            <li>Precios definidos sin considerar costos de transacción.</li>
            <li>Pedidos en WhatsApp/Instagram sin control consolidado.</li>
          </ul>
        </div>
        <p className="text-sm text-[#4A3F35]">
          <span className="font-semibold text-[#1E3A2F]">Diferenciador clave:</span> cálculo automático
          del costo por plataforma de pago para reflejar el neto real de cada venta.
        </p>
      </div>

      <div className="bg-[#F9EDE5] rounded-2xl border border-[#E8845A]/20 p-6">
        <p className="text-sm text-[#4A3F35]">
          <span className="font-semibold text-[#1E3A2F]">Caso 0:</span> Vaza Jewelry reemplazó 7 hojas de
          Google Sheets por un flujo único en Polea para vender, controlar stock y entender margen.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#EDE5DC] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#EDE5DC]">
          <h2 className="font-serif text-xl text-[#1A1510]">Comparativa rápida</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#FAF6F0] border-b border-[#EDE5DC]">
              <th className="text-left px-6 py-3 text-[#8A7D72] font-semibold">Plataforma</th>
              <th className="text-left px-6 py-3 text-[#8A7D72] font-semibold">Fortaleza</th>
              <th className="text-left px-6 py-3 text-[#8A7D72] font-semibold">Brecha vs Polea</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#EDE5DC]/70">
              <td className="px-6 py-3 text-[#1A1510]">Treinta</td>
              <td className="px-6 py-3 text-[#4A3F35]">Punto de venta simple</td>
              <td className="px-6 py-3 text-[#4A3F35]">Menor foco en neto multicanal</td>
            </tr>
            <tr className="border-b border-[#EDE5DC]/70">
              <td className="px-6 py-3 text-[#1A1510]">Siigo / Alegra</td>
              <td className="px-6 py-3 text-[#4A3F35]">Contabilidad formal</td>
              <td className="px-6 py-3 text-[#4A3F35]">Menor agilidad operativa diaria</td>
            </tr>
            <tr>
              <td className="px-6 py-3 text-[#1A1510]">Shopify / Tiendanube</td>
              <td className="px-6 py-3 text-[#4A3F35]">Ecommerce</td>
              <td className="px-6 py-3 text-[#4A3F35]">No cubre operación completa local</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
