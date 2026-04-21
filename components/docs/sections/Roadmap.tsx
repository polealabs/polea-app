export default function Roadmap() {
  const items = [
    'Calculadora IA de precio sugerido',
    'P&L mensual automático',
    'Soporte de consignación',
    'Alertas IA proactivas',
    'Integración Shopify',
    'Integración DIAN',
    'Suscripciones con Wompi',
  ]

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[2px] text-[#8A7D72]">Guía</p>
        <h1 className="font-serif text-3xl text-[#1A1510] mt-1">Roadmap</h1>
      </header>

      <div className="bg-white rounded-2xl border border-[#EDE5DC] p-6">
        <ul className="list-disc pl-5 text-sm text-[#4A3F35] space-y-1">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="bg-[#FBF3E0] border border-[#D4A853]/40 rounded-2xl p-6">
        <p className="text-sm text-[#4A3F35]">
          <span className="font-semibold text-[#D4A853]">Nota Pro:</span> estas capacidades formarán
          parte del acceso avanzado del plan Pro.
        </p>
      </div>
    </section>
  )
}
