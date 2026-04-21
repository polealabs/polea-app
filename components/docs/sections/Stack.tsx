export default function Stack() {
  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[2px] text-[#8A7D72]">Técnico</p>
        <h1 className="font-serif text-3xl text-[#1A1510] mt-1">Stack técnico</h1>
      </header>

      <div className="bg-white rounded-2xl border border-[#EDE5DC] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#FAF6F0] border-b border-[#EDE5DC]">
              <th className="text-left px-6 py-3 text-[#8A7D72] font-semibold">Capa</th>
              <th className="text-left px-6 py-3 text-[#8A7D72] font-semibold">Tecnología</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Frontend', 'Next.js 14 + TypeScript'],
              ['Estilos', 'Tailwind CSS'],
              ['Base de datos', 'Supabase PostgreSQL'],
              ['Auth', 'Supabase Auth + RLS'],
              ['Deploy', 'Vercel'],
              ['Editor', 'Cursor'],
              ['Pagos (próx.)', 'Wompi'],
            ].map(([layer, value]) => (
              <tr key={layer} className="border-b border-[#EDE5DC]/70 last:border-b-0">
                <td className="px-6 py-3 text-[#1A1510] font-medium">{layer}</td>
                <td className="px-6 py-3 text-[#4A3F35]">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-[#4A3F35]">
        Tipografías del sistema: <strong>Fraunces</strong> para títulos y <strong>DM Sans</strong> para
        cuerpo.
      </p>
    </section>
  )
}
