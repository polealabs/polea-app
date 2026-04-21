export default function Usuarios() {
  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[2px] text-[#8A7D72]">Producto</p>
        <h1 className="font-serif text-3xl text-[#1A1510] mt-1">Usuarios objetivo</h1>
      </header>

      <div className="bg-white rounded-2xl border border-[#EDE5DC] p-6 space-y-4 text-sm text-[#4A3F35]">
        <p>
          Perfil principal: negocios con facturación entre <strong>$3M y $25M COP/mes</strong>, con
          operación presencial, virtual o mixta.
        </p>
        <p>
          Canales frecuentes: <strong>WhatsApp, Instagram, web y presencial</strong>.
        </p>
        <p>
          Sistema actual típico: Excel, cuaderno o control mental sin consolidación confiable.
        </p>
        <p>
          Tipos de comercio: joyería, restaurantes, ferreterías, spas, peluquerías, ropa,
          artesanías y cualquier negocio pequeño multicanal.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#EDE5DC] p-6">
        <h2 className="font-serif text-xl text-[#1A1510] mb-3">5 características del cliente ideal</h2>
        <ol className="list-decimal pl-5 text-sm text-[#4A3F35] space-y-2">
          <li>Vende en más de un canal y concilia operaciones manualmente.</li>
          <li>Tiene rotación de inventario y sufre quiebres o sobrestock.</li>
          <li>Necesita conocer el neto real después de comisiones.</li>
          <li>Quiere operar rápido sin complejidad contable empresarial.</li>
          <li>Busca orden administrativo para crecer sin perder control.</li>
        </ol>
      </div>
    </section>
  )
}
