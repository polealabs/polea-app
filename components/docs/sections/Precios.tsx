export default function Precios() {
  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[2px] text-[#8A7D72]">Producto</p>
        <h1 className="font-serif text-3xl text-[#1A1510] mt-1">Planes y precios</h1>
      </header>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#EDE5DC] rounded-2xl p-6">
          <p className="text-sm text-[#8A7D72]">Plan Básico</p>
          <p className="font-serif text-3xl text-[#1A1510] mt-1">$49.000</p>
          <p className="text-xs text-[#8A7D72] mt-1">COP / mes</p>
        </div>
        <div className="bg-[#F9EDE5] border border-[#E8845A]/30 rounded-2xl p-6">
          <p className="text-sm text-[#C4622D] font-semibold">Plan Pro</p>
          <p className="font-serif text-3xl text-[#1A1510] mt-1">$89.000</p>
          <p className="text-xs text-[#8A7D72] mt-1">COP / mes (destacado)</p>
        </div>
        <div className="bg-white border border-[#EDE5DC] rounded-2xl p-6">
          <p className="text-sm text-[#8A7D72]">Plan Anual</p>
          <p className="font-serif text-3xl text-[#1A1510] mt-1">2 meses</p>
          <p className="text-xs text-[#8A7D72] mt-1">gratis en pago anual</p>
        </div>
      </div>

      <div className="bg-[#FBF3E0] border border-[#D4A853]/30 rounded-2xl p-6">
        <p className="text-sm text-[#4A3F35]">
          <span className="font-semibold text-[#1E3A2F]">Meta MRR:</span> $445.000 COP (
          5 clientes x $89.000 en plan Pro).
        </p>
      </div>
    </section>
  )
}
