'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { actualizarContrasena } from '../actions'
import { LevaLogo } from '@/components/ui/LevaLogo'

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
        <div className="flex items-center gap-3 relative z-10">
          <LevaLogo size={32} />
          <div>
            <p className="font-serif text-xl font-bold text-white leading-none">LEVA</p>
            <p className="text-[10px] text-white/50 uppercase tracking-widest leading-none mt-0.5">Tu negocio, sin enredos.</p>
          </div>
        </div>
        <div className="relative z-10">
          <h2 className="font-serif text-4xl font-medium text-white leading-tight mb-6">
            Nueva contraseña,
            <br />
            <span className="text-[#4A90D9]">nuevo comienzo.</span>
          </h2>
          <p className="text-white/60 text-base leading-relaxed max-w-sm">
            Elige una contraseña segura para proteger tu cuenta.
          </p>
        </div>
        <p className="text-white/55 text-xs relative z-10">© 2026 Leva · Una solución de Polea</p>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-[#F4F1EA]">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <LevaLogo size={28} />
            <p className="font-serif text-xl font-bold text-[#1E3A2F]">LEVA</p>
          </div>

          <h1 className="font-serif text-3xl font-medium text-[#1E3A2F] mb-2">Nueva contraseña</h1>
          <p className="text-[#4A463C] text-sm mb-8">Elige una contraseña segura para tu cuenta.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="nc-password" className="block text-xs font-semibold text-[#4A463C] mb-1.5">Nueva contraseña</label>
              <input
                id="nc-password"
                type="password"
                name="password"
                required
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-3 rounded-xl border border-[#DCD7CA] bg-white text-sm text-[#16140F] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9] transition"
              />
            </div>
            <div>
              <label htmlFor="nc-confirmar" className="block text-xs font-semibold text-[#4A463C] mb-1.5">Confirmar contraseña</label>
              <input
                id="nc-confirmar"
                type="password"
                name="confirmar"
                required
                placeholder="Repite la contraseña"
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
              {loading ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
