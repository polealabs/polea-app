export default function Seguridad() {
  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[2px] text-[#8A7D72]">Técnico</p>
        <h1 className="font-serif text-3xl text-[#1A1510] mt-1">Seguridad y RLS</h1>
      </header>

      <div className="bg-white rounded-2xl border border-[#EDE5DC] p-6 text-sm text-[#4A3F35]">
        Polea aplica Row Level Security en todas las tablas relevantes para asegurar aislamiento por
        tienda y evitar acceso cruzado entre negocios.
      </div>

      <div className="bg-white rounded-2xl border border-[#EDE5DC] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#FAF6F0] border-b border-[#EDE5DC]">
              <th className="text-left px-6 py-3 text-[#8A7D72] font-semibold">Componente</th>
              <th className="text-left px-6 py-3 text-[#8A7D72] font-semibold">Implementación</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#EDE5DC]/70">
              <td className="px-6 py-3 text-[#1A1510] font-medium">Auth</td>
              <td className="px-6 py-3 text-[#4A3F35]">Supabase Auth + JWT</td>
            </tr>
            <tr className="border-b border-[#EDE5DC]/70">
              <td className="px-6 py-3 text-[#1A1510] font-medium">Aislamiento</td>
              <td className="px-6 py-3 text-[#4A3F35]">RLS por tienda_id</td>
            </tr>
            <tr>
              <td className="px-6 py-3 text-[#1A1510] font-medium">Rutas</td>
              <td className="px-6 py-3 text-[#4A3F35]">Middleware Next.js</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-[#F9EDE5] border border-[#E8845A]/20 rounded-2xl p-6">
        <p className="text-sm text-[#4A3F35]">
          El middleware redirige automáticamente a login si no existe sesión activa.
        </p>
      </div>
    </section>
  )
}
