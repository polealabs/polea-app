export default function QuickStart() {
  const steps = [
    'Crea tu cuenta',
    'Configura tu tienda (onboarding)',
    'Carga tus productos (CSV o manual)',
    'Registra entradas de stock',
    'Registra tu primera venta',
  ]

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[2px] text-[#8A7D72]">Guía</p>
        <h1 className="font-serif text-3xl text-[#1A1510] mt-1">Quickstart</h1>
      </header>

      <div className="bg-white rounded-2xl border border-[#EDE5DC] p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {steps.map((step, idx) => (
            <div key={step} className="rounded-xl border border-[#EDE5DC] p-4 bg-[#FAF6F0]">
              <span className="inline-flex w-7 h-7 items-center justify-center rounded-full bg-[#C4622D] text-white text-xs font-semibold">
                {idx + 1}
              </span>
              <p className="text-sm text-[#1A1510] mt-2">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
