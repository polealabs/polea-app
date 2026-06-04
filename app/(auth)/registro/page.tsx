'use client'

import { useState } from 'react'
import Link from 'next/link'
import { registro } from '../actions'

function calcularFortaleza(pwd: string) {
  if (!pwd) return null
  let score = 0
  if (pwd.length >= 6) score++
  if (pwd.length >= 10) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  if (score <= 1) return { color: '#C44040', label: 'Débil', ancho: '33%' }
  if (score <= 3) return { color: '#D4A853', label: 'Media', ancho: '66%' }
  return { color: '#3A7D5A', label: 'Fuerte', ancho: '100%' }
}

export default function RegistroPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [emailIngresado, setEmailIngresado] = useState('')
  const [needsConfirmation, setNeedsConfirmation] = useState(false)

  const fortaleza = calcularFortaleza(password)
  const cumpleLongitud = password.length >= 6

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await registro(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else if (result?.needsConfirmation) {
      setNeedsConfirmation(true)
      setLoading(false)
    }
  }

  const panelIzquierdo = (
    <div className="hidden lg:flex lg:w-1/2 bg-[#1E3A2F] flex-col justify-between p-12 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5">
        <svg width="400" height="400" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
          <circle cx="90" cy="90" r="70" fill="none" stroke="#FAF6F0" strokeWidth="10" />
          <line x1="90" y1="20" x2="90" y2="160" stroke="#FAF6F0" strokeWidth="5" />
          <line x1="20" y1="90" x2="160" y2="90" stroke="#FAF6F0" strokeWidth="5" />
          <line x1="40" y1="40" x2="140" y2="140" stroke="#FAF6F0" strokeWidth="5" />
          <line x1="140" y1="40" x2="40" y2="140" stroke="#FAF6F0" strokeWidth="5" />
          <circle cx="90" cy="90" r="28" fill="none" stroke="#FAF6F0" strokeWidth="8" />
          <circle cx="90" cy="90" r="8" fill="#C4622D" />
        </svg>
      </div>

      <div className="flex items-center gap-3 relative z-10">
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="rgba(255,255,255,0.1)" />
          <circle cx="16" cy="14" r="9" fill="none" stroke="#FAF6F0" strokeWidth="2.5" />
          <circle cx="16" cy="14" r="4" fill="none" stroke="#FAF6F0" strokeWidth="2" />
          <circle cx="16" cy="14" r="1.5" fill="#C4622D" />
          <line x1="16" y1="23" x2="16" y2="29" stroke="#C4622D" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <div>
          <p className="font-serif text-xl font-bold text-white leading-none">POLEA</p>
          <p className="text-[10px] text-white/50 uppercase tracking-widest leading-none mt-0.5">Tu tienda, clara</p>
        </div>
      </div>

      <div className="relative z-10">
        <h2 className="font-serif text-4xl font-medium text-white leading-tight mb-6">
          Crece con orden,
          <br />
          <span className="text-[#C4622D]">vende con claridad.</span>
        </h2>
        <p className="text-white/60 text-base leading-relaxed max-w-sm">
          Empieza hoy con Polea y centraliza inventario, ventas y rentabilidad de tu tienda.
        </p>

        <div className="flex gap-8 mt-10">
          <div>
            <p className="font-serif text-2xl font-bold text-white">+328</p>
            <p className="text-white/40 text-xs mt-0.5">negocios activos</p>
          </div>
          <div>
            <p className="font-serif text-2xl font-bold text-white">5 min</p>
            <p className="text-white/40 text-xs mt-0.5">para empezar</p>
          </div>
        </div>
      </div>

      <p className="text-white/30 text-xs relative z-10">© 2026 Polea · Cali, Colombia</p>
    </div>
  )

  if (needsConfirmation) {
    return (
      <div className="min-h-screen flex">
        {panelIzquierdo}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-[#FAF6F0]">
          <div className="w-full max-w-sm text-center">
            <div className="w-16 h-16 rounded-full bg-[#E8F5EE] flex items-center justify-center mx-auto mb-6">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3A7D5A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .82h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
            </div>
            <h1 className="font-serif text-2xl font-medium text-[#1E3A2F] mb-3">Revisa tu correo</h1>
            <p className="text-[#8A7D72] text-sm leading-relaxed mb-2">
              Te enviamos un enlace de confirmación a
            </p>
            <p className="text-[#1E3A2F] font-semibold text-sm mb-6">{emailIngresado}</p>
            <p className="text-[#8A7D72] text-xs leading-relaxed mb-8">
              Abre el correo y haz clic en el enlace para activar tu cuenta. Si no lo ves, revisa la carpeta de spam.
            </p>
            <Link
              href="/login"
              className="inline-block w-full bg-[#C4622D] hover:bg-[#E8845A] text-white font-semibold py-3 rounded-xl transition text-sm text-center"
            >
              Ir a iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {panelIzquierdo}

      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-[#FAF6F0]">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <svg width="28" height="28" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="8" fill="#1E3A2F" />
              <circle cx="16" cy="14" r="9" fill="none" stroke="#FAF6F0" strokeWidth="2.5" />
              <circle cx="16" cy="14" r="4" fill="none" stroke="#FAF6F0" strokeWidth="2" />
              <circle cx="16" cy="14" r="1.5" fill="#C4622D" />
              <line x1="16" y1="23" x2="16" y2="29" stroke="#C4622D" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <p className="font-serif text-xl font-bold text-[#1E3A2F]">POLEA</p>
          </div>

          <h1 className="font-serif text-3xl font-medium text-[#1E3A2F] mb-2">Crea tu cuenta</h1>
          <p className="text-[#8A7D72] text-sm mb-8">Empieza a gestionar tu tienda en Polea</p>

          <form action={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[#4A3F35] mb-1.5">Nombre completo</label>
              <input
                type="text"
                name="nombre"
                placeholder="Tu nombre"
                className="w-full px-4 py-3 rounded-xl border border-[#EDE5DC] bg-white text-sm text-[#1A1510] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/20 focus:border-[#C4622D] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4A3F35] mb-1.5">Correo electrónico</label>
              <input
                type="email"
                name="email"
                required
                placeholder="tu@correo.com"
                value={emailIngresado}
                onChange={(e) => setEmailIngresado(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#EDE5DC] bg-white text-sm text-[#1A1510] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/20 focus:border-[#C4622D] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4A3F35] mb-1.5">Contraseña</label>
              <input
                type="password"
                name="password"
                required
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#EDE5DC] bg-white text-sm text-[#1A1510] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/20 focus:border-[#C4622D] transition"
              />
              {password && (
                <div className="mt-2">
                  <div className="h-1.5 rounded-full bg-[#EDE5DC] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: fortaleza?.ancho ?? '0%', backgroundColor: fortaleza?.color }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs" style={{ color: cumpleLongitud ? '#3A7D5A' : '#C44040' }}>
                      {cumpleLongitud ? '✓' : '✗'} Mínimo 6 caracteres
                    </span>
                    {fortaleza && (
                      <span className="text-xs font-semibold" style={{ color: fortaleza.color }}>
                        {fortaleza.label}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-[#FDEAEA] border border-[#F3D4D4] rounded-xl px-4 py-3">
                <p className="text-sm text-[#C44040]">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#C4622D] hover:bg-[#E8845A] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition text-sm"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-center text-sm text-[#8A7D72] mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-[#C4622D] font-semibold hover:underline">
              Iniciar sesión
            </Link>
          </p>

          <p className="text-center text-xs text-[#8A7D72]/50 mt-8">
            Al registrarte aceptas nuestros <a href="#" className="hover:underline">Términos de uso</a> y{' '}
            <a href="#" className="hover:underline">Política de privacidad</a>
          </p>
        </div>
      </div>
    </div>
  )
}
