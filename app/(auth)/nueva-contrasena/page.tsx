'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { actualizarContrasena } from '../actions'

export default function NuevaContrasenaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getSession()
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const password = formData.get('password') as string
    const confirmar = formData.get('confirmar') as string

    if (password !== confirmar) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)
    setError(null)
    const result = await actualizarContrasena(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }
    setLoading(false)
    router.push('/dashboard')
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
            <p className="font-serif text-xl font-bold text-white leading-none">LEVA</p>
            <p className="text-[10px] text-white/50 uppercase tracking-widest leading-none mt-0.5">Tu negocio, sin enredos.</p>
          </div>
        </div>
        <div className="relative z-10">
          <h2 className="font-serif text-4xl font-medium text-white leading-tight mb-6">
            Nueva contraseña,
            <br />
            <span className="text-[#C4622D]">nuevo comienzo.</span>
          </h2>
          <p className="text-white/60 text-base leading-relaxed max-w-sm">
            Elige una contraseña segura para proteger tu cuenta.
          </p>
        </div>
        <p className="text-white/30 text-xs relative z-10">© 2026 Leva · Una solución de Polea</p>
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
            <p className="font-serif text-xl font-bold text-[#1E3A2F]">LEVA</p>
          </div>

          <h1 className="font-serif text-3xl font-medium text-[#1E3A2F] mb-2">Nueva contraseña</h1>
          <p className="text-[#8A7D72] text-sm mb-8">Elige una contraseña segura para tu cuenta.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[#4A3F35] mb-1.5">Nueva contraseña</label>
              <input
                type="password"
                name="password"
                required
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-3 rounded-xl border border-[#EDE5DC] bg-white text-sm text-[#1A1510] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/20 focus:border-[#C4622D] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4A3F35] mb-1.5">Confirmar contraseña</label>
              <input
                type="password"
                name="confirmar"
                required
                placeholder="Repite la contraseña"
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
              {loading ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
