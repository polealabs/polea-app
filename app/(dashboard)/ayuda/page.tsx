export default function AyudaPage() {
  const faqs = [
    {
      q: '¿Cómo registro una venta con múltiples productos?',
      a: 'En Ventas, usa "+ Agregar producto" para construir la venta por líneas y guarda cuando todo esté validado.',
    },
    {
      q: '¿Cómo funciona el cálculo de costos de transacción?',
      a: 'Polea aplica automáticamente reglas por plataforma de pago y muestra el neto real por línea y total.',
    },
    {
      q: '¿Puedo cargar mis productos en masa?',
      a: 'Sí. Cada módulo tiene carga CSV con plantilla descargable y validación fila por fila.',
    },
    {
      q: '¿Cómo interpreto el dashboard?',
      a: 'Revisa KPIs principales, ventas semanales, alertas de stock y últimas ventas para decisiones rápidas.',
    },
    {
      q: '¿Qué significa stock bajo?',
      a: 'Es cuando el stock actual está por debajo o igual al stock mínimo configurado para el producto.',
    },
    {
      q: '¿Cómo agrego un descuento a una venta?',
      a: 'En cada línea de venta puedes definir descuento en porcentaje y ver su impacto inmediato en el neto.',
    },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A2F]">Centro de ayuda</h1>
      </div>

      <section className="bg-white rounded-2xl border border-[#EDE5DC] p-6">
        <h2 className="font-serif text-xl text-[#1A1510] mb-2">¿Qué es Polea?</h2>
        <p className="text-sm text-[#4A3F35]">
          Polea es una plataforma administrativa para pequeños negocios multicanal que integra
          inventario, ventas, gastos y clientes en un solo flujo operativo.
        </p>
      </section>

      <section className="bg-white rounded-2xl border border-[#EDE5DC] p-6">
        <h2 className="font-serif text-xl text-[#1A1510] mb-4">Preguntas frecuentes</h2>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.q} className="border border-[#EDE5DC] rounded-xl p-4">
              <p className="text-sm font-semibold text-[#1A1510]">{faq.q}</p>
              <p className="text-sm text-[#4A3F35] mt-1">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#F9EDE5] rounded-2xl border border-[#E8845A]/20 p-6">
        <h2 className="font-serif text-xl text-[#1A1510] mb-2">Contacto</h2>
        <p className="text-sm text-[#4A3F35]">
          Escríbenos a{' '}
          <a href="mailto:soporte@polealabs.com" className="text-[#C4622D] font-medium hover:underline">
            soporte@polealabs.com
          </a>
        </p>
      </section>
    </div>
  )
}
