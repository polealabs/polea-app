'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const WA_URL = 'https://wa.me/573014140381'

const painPoints = [
  {
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#C4622D"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    titulo: 'No sé cuánto gané este mes',
    texto:
      'Entre comisiones de Wompi, descuentos y gastos, al final del mes no sabes si tu negocio fue rentable.',
  },
  {
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#C4622D"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
    titulo: 'Mi inventario siempre está desactualizado',
    texto: 'Vendes por WhatsApp, Instagram y en físico — y nunca sabes exactamente cuánto te queda en stock.',
  },
  {
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#C4622D"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
    titulo: 'Llevo todo en Excel y ya no aguanto',
    texto: 'Hojas de cálculo, cuadernos, notas de voz. Tu negocio ya creció más que eso.',
  },
  {
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#C4622D"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    titulo: 'No sé cuáles son mis mejores clientes',
    texto: 'Tienes clientes que compran todo el tiempo pero no sabes quiénes son ni cuándo fue su última compra.',
  },
  {
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#C4622D"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    titulo: 'Cada fin de mes es un caos',
    texto:
      'Juntar ventas, gastos y facturas de todas partes para saber cómo te fue — un proceso que te roba horas.',
  },
]

const propuestaValor = [
  {
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#C4622D"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    titulo: 'Configuración en minutos',
    texto: 'Sin instalaciones ni cursos. Crea tu cuenta y empieza hoy.',
  },
  {
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#C4622D"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    titulo: 'Estado de resultados automático',
    texto: 'Tu P&L mes a mes sin necesidad de un contador.',
  },
  {
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#C4622D"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
    titulo: 'Stock en tiempo real',
    texto: 'Se actualiza solo con cada venta y cada entrada de mercancía.',
  },
  {
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#C4622D"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
    titulo: 'Comisiones automáticas',
    texto: 'Wompi, Bold, Nequi — Polea calcula lo que te cobran y te muestra tu neto.',
  },
]

const features = [
  {
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#1E3A2F"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="7" y1="17" x2="17" y2="7" />
        <polyline points="7 7 17 7 17 17" />
      </svg>
    ),
    titulo: 'Ventas multicanal',
    texto: 'Registra ventas de WhatsApp, Instagram, web y presencial en segundos.',
    badge: 'Solo en Polea ✦',
    extra: 'Calcula automáticamente las comisiones de Wompi, Bold y Nequi.',
  },
  {
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#1E3A2F"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
    titulo: 'Inventario en tiempo real',
    texto: 'El stock se actualiza automáticamente con cada venta. Alertas cuando un producto está por agotarse.',
  },
  {
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#1E3A2F"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    titulo: 'Estado de resultados',
    texto: 'Ve tu utilidad real mes a mes. Ventas, costos y gastos en un reporte claro que cualquiera entiende.',
  },
  {
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#1E3A2F"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    titulo: 'Clientes y recurrencia',
    texto: 'Historial de compras por cliente. Alertas cuando un cliente frecuente lleva tiempo sin comprar.',
  },
  {
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#1E3A2F"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    titulo: 'Control de gastos',
    texto: 'Registra cada gasto por categoría. Sabe exactamente en qué se va el dinero del negocio.',
  },
  {
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#1E3A2F"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
    titulo: 'Importa desde Excel',
    texto: '¿Vienes de hojas de cálculo? Importa tus productos, clientes e historial en minutos con CSV.',
  },
]

export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cardActiva, setCardActiva] = useState(0)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
          }
        })
      },
      { threshold: 0.1 }
    )
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* 1. NAVBAR */}
      <header>
        <nav
          className={`fixed top-0 left-0 right-0 z-50 h-16 transition-all duration-300 ${
            scrolled
              ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-[#EDE5DC]'
              : 'bg-transparent'
          }`}
        >
          <div className="w-full h-full flex items-center justify-between px-8 md:px-16">
            <div className="flex flex-col">
              <span className="font-serif text-3xl font-bold text-[#1E3A2F] tracking-tight leading-none">
                POLEA
              </span>
              <span className="text-[10px] text-[#8A7D72] uppercase tracking-widest mt-0.5 hidden sm:block">
                Tu tienda, clara
              </span>
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
          </div>
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
      <section
        className="min-h-screen flex items-center pt-16 relative overflow-hidden"
        style={{ background: '#FAF6F0' }}
      >
        <div
          className="absolute -left-32 top-1/4 w-96 h-96 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, #C4622D22 0%, transparent 70%)' }}
        />
        <div
          className="absolute -right-20 top-10 w-72 h-72 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #1E3A2F33 0%, transparent 70%)' }}
        />
        <div
          className="absolute left-8 bottom-20 w-48 h-48 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #D4A85333 0%, transparent 70%)' }}
        />

        <div className="absolute left-0 top-0 bottom-0 w-40 flex-col justify-center gap-5 pl-4 pr-2 opacity-25 pointer-events-none hidden lg:flex">
          {['$6.1M', '+23%', '328', '$520K'].map((val, i) => (
            <div
              key={val}
              className="flex items-center gap-2"
              style={{ animation: `fadeInLeft 0.6s ease ${0.5 + i * 0.2}s both` }}
            >
              <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, #C4622D44)' }} />
              <span className="font-serif text-xs text-[#C4622D] whitespace-nowrap">{val}</span>
            </div>
          ))}
        </div>

        <div className="absolute right-0 top-0 bottom-0 w-40 flex-col justify-center gap-5 pr-4 pl-2 opacity-25 pointer-events-none hidden lg:flex">
          {['WhatsApp', 'Instagram', 'Wompi', 'Bold'].map((val, i) => (
            <div
              key={val}
              className="flex items-center gap-2"
              style={{ animation: `fadeInRight 0.6s ease ${0.5 + i * 0.2}s both` }}
            >
              <span className="font-serif text-xs text-[#1E3A2F] whitespace-nowrap">{val}</span>
              <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, #1E3A2F44)' }} />
            </div>
          ))}
        </div>

        <div className="w-full max-w-5xl mx-auto px-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center py-28 relative z-10">
          <div style={{ animation: 'fadeInLeft 0.8s ease forwards' }}>
            <div
              className="inline-flex items-center gap-2 bg-white border border-[#EDE5DC] rounded-full px-5 py-2 text-sm text-[#4A3F35] font-medium mb-6 shadow-sm"
              style={{ animation: 'fadeInUp 0.5s ease forwards' }}
            >
              <span className="w-2 h-2 rounded-full bg-[#3A7D5A] animate-pulse-soft inline-block" />
              Para emprendedores que quieren claridad financiera
            </div>

            <h1 className="font-serif text-[52px] md:text-[72px] font-medium text-[#1A1510] leading-[1.05] mb-6">
              Vende más.
              <br />
              Gana más.
              <br />
              <span className="shimmer-text">Sabe exactamente cuánto.</span>
            </h1>

            <p
              className="text-[#8A7D72] text-xl leading-relaxed mb-10"
              style={{ animation: 'fadeInUp 0.8s ease 0.3s both' }}
            >
              Registra ventas, controla tu inventario y conoce tu ganancia real. Diseñado para tiendas que
              venden por WhatsApp, Instagram y presencial.
            </p>

            <div className="flex gap-3 flex-wrap" style={{ animation: 'fadeInUp 0.8s ease 0.5s both' }}>
              <Link
                href="/registro"
                className="bg-[#C4622D] text-white px-8 py-4 rounded-xl text-base font-semibold hover:bg-[#E8845A] transition-all hover:shadow-lg hover:-translate-y-0.5 transform"
              >
                Prueba ya
              </Link>
              <a
                href={WA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-[#1E3A2F] text-[#1E3A2F] px-8 py-4 rounded-xl text-base font-semibold hover:bg-[#1E3A2F] hover:text-white transition-all hover:shadow-lg hover:-translate-y-0.5 transform"
              >
                Agenda tu demo
              </a>
            </div>

            <div className="flex gap-8 mt-8" style={{ animation: 'fadeInUp 0.8s ease 0.7s both' }}>
              {[
                { valor: '+300', label: 'productos en inventario' },
                { valor: '$7M+', label: 'en ventas registradas' },
                { valor: '5', label: 'canales de venta' },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="font-serif text-2xl font-medium text-[#1E3A2F]">{stat.valor}</p>
                  <p className="text-xs text-[#8A7D72] mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative" style={{ animation: 'fadeInRight 0.8s ease 0.2s both', overflow: 'visible' }}>
            <div className="absolute inset-0 bg-[#C4622D]/10 rounded-3xl blur-3xl scale-110" />

            <div className="relative animate-float">
              <div className="bg-[#1E3A2F] rounded-2xl p-5 shadow-2xl">
                <div className="bg-[#FAF6F0] rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-base font-medium text-[#1A1510]">Dashboard</span>
                    <div className="w-8 h-8 rounded-full bg-[#C4622D] flex items-center justify-center text-white text-sm font-bold">
                      P
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Hoy', value: '$520K', color: '#C4622D' },
                      { label: 'Este mes', value: '$6.1M', color: '#1E3A2F' },
                      { label: 'Stock bajo', value: '3', color: '#C44040' },
                    ].map((kpi, i) => (
                      <div
                        key={kpi.label}
                        className="bg-white rounded-lg p-3 shadow-sm"
                        style={{ animation: `countUp 0.5s ease ${0.8 + i * 0.15}s both` }}
                      >
                        <p className="text-[11px] text-[#8A7D72]">{kpi.label}</p>
                        <p className="font-serif text-lg font-medium" style={{ color: kpi.color }}>
                          {kpi.value}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-[11px] text-[#8A7D72] mb-2">Últimas ventas</p>
                    {[
                      { prod: 'Aretes luna', canal: 'WhatsApp', neto: '$81.5K', delay: '1.1s' },
                      { prod: 'Collar sol', canal: 'Instagram', neto: '$115K', delay: '1.25s' },
                      { prod: 'Anillo', canal: 'Presencial', neto: '$62K', delay: '1.4s' },
                    ].map((v) => (
                      <div
                        key={v.prod}
                        className="flex items-center justify-between py-1.5 border-b border-[#FAF6F0] last:border-0"
                        style={{ animation: `fadeInUp 0.4s ease ${v.delay} both` }}
                      >
                        <span className="text-[11px] text-[#1A1510] font-medium">{v.prod}</span>
                        <span className="text-[10px] bg-[#E8F5EE] text-[#3A7D5A] px-2 py-0.5 rounded-full">
                          {v.canal}
                        </span>
                        <span className="text-[11px] font-bold text-[#1E3A2F]">{v.neto}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div
              className="absolute -bottom-4 -left-6 bg-white rounded-xl shadow-xl p-4 border border-[#EDE5DC]"
              style={{ animation: 'fadeInUp 0.6s ease 1.5s both' }}
            >
              <p className="text-xs text-[#8A7D72]">Neto este mes</p>
              <p className="font-serif text-xl font-medium text-[#1E3A2F]">$6.1M</p>
              <p className="text-xs text-[#3A7D5A] mt-0.5">↑ 23% vs mes anterior</p>
            </div>

            <div
              className="absolute top-4 -right-16 bg-[#1E3A2F] rounded-xl shadow-xl p-4"
              style={{ animation: 'fadeInUp 0.6s ease 1.7s both' }}
            >
              <p className="text-xs text-white/60">Comisión Wompi</p>
              <p className="font-serif text-base font-medium text-white">-$4.488</p>
              <p className="text-xs text-[#E8845A]">Calculado automático</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20 border-b border-[#EDE5DC]">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-xs uppercase tracking-widest text-[#8A7D72] mb-10 font-medium">
            Toma decisiones con información real
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {propuestaValor.map((item, i) => (
              <div key={i} className={`text-center reveal reveal-delay-${i + 1}`}>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 mx-auto"
                  style={{ background: '#FAF6F0', border: '1px solid #EDE5DC' }}
                >
                  {item.icon}
                </div>
                <p className="text-base font-semibold text-[#1E3A2F] mb-2">{item.titulo}</p>
                <p className="text-sm text-[#8A7D72] leading-relaxed">{item.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="problema" className="py-16" style={{ background: '#FAF6F0' }}>
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="font-serif text-[36px] text-center text-[#1A1510] mb-3">¿Te suena familiar?</h2>
          <p className="text-center text-[#8A7D72] mb-16">Si gestionas un negocio, seguro has pasado por esto.</p>

          <div className="relative max-w-2xl mx-auto py-8">
            <div
              key={cardActiva}
              className="bg-white rounded-2xl p-8 border border-[#EDE5DC] shadow-sm flex flex-col justify-center transition-all duration-300"
              style={{ animation: 'fadeInUp 0.4s ease forwards' }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                style={{ background: '#FAF6F0', border: '1px solid #EDE5DC' }}
              >
                {painPoints[cardActiva].icon}
              </div>
              <h3 className="font-serif text-[22px] font-medium text-[#1A1510] mb-2">
                {painPoints[cardActiva].titulo}
              </h3>
              <p className="text-[#8A7D72] leading-relaxed">{painPoints[cardActiva].texto}</p>
            </div>
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
      <section id="funcionalidades" className="bg-white py-20 max-w-7xl mx-auto px-6">
        <h2 className="font-serif text-[36px] text-center mb-2">Todo lo que necesitas</h2>
        <p className="text-center text-[#8A7D72] mb-12">Poderoso para crecer, simple para empezar.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.titulo}
              className="bg-[#FAF6F0] rounded-2xl p-6 border border-[#EDE5DC] reveal transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-[#C4622D]/30 cursor-default"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: '#FAF6F0', border: '1px solid #EDE5DC' }}
              >
                {feature.icon}
              </div>
              <h3 className="font-semibold text-[#1E3A2F] mb-2">{feature.titulo}</h3>
              <p className="text-sm text-[#8A7D72]">{feature.texto}</p>
              {feature.badge && (
                <span className="inline-block mt-3 text-xs bg-[#C4622D] text-white px-2.5 py-1 rounded-full font-medium">
                  {feature.badge}
                </span>
              )}
              {feature.extra && <p className="text-sm text-[#8A7D72] mt-2">{feature.extra}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* 6. DIFERENCIADOR */}
      <section className="bg-[#1E3A2F] py-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
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
              <div className="flex justify-between text-sm" style={{ animation: 'countUp 0.5s ease 0.3s both' }}>
                <span className="text-[#8A7D72]">Total bruto</span>
                <span className="text-[#1A1510] font-medium">$120.000</span>
              </div>
              <div className="flex justify-between text-sm" style={{ animation: 'countUp 0.5s ease 0.4s both' }}>
                <span className="text-[#8A7D72]">Plataforma</span>
                <span className="bg-[#FAF6F0] text-[#4A3F35] px-2 py-0.5 rounded-full text-xs font-medium">
                  Wompi
                </span>
              </div>
              <div
                className="flex justify-between text-sm text-[#C44040]"
                style={{ animation: 'countUp 0.5s ease 0.5s both' }}
              >
                <span>Comisión (2.99% + $900)</span>
                <span className="font-medium">-$4.488</span>
              </div>
              <div
                className="border-t border-[#EDE5DC] pt-3 flex justify-between"
                style={{ animation: 'countUp 0.5s ease 0.6s both' }}
              >
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
          <div className="bg-[#FAF6F0] rounded-2xl p-8 border border-[#EDE5DC] w-full max-w-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
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

          <div className="bg-[#1E3A2F] rounded-2xl p-8 border border-[#1E3A2F] w-full max-w-sm relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-2">
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
      <section
        className="py-20 text-center px-6"
        style={{
          background: 'linear-gradient(135deg, #C4622D 0%, #E8845A 50%, #C4622D 100%)',
          backgroundSize: '200% 200%',
          animation: 'shimmer 4s ease infinite',
        }}
      >
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
        <div className="max-w-7xl mx-auto flex justify-between items-start flex-wrap gap-8">
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
