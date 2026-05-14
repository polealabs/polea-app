'use client'

import { useState } from 'react'
import Link from 'next/link'
import { solicitarRecuperacion } from '../actions'

export default function RecuperarContrasenaPage() {
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await solicitarRecuperacion(new FormData(e.currentTarget))
    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }
    setEnviado(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex">
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
            Sin estrés,
            <br />
            <span className="text-[#C4622D]">sin bloqueos.</span>
          </h2>
          <p className="text-white/60 text-base leading-relaxed max-w-sm">
            Te enviamos un enlace para que recuperes el acceso a tu cuenta en segundos.
          </p>
        </div>
        <p className="text-white/30 text-xs relative z-10">© 2026 Polea · Cali, Colombia</p>
      </div>

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

          {enviado ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-[#E8F5EE] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3A7D5A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h1 className="font-serif text-2xl font-medium text-[#1E3A2F] mb-2">Revisa tu correo</h1>
              <p className="text-[#8A7D72] text-sm mb-6">
                Te enviamos un enlace para restablecer tu contraseña. Puede tardar unos minutos.
              </p>
              <Link href="/login" className="text-sm text-[#C4622D] font-semibold hover:underline">
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-serif text-3xl font-medium text-[#1E3A2F] mb-2">Recuperar contraseña</h1>
              <p className="text-[#8A7D72] text-sm mb-8">
                Ingresa tu correo y te enviamos un enlace para restablecer tu contraseña.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-[#4A3F35] mb-1.5">Correo electrónico</label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="tu@correo.com"
                    className="w-full px-4 py-3 rounded-xl border border-[#EDE5DC] bg-white text-sm text-[#1A1510] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/20 focus:border-[#C4622D] transition"
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
                  className="w-full bg-[#C4622D] hover:bg-[#E8845A] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition text-sm"
                >
                  {loading ? 'Enviando...' : 'Enviar enlace'}
                </button>
              </form>

              <p className="text-center text-sm text-[#8A7D72] mt-6">
                <Link href="/login" className="text-[#C4622D] font-semibold hover:underline">
                  Volver al inicio de sesión
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
