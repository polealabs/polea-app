'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { crearTienda } from '../actions-tienda'
import { INDUSTRIAS } from '@/lib/industrias'
import { createClient } from '@/lib/supabase/client'

const ICONOS: Record<string, string> = {
  'Restaurante': '🍽️',
  'Cafetería / Coffee shop': '☕',
  'Panadería / Pastelería': '🥐',
  'Bar / Licorería': '🍺',
  'Comida rápida': '🍔',
  'Catering / Eventos': '🎪',
  'Tienda de productos naturales': '🌿',
  'Ropa y calzado': '👗',
  'Joyería y accesorios': '💎',
  'Bolsos y marroquinería': '👜',
  'Ropa deportiva': '🏃',
  'Ropa infantil': '🧒',
  'Peluquería / Barbería': '✂️',
  'Spa / Centro de estética': '💆',
  'Nail art / Manicure': '💅',
  'Cosméticos y maquillaje': '💄',
  'Productos capilares': '🧴',
  'Gimnasio / Fitness': '💪',
  'Yoga / Pilates': '🧘',
  'Nutrición y suplementos': '🥗',
  'Fisioterapia': '🩺',
  'Medicina alternativa': '🌱',
  'Ferretería': '🔧',
  'Materiales de construcción': '🧱',
  'Muebles y decoración': '🛋️',
  'Artículos para el hogar': '🏠',
  'Iluminación': '💡',
  'Venta de dispositivos': '📱',
  'Reparación de equipos': '🔨',
  'Accesorios tecnológicos': '🖥️',
  'Servicios de impresión': '🖨️',
  'Arte y manualidades': '🎨',
  'Fotografía': '📷',
  'Música / Instrumentos': '🎸',
  'Juguetería': '🧸',
  'Librería / Papelería': '📚',
  'Consultoría': '💼',
  'Diseño gráfico / Publicidad': '🎯',
  'Educación / Clases': '📖',
  'Servicios de limpieza': '🧹',
  'Mensajería / Logística': '📦',
  'Veterinaria': '🐾',
  'Accesorios para mascotas': '🐕',
  'Peluquería canina': '✂️',
  'Tienda de regalos': '🎁',
  'Floristeria': '🌸',
  'Supermercado / Minimercado': '🛒',
  'Farmacia / Droguería': '💊',
  'Óptica': '👓',
  'Otro': '📋',
}

const TOTAL = 5

function PolеaDecor({ opacity = 0.06 }: { opacity?: number }) {
  return (
    <svg
      width="520" height="520" viewBox="0 0 180 180"
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity }}
      className="pointer-events-none select-none"
    >
      <circle cx="90" cy="90" r="70" fill="none" stroke="#FAF6F0" strokeWidth="10" />
      <line x1="90" y1="20" x2="90" y2="160" stroke="#FAF6F0" strokeWidth="5" />
      <line x1="20" y1="90" x2="160" y2="90" stroke="#FAF6F0" strokeWidth="5" />
      <line x1="40" y1="40" x2="140" y2="140" stroke="#FAF6F0" strokeWidth="5" />
      <line x1="140" y1="40" x2="40" y2="140" stroke="#FAF6F0" strokeWidth="5" />
      <circle cx="90" cy="90" r="28" fill="none" stroke="#FAF6F0" strokeWidth="8" />
      <circle cx="90" cy="90" r="8" fill="#C4622D" />
    </svg>
  )
}

function Dots({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: TOTAL }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i + 1 === step ? 20 : 8,
            height: 8,
            background: i + 1 <= step ? '#C4622D' : 'rgba(255,255,255,0.25)',
          }}
        />
      ))}
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [nombre, setNombre] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [direccion, setDireccion] = useState('')
  const [categoria, setCategoria] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dots, setDots] = useState('.')

  useEffect(() => {
    const supabase = createClient()
    void supabase.from('tiendas').select('id').limit(1).then(({ data }) => {
      if (data && data.length > 0) router.replace('/dashboard')
    })
  }, [router])

  useEffect(() => {
    if (!creando) return
    let count = 1
    const timer = setInterval(() => {
      count = count >= 3 ? 1 : count + 1
      setDots('.'.repeat(count))
    }, 400)
    return () => clearInterval(timer)
  }, [creando])

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setLogoError('Formato no válido. Usa JPG, PNG o WebP.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('El archivo supera 2MB.')
      return
    }
    setLogoError(null)
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function handleCrear() {
    if (!nombre.trim()) { setError('El nombre del negocio es obligatorio'); return }
    if (!categoria) { setError('Selecciona la categoría de tu negocio'); return }
    setError(null)
    setCreando(true)
    const fd = new FormData()
    fd.set('nombre', nombre.trim())
    fd.set('ciudad', ciudad.trim())
    fd.set('direccion', direccion.trim())
    fd.set('categoria', categoria)
    fd.set('whatsapp', whatsapp.trim())
    fd.set('moneda', 'COP')
    if (logoFile) fd.set('logo', logoFile)
    const result = await crearTienda(fd)
    if (result?.error) {
      setError(result.error)
      setCreando(false)
    }
  }

  const inputClass = 'w-full px-4 py-3.5 rounded-xl border border-[#EDE5DC] bg-white text-[#1A1510] text-base placeholder:text-[#1A1510]/35 focus:outline-none focus:ring-2 focus:ring-[#C4622D]/25 focus:border-[#C4622D] transition'

  // Loading state
  if (creando) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{ background: '#1E3A2F' }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <PolеaDecor opacity={0.05} />
        </div>
        <div className="relative z-10 text-center">
          <div className="flex items-center justify-center gap-2 mb-10">
            <svg width="36" height="36" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="8" fill="rgba(255,255,255,0.1)" />
              <circle cx="16" cy="14" r="9" fill="none" stroke="#FAF6F0" strokeWidth="2.5" />
              <circle cx="16" cy="14" r="4" fill="none" stroke="#FAF6F0" strokeWidth="2" />
              <circle cx="16" cy="14" r="1.5" fill="#C4622D" />
              <line x1="16" y1="23" x2="16" y2="29" stroke="#C4622D" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <p className="font-serif text-2xl font-bold text-white">POLEA</p>
          </div>
          <p className="text-white/50 text-sm uppercase tracking-widest mb-3">Un momento</p>
          <p className="font-serif text-3xl font-medium text-white">
            Creando tu negocio<span style={{ display: 'inline-block', minWidth: 28, textAlign: 'left' }}>{dots}</span>
          </p>
        </div>
      </div>
    )
  }

  // Welcome screen
  if (step === 0) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
        style={{ background: '#1E3A2F' }}
      >
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <PolеaDecor opacity={0.06} />
        </div>
        <div className="relative z-10 text-center max-w-md">
          <div className="flex items-center justify-center gap-3 mb-10">
            <svg width="44" height="44" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="8" fill="rgba(255,255,255,0.1)" />
              <circle cx="16" cy="14" r="9" fill="none" stroke="#FAF6F0" strokeWidth="2.5" />
              <circle cx="16" cy="14" r="4" fill="none" stroke="#FAF6F0" strokeWidth="2" />
              <circle cx="16" cy="14" r="1.5" fill="#C4622D" />
              <line x1="16" y1="23" x2="16" y2="29" stroke="#C4622D" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <p className="font-serif text-3xl font-bold text-white tracking-wide">POLEA</p>
          </div>

          <h1 className="font-serif text-4xl font-medium text-white leading-tight mb-5">
            Bienvenido a Polea
          </h1>
          <p className="text-white/65 text-base leading-relaxed mb-10">
            La herramienta que va a ayudarte a llevar las cuentas de tu negocio, vender con claridad y crecer con orden — sin complicaciones.
          </p>

          <button
            onClick={() => setStep(1)}
            className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 bg-[#C4622D] hover:bg-[#E8845A] text-white font-semibold py-4 rounded-2xl transition text-base"
          >
            Empezar
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>

          <p className="text-white/25 text-xs mt-6">Solo toma 2 minutos</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-4 py-6 overflow-y-auto"
      style={{ background: '#1E3A2F' }}
    >
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
        <PolеaDecor opacity={0.04} />
      </div>

      <div className="relative z-10 w-full" style={{ maxWidth: step === 3 ? 720 : 460 }}>
        <Dots step={step} />

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-6 sm:p-8">
            <p className="text-xs font-semibold text-[#8A7D72] uppercase tracking-widest mb-3">
              Paso {step} de {TOTAL}
            </p>

            {/* Step 1: Nombre */}
            {step === 1 && (
              <div>
                <h2 className="font-serif text-2xl font-medium text-[#1E3A2F] mb-1">¿Cómo se llama tu negocio?</h2>
                <p className="text-sm text-[#8A7D72] mb-6">Este nombre aparecerá en tus documentos y reportes.</p>
                <input
                  type="text"
                  placeholder="Ej: Vaza Jewelry, Ferretería El Maestro…"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  autoFocus
                  className={inputClass}
                  onKeyDown={(e) => { if (e.key === 'Enter' && nombre.trim()) setStep(2) }}
                />
              </div>
            )}

            {/* Step 2: Ciudad y dirección */}
            {step === 2 && (
              <div>
                <h2 className="font-serif text-2xl font-medium text-[#1E3A2F] mb-1">¿Dónde está tu negocio?</h2>
                <p className="text-sm text-[#8A7D72] mb-6">Útil para tus cotizaciones y facturas.</p>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Ciudad — Ej: Cali"
                    value={ciudad}
                    onChange={(e) => setCiudad(e.target.value)}
                    autoFocus
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="Dirección — Ej: Calle 10 #5-23"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Categoría */}
            {step === 3 && (
              <div>
                <h2 className="font-serif text-2xl font-medium text-[#1E3A2F] mb-1">¿A qué se dedica tu negocio?</h2>
                <p className="text-sm text-[#8A7D72] mb-5">Selecciona la categoría que mejor te describe.</p>
                <div
                  className="grid gap-2 overflow-y-auto pr-1"
                  style={{
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                    maxHeight: 340,
                  }}
                >
                  {INDUSTRIAS.map((ind) => (
                    <button
                      key={ind}
                      type="button"
                      onClick={() => setCategoria(ind)}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition cursor-pointer"
                      style={{
                        borderColor: categoria === ind ? '#C4622D' : '#EDE5DC',
                        background: categoria === ind ? '#FDF3ED' : '#FAFAFA',
                      }}
                    >
                      <span className="text-2xl leading-none">{ICONOS[ind] ?? '📋'}</span>
                      <span className="text-xs font-medium leading-tight" style={{ color: categoria === ind ? '#C4622D' : '#4A3F35' }}>
                        {ind}
                      </span>
                    </button>
                  ))}
                </div>
                {categoria && (
                  <p className="text-xs text-[#C4622D] font-medium mt-3">
                    ✓ {categoria}
                  </p>
                )}
              </div>
            )}

            {/* Step 4: WhatsApp */}
            {step === 4 && (
              <div>
                <h2 className="font-serif text-2xl font-medium text-[#1E3A2F] mb-1">¿Cuál es tu WhatsApp de negocio?</h2>
                <p className="text-sm text-[#8A7D72] mb-6">Opcional. Se usa para generar links de contacto directo.</p>
                <input
                  type="tel"
                  placeholder="Ej: 3001234567"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  autoFocus
                  className={inputClass}
                />
              </div>
            )}

            {/* Step 5: Logo */}
            {step === 5 && (
              <div>
                <h2 className="font-serif text-2xl font-medium text-[#1E3A2F] mb-1">¿Tienes un logo?</h2>
                <p className="text-sm text-[#8A7D72] mb-6">Opcional. Aparecerá en cotizaciones y documentos. Puedes subirlo después.</p>

                {logoPreview ? (
                  <div className="flex items-center gap-4 mb-4 p-4 bg-[#FAF6F0] rounded-xl border border-[#EDE5DC]">
                    <img src={logoPreview} alt="Logo" className="w-16 h-16 rounded-lg object-cover border border-[#EDE5DC]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1E3A2F] truncate">{logoFile?.name}</p>
                      <p className="text-xs text-[#8A7D72] mt-0.5">Logo cargado correctamente</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setLogoFile(null); setLogoPreview(null) }}
                      className="text-xs text-[#C44040] hover:underline flex-shrink-0"
                    >
                      Quitar
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed border-[#EDE5DC] bg-[#FAFAFA] cursor-pointer hover:border-[#C4622D] hover:bg-[#FDF3ED] transition">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8A7D72" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <div className="text-center">
                      <p className="text-sm font-medium text-[#4A3F35]">Haz clic para subir tu logo</p>
                      <p className="text-xs text-[#8A7D72] mt-1">JPG, PNG o WebP · Máx 2MB · 400×400px recomendado</p>
                    </div>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleLogoChange} className="sr-only" />
                  </label>
                )}
                {logoError && <p className="text-xs text-[#C44040] mt-2">{logoError}</p>}
              </div>
            )}

            {error && (
              <div className="mt-4 bg-[#FDEAEA] border border-[#F3D4D4] rounded-xl px-4 py-3">
                <p className="text-sm text-[#C44040]">{error}</p>
              </div>
            )}
          </div>

          <div
            className="flex items-center gap-3 px-6 sm:px-8 py-5"
            style={{ borderTop: '1px solid #F0EAE3', background: '#FAFAFA' }}
          >
            <button
              type="button"
              onClick={() => { setError(null); setStep(s => s - 1) }}
              className="flex items-center gap-1.5 text-sm text-[#8A7D72] hover:text-[#4A3F35] transition px-3 py-2 rounded-lg hover:bg-[#EDE5DC]/60"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Atrás
            </button>

            <div className="flex-1" />

            {step < TOTAL ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && !nombre.trim()) { setError('Escribe el nombre de tu negocio'); return }
                  if (step === 3 && !categoria) { setError('Selecciona una categoría'); return }
                  setError(null)
                  setStep(s => s + 1)
                }}
                className="flex items-center gap-2 bg-[#C4622D] hover:bg-[#E8845A] text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm"
              >
                Continuar
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCrear}
                disabled={Boolean(logoError)}
                className="flex items-center gap-2 bg-[#1E3A2F] hover:bg-[#2A5040] text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm disabled:opacity-50"
              >
                Crear mi negocio
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
