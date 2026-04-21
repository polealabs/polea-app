const colors = [
  ['forest', '#1E3A2F', 'Sidebar, headers', 'bg-[#1E3A2F]'],
  ['terra', '#C4622D', 'Botones principales y acentos', 'bg-[#C4622D]'],
  ['terra-light', '#E8845A', 'Hover / estados activos', 'bg-[#E8845A]'],
  ['terra-pale', '#F9EDE5', 'Fondos de alertas', 'bg-[#F9EDE5]'],
  ['gold', '#D4A853', 'Acentos Pro', 'bg-[#D4A853]'],
  ['cream', '#FAF6F0', 'Fondo general', 'bg-[#FAF6F0]'],
  ['ink', '#1A1510', 'Texto principal', 'bg-[#1A1510]'],
]

export default function Diseno() {
  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[2px] text-[#8A7D72]">Guía</p>
        <h1 className="font-serif text-3xl text-[#1A1510] mt-1">Diseño y sistema visual</h1>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {colors.map(([name, hex, , bgClass]) => (
          <div key={name} className="bg-white rounded-xl border border-[#EDE5DC] p-3">
            <div className={`w-full h-10 rounded-md border border-[#EDE5DC] ${bgClass}`} />
            <p className="text-xs font-semibold text-[#1A1510] mt-2">{name}</p>
            <p className="text-[11px] text-[#8A7D72]">{hex}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-[#EDE5DC] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#FAF6F0] border-b border-[#EDE5DC]">
              <th className="text-left px-6 py-3 text-[#8A7D72] font-semibold">Token</th>
              <th className="text-left px-6 py-3 text-[#8A7D72] font-semibold">Hex</th>
              <th className="text-left px-6 py-3 text-[#8A7D72] font-semibold">Uso</th>
            </tr>
          </thead>
          <tbody>
            {colors.map(([name, hex, use]) => (
              <tr key={name} className="border-b border-[#EDE5DC]/70 last:border-b-0">
                <td className="px-6 py-3 text-[#1A1510] font-medium">{name}</td>
                <td className="px-6 py-3 text-[#4A3F35]">{hex}</td>
                <td className="px-6 py-3 text-[#4A3F35]">{use}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-2xl border border-[#EDE5DC] p-6">
        <h2 className="font-serif text-xl text-[#1A1510] mb-3">Principios UX</h2>
        <ul className="list-disc pl-5 text-sm text-[#4A3F35] space-y-1">
          <li>Skeletons consistentes durante carga.</li>
          <li>Creación inline de entidades sin salir del flujo.</li>
          <li>ConfirmModal para acciones destructivas.</li>
          <li>Formato COP en toda la experiencia financiera.</li>
          <li>Responsive first para escritorio y móvil.</li>
        </ul>
      </div>
    </section>
  )
}
