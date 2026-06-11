'use client'

import { useState } from 'react'
import Link from 'next/link'
import { login } from '../actions'
import { LevaLogo } from '@/components/ui/LevaLogo'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    const params = new URLSearchParams(window.location.search)
    const redirect = params.get('redirect')
    if (redirect) {
      window.location.href = redirect
    } else {
      window.location.href = '/dashboard'
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-[#0D0D0D] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5">
          <svg width="400" height="400" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
            <circle cx="90" cy="90" r="70" fill="none" stroke="#F4F1EA" strokeWidth="10" />
            <line x1="90" y1="20" x2="90" y2="160" stroke="#F4F1EA" strokeWidth="5" />
            <line x1="20" y1="90" x2="160" y2="90" stroke="#F4F1EA" strokeWidth="5" />
            <line x1="40" y1="40" x2="140" y2="140" stroke="#F4F1EA" strokeWidth="5" />
            <line x1="140" y1="40" x2="40" y2="140" stroke="#F4F1EA" strokeWidth="5" />
            <circle cx="90" cy="90" r="28" fill="none" stroke="#F4F1EA" strokeWidth="8" />
            <circle cx="90" cy="90" r="8" fill="#4A90D9" />
          </svg>
        </div>

        <Link href="/" className="flex items-center gap-3 relative z-10 hover:opacity-80 transition-opacity">
          <LevaLogo size={32} />
          <div>
            <p className="font-serif text-xl font-bold text-white leading-none">LEVA</p>
            <p className="text-[10px] text-white/50 uppercase tracking-widest leading-none mt-0.5">Tu negocio, sin enredos.</p>
          </div>
        </Link>

        <div className="relative z-10">
          <h2 className="font-serif text-4xl font-medium text-white leading-tight mb-6">
            Tu negocio,
            <br />
            <span className="text-[#4A90D9]">bajo control.</span>
          </h2>
          <p className="text-white/60 text-base leading-relaxed max-w-sm">
            Registra ventas, controla tu inventario y conoce tu ganancia real. Todo en un solo lugar.
          </p>

          <div className="flex gap-8 mt-10">
            <div>
              <p className="font-serif text-2xl font-bold text-white">+328</p>
              <p className="text-white/40 text-xs mt-0.5">negocios activos</p>
            </div>
            <div>
              <p className="font-serif text-2xl font-bold text-white">$6.1M</p>
              <p className="text-white/40 text-xs mt-0.5">en ventas registradas</p>
            </div>
          </div>
        </div>

        <p className="text-white/55 text-xs relative z-10">© 2026 Leva · Una solución de Polea</p>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-[#F4F1EA]">
        <div className="w-full max-w-sm">
          <Link href="/" className="flex items-center gap-2 mb-10 lg:hidden hover:opacity-70 transition-opacity">
            <LevaLogo size={28} />
            <p className="font-serif text-xl font-bold text-[#1E3A2F]">LEVA</p>
          </Link>

          <h1 className="font-serif text-3xl font-medium text-[#1E3A2F] mb-2">Bienvenido</h1>
          <p className="text-[#4A463C] text-sm mb-8">Inicia sesión en tu cuenta de Leva</p>

          <form
            onSubmit={async (e) => {
              e.preventDefault()
              await handleSubmit(new FormData(e.currentTarget))
            }}
            className="space-y-5"
          >
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-[#4A463C] mb-1.5">Correo electrónico</label>
              <input
                id="login-email"
                type="email"
                name="email"
                required
                placeholder="tu@correo.com"
                className="w-full px-4 py-3 rounded-xl border border-[#DCD7CA] bg-white text-sm text-[#16140F] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9] transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="block text-xs font-semibold text-[#4A463C]">Contraseña</label>
                <a href="/recuperar-contrasena" className="text-xs text-[#4A90D9] hover:underline">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <input
                id="login-password"
                type="password"
                name="password"
                required
                placeholder="Tu contraseña"
                className="w-full px-4 py-3 rounded-xl border border-[#DCD7CA] bg-white text-sm text-[#16140F] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9] transition"
              />
            </div>

            {error && (
              <div className="bg-[#FDEAEA] border border-[#F3D4D4] rounded-xl px-4 py-3">
                <p className="text-sm text-[#C44040]">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#4A90D9] hover:bg-[#5C9FE0] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition text-sm"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="text-center text-sm text-[#4A463C] mt-6">
            ¿No tienes cuenta?{' '}
            <Link href="/registro" className="text-[#4A90D9] font-semibold hover:underline">
              Crear cuenta
            </Link>
          </p>

          <p className="text-center text-xs text-[#4A463C]/50 mt-8">
            Al iniciar sesión aceptas nuestros <a href="#" className="hover:underline">Términos de uso</a> y{' '}
            <a href="#" className="hover:underline">Política de privacidad</a>
          </p>
        </div>
      </div>
    </div>
  )
}
