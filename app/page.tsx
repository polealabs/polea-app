'use client'

import { useState } from 'react'
import Link from 'next/link'

const WA_URL = 'https://wa.me/573014140381'

const painPoints = [
  {
    icon: '📊',
    titulo: 'No sé cuánto gané este mes',
    texto:
      'Entre comisiones de Wompi, descuentos y gastos, al final del mes no sabes si tu negocio fue rentable.',
  },
  {
    icon: '📦',
    titulo: 'Mi inventario siempre está desactualizado',
    texto: 'Vendes por WhatsApp, Instagram y en físico — y nunca sabes exactamente cuánto te queda en stock.',
  },
  {
    icon: '💸',
    titulo: 'Llevo todo en Excel y ya no aguanto',
    texto: 'Hojas de cálculo, cuadernos, notas de voz. Tu negocio ya creció más que eso.',
  },
  {
    icon: '👥',
    titulo: 'No sé cuáles son mis mejores clientes',
    texto: 'Tienes clientes que compran todo el tiempo pero no sabes quiénes son ni cuándo fue su última compra.',
  },
  {
    icon: '😤',
    titulo: 'Cada fin de mes es un caos',
    texto:
      'Juntar ventas, gastos y facturas de todas partes para saber cómo te fue — un proceso que te roba horas.',
  },
]

export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cardActiva, setCardActiva] = useState(0)

  return (
    <div className="min-h-screen bg-white">
      {/* 1. NAVBAR */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-[#EDE5DC]">
        <nav className="h-16 flex items-center justify-between px-6 md:px-12 max-w-[1600px] mx-auto">
          <div>
            <span className="font-serif text-2xl font-bold text-[#1E3A2F] tracking-tight">
              POLEA
            </span>
            <span className="text-xs text-[#8A7D72] ml-2 hidden sm:inline">Tu tienda, clara</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <Link
              href="#funcionalidades"
              className="text-sm text-[#4A3F35] hover:text-[#1E3A2F] transition font-medium"
            >
              Funcionalidades
            </Link>
            <Link
              href="#precios"
              className="text-sm text-[#4A3F35] hover:text-[#1E3A2F] transition font-medium"
            >
              Precios
            </Link>
            <a
              href={WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#4A3F35] hover:text-[#1E3A2F] transition font-medium"
            >
              Contacto
            </a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-[#C4622D] border border-[#C4622D] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F9EDE5] transition"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="bg-[#C4622D] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#E8845A] transition"
            >
              Prueba ya
            </Link>
          </div>

          <button
            type="button"
            className="md:hidden p-2 rounded-lg border border-[#EDE5DC] text-[#1E3A2F]"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setMobileOpen((o) => !o)}
          >
            <span className="block w-5 h-0.5 bg-[#1E3A2F] mb-1" />
            <span className="block w-5 h-0.5 bg-[#1E3A2F] mb-1" />
            <span className="block w-5 h-0.5 bg-[#1E3A2F]" />
          </button>
        </nav>

        {mobileOpen && (
          <div className="md:hidden border-t border-[#EDE5DC] px-6 py-4 flex flex-col gap-3 bg-white">
            <Link
              href="#funcionalidades"
              className="text-sm text-[#4A3F35] font-medium py-2"
              onClick={() => setMobileOpen(false)}
            >
              Funcionalidades
            </Link>
            <Link
              href="#precios"
              className="text-sm text-[#4A3F35] font-medium py-2"
              onClick={() => setMobileOpen(false)}
            >
              Precios
            </Link>
            <a
              href={WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#4A3F35] font-medium py-2"
              onClick={() => setMobileOpen(false)}
            >
              Contacto
            </a>
            <hr className="border-[#EDE5DC]" />
            <Link
              href="/login"
              className="text-[#C4622D] border border-[#C4622D] px-4 py-2 rounded-lg text-sm font-medium text-center hover:bg-[#F9EDE5] transition"
              onClick={() => setMobileOpen(false)}
            >
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="bg-[#C4622D] text-white px-4 py-2 rounded-lg text-sm font-semibold text-center hover:bg-[#E8845A] transition"
              onClick={() => setMobileOpen(false)}
            >
              Prueba ya
            </Link>
          </div>
        )}
      </header>

      {/* 2. HERO */}
      <section className="bg-[#FAF6F0] py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-white border border-[#EDE5DC] rounded-full px-4 py-1.5 text-xs text-[#4A3F35] font-medium mb-6">
              Para emprendedores que quieren claridad financiera
            </div>
            <h1 className="font-serif text-[42px] md:text-[56px] font-medium text-[#1A1510] leading-[1.1] mb-5">
              Vende más.
              <br />
              Gana más.
              <br />
              <span className="text-[#C4622D] italic">Sabe exactamente cuánto.</span>
            </h1>
            <p className="text-[#8A7D72] text-lg leading-relaxed mb-8">
              Registra ventas, controla tu inventario y conoce tu ganancia real. Diseñado para tiendas que
              venden por WhatsApp, Instagram y presencial.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link
                href="/registro"
                className="bg-[#C4622D] text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-[#E8845A] transition shadow-sm inline-flex items-center justify-center"
              >
                Prueba ya
              </Link>
              <a
                href={WA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-[#1E3A2F] text-[#1E3A2F] px-6 py-3 rounded-xl text-sm font-semibold hover:bg-[#1E3A2F] hover:text-white transition inline-flex items-center justify-center"
              >
                Agenda tu demo
              </a>
            </div>
            <p className="text-xs text-[#8A7D72] mt-3">Sin contratos · Cancela cuando quieras</p>
          </div>

          <div className="relative">
            <div className="bg-[#1E3A2F] rounded-2xl p-4 shadow-2xl">
              <div className="bg-[#FAF6F0] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-serif text-sm font-medium text-[#1A1510]">Dashboard</span>
                  <div className="w-7 h-7 rounded-full bg-[#C4622D] flex items-center justify-center text-white text-xs font-bold">
                    P
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Hoy', value: '$320K' },
                    { label: 'Este mes', value: '$6.1M' },
                    { label: 'Stock bajo', value: '3' },
                  ].map((kpi) => (
                    <div key={kpi.label} className="bg-white rounded-lg p-2 shadow-sm">
                      <p className="text-[9px] text-[#8A7D72]">{kpi.label}</p>
                      <p className="font-serif text-sm font-medium text-[#1A1510]">{kpi.value}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-lg p-2 shadow-sm">
                  <p className="text-[9px] text-[#8A7D72] mb-1.5">Últimas ventas</p>
                  {[
                    { prod: 'Aretes luna', canal: 'WhatsApp', neto: '$81.5K' },
                    { prod: 'Collar sol', canal: 'Instagram', neto: '$115K' },
                    { prod: 'Anillo', canal: 'Presencial', neto: '$62K' },
                  ].map((v, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-1 border-b border-[#FAF6F0] last:border-0"
                    >
                      <span className="text-[9px] text-[#1A1510] font-medium">{v.prod}</span>
                      <span className="text-[8px] bg-[#E8F5EE] text-[#3A7D5A] px-1.5 py-0.5 rounded-full">
                        {v.canal}
                      </span>
                      <span className="text-[9px] font-bold text-[#1E3A2F]">{v.neto}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-[#C4622D]/20 rounded-full blur-2xl -z-10" />
          </div>
        </div>
      </section>

      <section className="bg-white py-14 border-b border-[#EDE5DC]">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-xs uppercase tracking-widest text-[#8A7D72] mb-10 font-medium">
            Toma decisiones con información real
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              {
                icon: '⚡',
                titulo: 'Configuración en minutos',
                texto: 'Sin instalaciones ni cursos. Crea tu cuenta y empieza hoy.',
              },
              {
                icon: '📊',
                titulo: 'Estado de resultados automático',
                texto: 'Tu P&L mes a mes sin necesidad de un contador.',
              },
              {
                icon: '🔄',
                titulo: 'Stock en tiempo real',
                texto: 'Se actualiza solo con cada venta y cada entrada de mercancía.',
              },
              {
                icon: '💳',
                titulo: 'Comisiones automáticas',
                texto: 'Wompi, Bold, Nequi — Polea calcula lo que te cobran y te muestra tu neto.',
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl mb-3">{item.icon}</div>
                <p className="text-sm font-semibold text-[#1E3A2F] mb-1">{item.titulo}</p>
                <p className="text-xs text-[#8A7D72] leading-relaxed">{item.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="problema" className="py-20" style={{ background: '#FAF6F0' }}>
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="font-serif text-[36px] text-center text-[#1A1510] mb-3">¿Te suena familiar?</h2>
          <p className="text-center text-[#8A7D72] mb-16">Si gestionas un negocio, seguro has pasado por esto.</p>

          {/* Carrusel de cartas */}
          <div className="relative flex items-center justify-center gap-4 overflow-hidden py-8">
            {painPoints.map((p, i) => {
              const total = painPoints.length
              let diff = i - cardActiva
              if (diff > total / 2) diff -= total
              if (diff < -total / 2) diff += total

              const isActive = diff === 0
              const isNext = diff === 1 || (cardActiva === total - 1 && i === 0)
              const isPrev = diff === -1 || (cardActiva === 0 && i === total - 1)
              const isHidden = Math.abs(diff) > 1

              if (isHidden) return null

              return (
                <div
                  key={i}
                  onClick={() => !isActive && setCardActiva(i)}
                  className={`
              bg-white rounded-2xl border border-[#EDE5DC] shadow-sm p-8 transition-all duration-500 flex-shrink-0
              ${
                isActive
                  ? 'w-full max-w-lg z-20 opacity-100 scale-100 cursor-default'
                  : 'w-full max-w-xs z-10 opacity-50 scale-95 cursor-pointer hover:opacity-70'
              }
              ${isPrev ? '-translate-x-4' : ''}
              ${isNext ? 'translate-x-4' : ''}
            `}
                >
                  <div className="text-5xl mb-5">{p.icon}</div>
                  <h3
                    className={`font-serif font-medium text-[#1A1510] mb-3 ${isActive ? 'text-[24px]' : 'text-[18px]'}`}
                  >
                    {p.titulo}
                  </h3>
                  {isActive && <p className="text-[#8A7D72] leading-relaxed">{p.texto}</p>}
                </div>
              )
            })}
          </div>

          {/* Controles */}
          <div className="flex items-center justify-center gap-6 mt-8">
            <button
              type="button"
              onClick={() =>
                setCardActiva((v) => (v - 1 + painPoints.length) % painPoints.length)
              }
              className="w-11 h-11 rounded-full border border-[#EDE5DC] bg-white flex items-center justify-center text-[#8A7D72] hover:bg-[#FAF6F0] transition text-xl shadow-sm"
            >
              ‹
            </button>

            <div className="flex gap-2">
              {painPoints.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCardActiva(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === cardActiva ? 'bg-[#C4622D] w-8' : 'bg-[#EDE5DC] w-2 hover:bg-[#C4B8B0]'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => setCardActiva((v) => (v + 1) % painPoints.length)}
              className="w-11 h-11 rounded-full border border-[#EDE5DC] bg-white flex items-center justify-center text-[#8A7D72] hover:bg-[#FAF6F0] transition text-xl shadow-sm"
            >
              ›
            </button>
          </div>
        </div>
      </section>

      {/* 5. FUNCIONALIDADES */}
      <section id="funcionalidades" className="bg-white py-20 max-w-6xl mx-auto px-6">
        <h2 className="font-serif text-[36px] text-center mb-2">Todo lo que necesitas</h2>
        <p className="text-center text-[#8A7D72] mb-12">Poderoso para crecer, simple para empezar.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-[#FAF6F0] rounded-2xl p-6 border border-[#EDE5DC]">
            <div className="text-3xl">↗</div>
            <h3 className="font-semibold text-[#1E3A2F] mt-3 mb-2">Ventas multicanal</h3>
            <p className="text-sm text-[#8A7D72]">
              Registra ventas de WhatsApp, Instagram, web y presencial en segundos.
            </p>
            <span className="inline-block mt-3 text-xs bg-[#C4622D] text-white px-2.5 py-1 rounded-full font-medium">
              Solo en Polea ✦
            </span>
            <p className="text-sm text-[#8A7D72] mt-2">
              Calcula automáticamente las comisiones de Wompi, Bold y Nequi.
            </p>
          </div>
          <div className="bg-[#FAF6F0] rounded-2xl p-6 border border-[#EDE5DC]">
            <div className="text-3xl">📦</div>
            <h3 className="font-semibold text-[#1E3A2F] mt-3 mb-2">Inventario en tiempo real</h3>
            <p className="text-sm text-[#8A7D72]">
              El stock se actualiza automáticamente con cada venta. Alertas cuando un producto está por
              agotarse.
            </p>
          </div>
          <div className="bg-[#FAF6F0] rounded-2xl p-6 border border-[#EDE5DC]">
            <div className="text-3xl">📊</div>
            <h3 className="font-semibold text-[#1E3A2F] mt-3 mb-2">Estado de resultados</h3>
            <p className="text-sm text-[#8A7D72]">
              Ve tu utilidad real mes a mes. Ventas, costos y gastos en un reporte claro que cualquiera entiende.
            </p>
          </div>
          <div className="bg-[#FAF6F0] rounded-2xl p-6 border border-[#EDE5DC]">
            <div className="text-3xl">👥</div>
            <h3 className="font-semibold text-[#1E3A2F] mt-3 mb-2">Clientes y recurrencia</h3>
            <p className="text-sm text-[#8A7D72]">
              Historial de compras por cliente. Alertas cuando un cliente frecuente lleva tiempo sin comprar.
            </p>
          </div>
          <div className="bg-[#FAF6F0] rounded-2xl p-6 border border-[#EDE5DC]">
            <div className="text-3xl">🧾</div>
            <h3 className="font-semibold text-[#1E3A2F] mt-3 mb-2">Control de gastos</h3>
            <p className="text-sm text-[#8A7D72]">
              Registra cada gasto por categoría. Sabe exactamente en qué se va el dinero del negocio.
            </p>
          </div>
          <div className="bg-[#FAF6F0] rounded-2xl p-6 border border-[#EDE5DC]">
            <div className="text-3xl">📥</div>
            <h3 className="font-semibold text-[#1E3A2F] mt-3 mb-2">Importa desde Excel</h3>
            <p className="text-sm text-[#8A7D72]">
              ¿Vienes de hojas de cálculo? Importa tus productos, clientes e historial en minutos con CSV.
            </p>
          </div>
        </div>
      </section>

      {/* 6. DIFERENCIADOR */}
      <section className="bg-[#1E3A2F] py-20 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex bg-[#C4622D]/20 text-[#E8845A] text-xs px-3 py-1 rounded-full font-medium mb-4">
              ✦ Solo en Polea
            </div>
            <h2 className="font-serif text-[32px] text-white leading-tight mb-4">
              Sabe exactamente cuánto te cuesta cada venta
            </h2>
            <p className="text-[#FAF6F0]/70 leading-relaxed mb-6">
              Polea calcula automáticamente las comisiones de Wompi (2.99% + $900), Bold (2.99%), Nequi y más.
              Registras la venta y ves al instante cuánto entra limpio.
            </p>
            <Link href="/registro" className="text-[#E8845A] font-semibold hover:underline inline-flex items-center gap-1">
              Prueba ya →
            </Link>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-xl">
            <p className="text-xs text-[#8A7D72] mb-4 font-medium uppercase tracking-wide">Resumen de venta</p>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#8A7D72]">Total bruto</span>
                <span className="text-[#1A1510] font-medium">$120.000</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#8A7D72]">Plataforma</span>
                <span className="bg-[#FAF6F0] text-[#4A3F35] px-2 py-0.5 rounded-full text-xs font-medium">
                  Wompi
                </span>
              </div>
              <div className="flex justify-between text-sm text-[#C44040]">
                <span>Comisión (2.99% + $900)</span>
                <span className="font-medium">-$4.488</span>
              </div>
              <div className="border-t border-[#EDE5DC] pt-3 flex justify-between">
                <span className="font-semibold text-[#1A1510]">Neto a recibir</span>
                <span className="font-bold text-[#3A7D5A] text-lg">$115.512</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. TIPOS DE NEGOCIO */}
      <section className="bg-[#FAF6F0] py-16 text-center px-6">
        <h2 className="font-serif text-[32px] mb-3">Hecho para tu tipo de negocio</h2>
        <p className="text-[#8A7D72] mb-8">Tu industria, tu ritmo, tu herramienta.</p>
        <div className="flex flex-wrap justify-center gap-2.5 max-w-3xl mx-auto">
          {[
            'Joyería',
            'Ropa y calzado',
            'Restaurante',
            'Cafetería',
            'Spa',
            'Peluquería',
            'Ferretería',
            'Accesorios',
            'Cosméticos',
            'Artesanías',
            'Tienda de regalos',
            'Floristería',
            'Suplementos',
            'y más...',
          ].map((chip) => (
            <span
              key={chip}
              className="bg-white border border-[#EDE5DC] rounded-full px-4 py-2 text-sm text-[#4A3F35] hover:border-[#C4622D] hover:text-[#C4622D] transition cursor-default"
            >
              {chip}
            </span>
          ))}
        </div>
      </section>

      {/* 8. PRECIOS */}
      <section id="precios" className="bg-white py-20 px-6">
        <h2 className="font-serif text-[36px] text-center mb-2">Planes y precios</h2>
        <p className="text-center text-[#8A7D72] mb-12">Sin sorpresas. Sin contratos. Cancela cuando quieras.</p>
        <div className="flex justify-center gap-6 flex-wrap">
          <div className="bg-[#FAF6F0] rounded-2xl p-8 border border-[#EDE5DC] w-full max-w-sm">
            <p className="text-xs uppercase text-[#8A7D72] tracking-wide mb-2">Plan Básico</p>
            <p className="font-serif text-[48px] font-medium text-[#1A1510] leading-none">$49.000</p>
            <p className="text-sm text-[#8A7D72] mb-6">COP / mes</p>
            <ul className="space-y-3 text-sm text-[#4A3F35]">
              <li className="flex gap-2">
                <span className="text-[#C4622D] font-bold">✓</span>
                Inventario y productos
              </li>
              <li className="flex gap-2">
                <span className="text-[#C4622D] font-bold">✓</span>
                Registro de ventas multicanal
              </li>
              <li className="flex gap-2">
                <span className="text-[#C4622D] font-bold">✓</span>
                Control de gastos
              </li>
              <li className="flex gap-2">
                <span className="text-[#C4622D] font-bold">✓</span>
                Gestión de clientes
              </li>
              <li className="flex gap-2">
                <span className="text-[#C4622D] font-bold">✓</span>
                Dashboard con KPIs
              </li>
              <li className="flex gap-2">
                <span className="text-[#C4622D] font-bold">✓</span>
                Carga masiva desde Excel
              </li>
            </ul>
            <Link
              href="/registro"
              className="block w-full text-center mt-6 border border-[#C4622D] text-[#C4622D] hover:bg-[#F9EDE5] rounded-xl py-3 text-sm font-semibold transition"
            >
              Comenzar
            </Link>
          </div>

          <div className="bg-[#1E3A2F] rounded-2xl p-8 border border-[#1E3A2F] w-full max-w-sm relative overflow-hidden">
            <span className="absolute top-4 right-4 bg-[#C4622D] text-white text-xs px-3 py-1 rounded-full font-medium">
              Más popular
            </span>
            <p className="text-xs uppercase text-white/50 tracking-wide mb-2">Plan Pro</p>
            <p className="font-serif text-[48px] font-medium text-white leading-none">$89.000</p>
            <p className="text-sm text-white/50 mb-6">COP / mes</p>
            <ul className="space-y-3 text-sm text-white/90">
              <li className="flex gap-2">
                <span className="text-[#E8845A] font-bold">✓</span>
                Todo lo del plan Básico
              </li>
              <li className="flex gap-2">
                <span className="text-[#E8845A] font-bold">✓</span>
                Estado de resultados (P&amp;L)
              </li>
              <li className="flex gap-2">
                <span className="text-[#E8845A] font-bold">✓</span>
                Reportes exportables en PDF
              </li>
              <li className="flex gap-2">
                <span className="text-[#E8845A] font-bold">✓</span>
                Notificaciones inteligentes
              </li>
              <li className="flex gap-2">
                <span className="text-[#E8845A] font-bold">✓</span>
                Gestión de equipo y roles
              </li>
              <li className="flex gap-2">
                <span className="text-[#E8845A] font-bold">✓</span>
                Soporte prioritario
              </li>
            </ul>
            <Link
              href="/registro"
              className="block w-full text-center mt-6 bg-[#C4622D] hover:bg-[#E8845A] text-white rounded-xl py-3 text-sm font-semibold transition"
            >
              Prueba ya
            </Link>
          </div>
        </div>
        <p className="text-sm text-[#8A7D72] mt-8 text-center">
          ¿Tienes dudas?{' '}
          <a
            href={WA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#C4622D] font-medium hover:underline"
          >
            Agenda una demo →
          </a>
        </p>
      </section>

      {/* 9. CTA FINAL */}
      <section className="bg-[#C4622D] py-20 text-center px-6">
        <h2 className="font-serif text-[36px] md:text-[44px] text-white leading-tight mb-4 whitespace-pre-line">
          {`¿Listo para conocer\nla ganancia real\nde tu negocio?`}
        </h2>
        <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
          Únete a los negocios colombianos que ya manejan sus operaciones con claridad.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link
            href="/registro"
            className="bg-[#1E3A2F] text-white px-8 py-4 rounded-xl text-sm font-semibold hover:bg-[#2D4A3E] transition shadow-lg inline-flex items-center justify-center"
          >
            Prueba ya
          </Link>
          <a
            href={WA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="border-2 border-white text-white px-8 py-4 rounded-xl text-sm font-semibold hover:bg-white hover:text-[#C4622D] transition inline-flex items-center justify-center"
          >
            Hablar con ventas
          </a>
        </div>
      </section>

      {/* 10. FOOTER */}
      <footer className="bg-[#1A1510] py-12 px-6">
        <div className="max-w-6xl mx-auto flex justify-between items-start flex-wrap gap-8">
          <div>
            <p className="font-serif text-xl text-white">POLEA</p>
            <p className="text-xs text-white/40 mt-1">Tu tienda, clara</p>
            <p className="text-xs text-white/30 mt-4">© 2026 Polealabs · Cali, Colombia</p>
          </div>
          <div className="flex flex-col text-sm text-white/50 space-y-2">
            <Link href="#funcionalidades" className="hover:text-white/80">
              Funcionalidades
            </Link>
            <Link href="#precios" className="hover:text-white/80">
              Precios
            </Link>
            <Link href="/login" className="hover:text-white/80">
              Iniciar sesión
            </Link>
            <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white/80">
              Contacto
            </a>
          </div>
          <div>
            <p className="text-sm text-white/50">soporte@polealabs.com</p>
            <a
              href={WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/50 hover:text-white/80 block mt-1"
            >
              {WA_URL.replace('https://', '')}
            </a>
            <p className="text-xs text-white/30 mt-4">Hecho con ♥ en Colombia</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
