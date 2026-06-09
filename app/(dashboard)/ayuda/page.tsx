'use client'

import { useState } from 'react'
import Link from 'next/link'

type PasoAyuda = {
  titulo: string
  descripcion: string
  link?: string
  linkLabel?: string
}

type GuiaModulo = {
  id: string
  icon: string
  titulo: string
  subtitulo: string
  pasos: PasoAyuda[]
  faqs: { pregunta: string; respuesta: string }[]
}

const GUIAS: GuiaModulo[] = [
  {
    id: 'inicio',
    icon: '🚀',
    titulo: 'Primeros pasos',
    subtitulo: 'Cómo configurar Leva por primera vez',
    pasos: [
      {
        titulo: 'Configura tu perfil de tienda',
        descripcion:
          'Ve a tu foto de perfil (arriba a la derecha) → Mi tienda. Agrega tu NIT, nombre del representante, teléfono, email y dirección. Esta información aparece en tus documentos (cotizaciones y cuentas de cobro).',
        link: '/perfil',
        linkLabel: 'Ir a Mi tienda →',
      },
      {
        titulo: 'Configura tus medios de pago',
        descripcion:
          'Ve a tu foto de perfil → Medios de pago. Carga los medios por defecto o crea los tuyos con su nombre, comisión y si cobran IVA. Esto permite que Leva calcule automáticamente cuánto te cobran en cada venta.',
        link: '/configuracion/medios-pago',
        linkLabel: 'Ir a Medios de pago →',
      },
      {
        titulo: 'Carga tus productos',
        descripcion:
          'Ve a Inventario y crea tus productos uno a uno, o usa la carga masiva CSV para importarlos todos de una vez. Agrega el precio de venta y el costo del producto para que Leva pueda calcular tu margen.',
        link: '/productos',
        linkLabel: 'Ir a Inventario →',
      },
      {
        titulo: 'Registra tu inventario inicial',
        descripcion:
          'Ve a Entradas y registra el inventario que tienes actualmente. Selecciona el producto, la cantidad y el costo unitario. Leva actualizará el stock automáticamente.',
        link: '/entradas',
        linkLabel: 'Ir a Entradas →',
      },
    ],
    faqs: [
      {
        pregunta: '¿Puedo importar mis productos desde Excel?',
        respuesta:
          'Sí. En el módulo de Inventario encontrarás el botón "Cargar CSV". Descarga la plantilla, llena los datos y súbela. Leva acepta archivos separados por coma o punto y coma.',
      },
      {
        pregunta: '¿Cuántos usuarios pueden usar Leva?',
        respuesta:
          'Puedes invitar a tu equipo desde el módulo Equipo. Cada persona tiene un rol: Admin, Vendedor o Solo lectura.',
      },
    ],
  },
  {
    id: 'inventario',
    icon: '📦',
    titulo: 'Inventario',
    subtitulo: 'Gestiona tus productos y stock',
    pasos: [
      {
        titulo: 'Crear un producto',
        descripcion:
          'Haz clic en "+ Nuevo producto". Ingresa el nombre, SKU (opcional), tipo de producto, precio de venta y costo. El costo es importante para calcular tu margen y el CPV en los reportes.',
      },
      {
        titulo: 'Tipos de producto',
        descripcion:
          'Producto terminado: lo que vendes directamente. Materia prima: insumos para fabricar. Empaque: materiales de empaque. Material POP: material publicitario.',
      },
      {
        titulo: 'Calcular el precio de venta',
        descripcion:
          'Usa la calculadora integrada haciendo clic en "🧮 Calcular precio" junto al campo de precio. Ingresa tus costos y Leva te sugerirá un precio según el margen típico de tu industria.',
      },
      {
        titulo: 'Filtros de stock',
        descripcion:
          'Usa los chips de filtro para ver: Todos, Agotado (stock = 0), Stock bajo (bajo el mínimo), Sin movimiento (sin ventas en 30 días), Defectuosos (unidades dadas de baja).',
      },
    ],
    faqs: [
      {
        pregunta: '¿Cómo se actualiza el stock?',
        respuesta: 'El stock sube automáticamente cuando registras una entrada. Baja automáticamente cuando registras una venta.',
      },
      {
        pregunta: '¿Qué pasa con los productos defectuosos?',
        respuesta:
          'Al registrar una devolución de tipo "Defectuoso" en el módulo de Ventas, el producto sale del inventario disponible y se cuenta como defectuoso en la columna correspondiente.',
      },
      {
        pregunta: '¿Puedo tener el mismo producto con diferentes precios?',
        respuesta:
          'Actualmente cada producto tiene un precio de venta. Puedes aplicar descuentos al registrar ventas individuales.',
      },
    ],
  },
  {
    id: 'entradas',
    icon: '↓',
    titulo: 'Entradas',
    subtitulo: 'Registra mercancía recibida',
    pasos: [
      {
        titulo: 'Registrar una entrada',
        descripcion:
          'Haz clic en "+ Nueva entrada". El formulario tiene 4 secciones: el producto (existente o nuevo), la entrada (cantidad y costo), el pago y el resumen.',
      },
      {
        titulo: 'Opciones de pago',
        descripcion:
          'Pagué de contado: registra automáticamente un gasto de Compra de inventario. Pagaré después: crea una alerta de pago pendiente. En cuotas: crea las cuotas con sus fechas de vencimiento.',
      },
      {
        titulo: 'Producto nuevo',
        descripcion:
          'Si es la primera vez que recibes este producto, selecciona "Producto nuevo" en el toggle. Leva creará el producto en Inventario y registrará la entrada al mismo tiempo.',
      },
      {
        titulo: 'Cuentas por pagar',
        descripcion:
          'En el tab "Por pagar" puedes ver todas las facturas pendientes de pago. Haz clic en "Registrar pago" para marcar una cuota o factura como pagada — Leva registrará el gasto automáticamente.',
      },
    ],
    faqs: [
      {
        pregunta: '¿Por qué no registro las entradas como gastos?',
        respuesta:
          'Las compras de inventario no son gastos contablemente — son activos. Solo se convierten en gasto (CPV) cuando vendes el producto. Por eso aparecen en el Flujo de caja pero no en el P&L.',
      },
      {
        pregunta: '¿Puedo cargar varias entradas a la vez?',
        respuesta: 'Sí, usa la carga masiva CSV al final del formulario de entradas.',
      },
    ],
  },
  {
    id: 'ventas',
    icon: '↗',
    titulo: 'Ventas',
    subtitulo: 'Registra y gestiona tus ventas',
    pasos: [
      {
        titulo: 'Registrar una venta',
        descripcion:
          'Haz clic en "+ Nueva venta". Selecciona el canal (WhatsApp, Instagram, etc.), el medio de pago, la fecha y agrega los productos. Puedes aplicar descuento por línea.',
      },
      {
        titulo: 'Medios de pago y comisiones',
        descripcion:
          'Leva calcula automáticamente la comisión de cada medio de pago (incluyendo IVA sobre la comisión). El total neto es lo que realmente recibes en tu bolsillo.',
      },
      {
        titulo: 'Campo de envío',
        descripcion:
          'Si cobras envío, agrégalo en el campo "Envío (opcional)". La comisión de la pasarela se calcula sobre el total incluyendo el envío, igual que lo hace Wompi.',
      },
      {
        titulo: 'Registrar una devolución',
        descripcion:
          'Busca la venta en el historial, haz clic en "Ver" y luego en "+ Registrar devolución". Selecciona el tipo (defectuoso o cambio) y la resolución (reembolso, crédito o cambio de producto).',
      },
    ],
    faqs: [
      {
        pregunta: '¿Puedo vender sin seleccionar un cliente?',
        respuesta: 'Sí, el cliente es opcional. Puedes registrar la venta sin asociarla a ningún cliente.',
      },
      {
        pregunta: '¿Cómo funciona el descuento?',
        respuesta:
          'El descuento se aplica por línea de producto en porcentaje. Por ejemplo, 10% descuento en un producto de $100.000 = $10.000 de descuento.',
      },
      {
        pregunta: '¿Por qué mi total neto es menor al precio de venta?',
        respuesta:
          'El total neto descuenta la comisión del medio de pago. Si usas Wompi, por ejemplo, te cobran 2.99% + $900 + IVA sobre la comisión.',
      },
    ],
  },
  {
    id: 'gastos',
    icon: '−',
    titulo: 'Gastos',
    subtitulo: 'Controla tus gastos operacionales',
    pasos: [
      {
        titulo: 'Tipos de gasto',
        descripcion:
          'Variable: cambia según el volumen de ventas (empaques, envíos, comisiones). Fijo: igual todos los meses (arriendo, nómina, suscripciones). Financiero: intereses y cuotas de crédito. Compra de inventario: mercancía comprada (solo aparece en Flujo de caja, no en P&L).',
      },
      {
        titulo: 'Compras de inventario vs gastos operativos',
        descripcion:
          'Las compras de materia prima o productos para reventa van como "Compra de inventario" — no como gasto variable. Esto es importante para que tu P&L sea correcto contablemente.',
      },
      {
        titulo: 'Editar un gasto',
        descripcion: 'En la tabla de gastos, haz clic en "Editar" para modificar cualquier campo incluido el tipo y la subcategoría.',
      },
    ],
    faqs: [
      {
        pregunta: '¿Por qué mis compras al proveedor no aparecen en el P&L?',
        respuesta:
          'Las compras de inventario no son gastos — son activos. Sí aparecen en el Flujo de caja. Solo el costo de lo que efectivamente vendiste (CPV) aparece en el P&L.',
      },
      {
        pregunta: '¿Puedo asociar un gasto a un proveedor?',
        respuesta: 'Sí. Al registrar el gasto, selecciona el proveedor en el campo correspondiente.',
      },
    ],
  },
  {
    id: 'reportes',
    icon: '📊',
    titulo: 'Reportes',
    subtitulo: 'Estado de resultados y Flujo de caja',
    pasos: [
      {
        titulo: 'Estado de resultados (P&L)',
        descripcion:
          'Muestra la rentabilidad de tu negocio. Ventas brutas → Ventas netas → Utilidad bruta (después del CPV) → Utilidad operacional (después de gastos variables y fijos) → Utilidad neta.',
      },
      {
        titulo: 'Flujo de caja',
        descripcion:
          'Muestra el movimiento real del dinero. Incluye el saldo inicial del mes (= saldo final del mes anterior), todas las entradas y salidas de dinero, y el saldo final. Un negocio puede ser rentable en el P&L pero tener flujo de caja negativo si compró mucho inventario.',
      },
      {
        titulo: 'CPV (Costo de Productos Vendidos)',
        descripcion:
          'El CPV es el costo de los productos que efectivamente vendiste este mes. No es lo que compraste al proveedor — es lo que costaron los productos que salieron de tu inventario como ventas.',
      },
      {
        titulo: 'Exportar PDF',
        descripcion: 'Haz clic en "Exportar PDF" para descargar el reporte del mes seleccionado.',
      },
    ],
    faqs: [
      {
        pregunta: '¿Por qué mi P&L muestra utilidad positiva pero mi flujo de caja es negativo?',
        respuesta:
          'Compraste más inventario del que vendiste este mes. El inventario es un activo, no un gasto, así que no afecta el P&L. Pero sí afecta tu efectivo disponible.',
      },
      {
        pregunta: '¿Por qué el CPV no coincide con mis compras al proveedor?',
        respuesta:
          'El CPV solo incluye el costo de lo que vendiste, no de todo lo que compraste. Lo que no vendiste sigue siendo inventario (activo).',
      },
    ],
  },
  {
    id: 'consignaciones',
    icon: '🏪',
    titulo: 'Tiendas Aliadas',
    subtitulo: 'Gestiona ventas en consignación',
    pasos: [
      {
        titulo: '¿Qué es una tienda aliada?',
        descripcion:
          'Una tienda aliada es un negocio donde dejas tus productos en consignación. Ellos venden por ti y te pagan según un porcentaje de comisión acordado.',
      },
      {
        titulo: 'Registrar una salida',
        descripcion:
          'Haz clic en "Nueva salida". Selecciona la tienda, agrega los productos con su cantidad y precio, y confirma. El stock baja automáticamente en tu inventario.',
      },
      {
        titulo: 'Liquidar ventas',
        descripcion:
          'Al final del mes, ve al tab "Liquidaciones" → "Nueva liquidación". Selecciona la tienda, el mes y cuánto vendieron. Leva calcula la comisión y tu neto automáticamente.',
      },
      {
        titulo: 'Crear cuenta de cobro desde liquidación',
        descripcion:
          'Después de liquidar, aparece el botón "Crear cuenta de cobro". Haz clic para generar automáticamente una cuenta de cobro con todos los datos prellenados.',
      },
      {
        titulo: 'Documento de remisión',
        descripcion:
          'Cuando registras una salida, queda en "Remisiones recientes". Haz clic en "Ver remisión" para ver y descargar el PDF de salida.',
      },
    ],
    faqs: [
      {
        pregunta: '¿Qué pasa si la tienda devuelve productos?',
        respuesta:
          'Ve al tab "Devoluciones" → "Nueva devolución". Selecciona la tienda y los productos devueltos. El stock sube automáticamente.',
      },
      {
        pregunta: '¿Puedo tener varias tiendas aliadas?',
        respuesta: 'Sí, puedes crear todas las tiendas aliadas que necesites, cada una con su propio porcentaje de comisión.',
      },
    ],
  },
  {
    id: 'documentos',
    icon: '📄',
    titulo: 'Documentos',
    subtitulo: 'Cotizaciones y cuentas de cobro',
    pasos: [
      {
        titulo: 'Crear una cotización',
        descripcion:
          'Ve a Documentos → "Nueva cotización". Selecciona o escribe el destinatario, agrega los productos/servicios con sus precios y aplica descuento si aplica. Descarga el PDF y compártelo.',
      },
      {
        titulo: 'Crear una cuenta de cobro',
        descripcion:
          'Ve a Documentos → "Nueva cuenta de cobro". Selecciona el proveedor o tienda aliada como destinatario, escribe el concepto, el valor y los datos bancarios para transferencia.',
      },
      {
        titulo: 'Datos del emisor',
        descripcion:
          'El PDF usa los datos de tu tienda (nombre, NIT, dirección, representante). Asegúrate de tenerlos completos en Mi tienda → Información legal.',
      },
    ],
    faqs: [
      {
        pregunta: '¿Cómo comparto una cotización por WhatsApp?',
        respuesta:
          'Descarga el PDF y compártelo manualmente desde tu celular. En el futuro Leva tendrá integración directa con WhatsApp.',
      },
      {
        pregunta: '¿Los documentos tienen numeración automática?',
        respuesta: 'Sí. Las cotizaciones van COT-2026-001, COT-2026-002, etc. Las cuentas de cobro van CC-2026-001, etc.',
      },
    ],
  },
  {
    id: 'equipo',
    icon: '👥',
    titulo: 'Equipo',
    subtitulo: 'Gestiona usuarios y permisos',
    pasos: [
      {
        titulo: 'Invitar a un miembro',
        descripcion:
          'Ve a Equipo → ingresa el email y el rol. Copia el link de invitación y compártelo. La persona debe crear su cuenta en Leva y aceptar la invitación.',
      },
      {
        titulo: 'Roles disponibles',
        descripcion:
          'Admin: acceso total excepto eliminar la tienda. Vendedor: puede registrar ventas y ver productos y clientes, pero no ve gastos ni reportes. Solo lectura: puede ver todo pero no modificar nada.',
      },
    ],
    faqs: [
      {
        pregunta: '¿Puede un vendedor ver los reportes financieros?',
        respuesta: 'No. Los reportes y gastos solo son visibles para el dueño (owner) y los admins.',
      },
      {
        pregunta: '¿Puedo cambiar el rol de un miembro después?',
        respuesta: 'Sí. En la tabla de miembros, el dueño puede cambiar el rol de cualquier miembro en cualquier momento.',
      },
    ],
  },
]

function FAQItem({ pregunta, respuesta }: { pregunta: string; respuesta: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="px-6 py-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left gap-4"
      >
        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          {pregunta}
        </p>
        <span className="text-lg shrink-0" style={{ color: 'var(--color-text-soft)' }}>
          {open ? '−' : '+'}
        </span>
      </button>
      {open && (
        <p className="text-sm mt-3 leading-relaxed" style={{ color: 'var(--color-text-soft)' }}>
          {respuesta}
        </p>
      )}
    </div>
  )
}

export default function AyudaPage() {
  const [moduloActivo, setModuloActivo] = useState('inicio')
  const guia = GUIAS.find((g) => g.id === moduloActivo)

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto" style={{ background: 'var(--color-background)' }}>
      <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
        Centro de ayuda
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--color-text-soft)' }}>
        Guías y preguntas frecuentes sobre cada módulo de Leva.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
          >
            {GUIAS.map((g) => (
              <button
                key={g.id}
                type="button"
                title={g.subtitulo}
                onClick={() => setModuloActivo(g.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition border-b last:border-0"
                style={{
                  borderColor: 'var(--color-border)',
                  background: moduloActivo === g.id ? 'var(--color-accent-pale)' : 'transparent',
                  color: moduloActivo === g.id ? 'var(--color-accent)' : 'var(--color-text)',
                  fontWeight: moduloActivo === g.id ? '600' : '400',
                }}
              >
                <span aria-hidden>{g.icon}</span>
                <span>{g.titulo}</span>
              </button>
            ))}
          </div>
        </div>

        {guia && (
          <div className="space-y-6">
            <div className="rounded-2xl p-6" style={{ background: 'var(--color-primary)' }}>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-3xl" aria-hidden>
                  {guia.icon}
                </span>
                <h2 className="font-serif text-2xl font-medium text-white">{guia.titulo}</h2>
              </div>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {guia.subtitulo}
              </p>
            </div>

            <div
              className="rounded-2xl border overflow-hidden"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            >
              <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-soft)' }}>
                  Cómo usarlo
                </p>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {guia.pasos.map((paso, i) => (
                  <div key={`${guia.id}-paso-${i}`} className="px-6 py-5 flex gap-4">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5"
                      style={{ background: 'var(--color-accent-pale)', color: 'var(--color-accent)' }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                        {paso.titulo}
                      </p>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-soft)' }}>
                        {paso.descripcion}
                      </p>
                      {paso.link && paso.linkLabel && (
                        <Link
                          href={paso.link}
                          className="inline-flex items-center text-xs font-medium mt-2 hover:underline"
                          style={{ color: 'var(--color-accent)' }}
                        >
                          {paso.linkLabel}
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {guia.faqs.length > 0 && (
              <div
                className="rounded-2xl border overflow-hidden"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
              >
                <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-soft)' }}>
                    Preguntas frecuentes
                  </p>
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {guia.faqs.map((faq, i) => (
                    <FAQItem key={`${guia.id}-faq-${i}`} pregunta={faq.pregunta} respuesta={faq.respuesta} />
                  ))}
                </div>
              </div>
            )}

            <div
              className="rounded-2xl p-5 text-center"
              style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)' }}
            >
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                ¿Tienes alguna duda?
              </p>
              <p className="text-xs mb-3" style={{ color: 'var(--color-text-soft)' }}>
                Escríbenos por WhatsApp y te ayudamos.
              </p>
              <a
                href="https://wa.me/573014140381"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition"
                style={{ background: 'var(--color-accent)', color: 'white' }}
              >
                💬 Hablar con soporte
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
