'use client'

import { useState } from 'react'
import Link from 'next/link'
import { registro } from '../actions'

export default function RegistroPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await registro(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1E3A2F]">POLEA</h1>
          <p className="text-[#1A1510]/60 mt-2 text-sm">Crea tu cuenta gratis</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-[#1A1510]/8 p-8">
          <form action={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#1A1510] mb-1.5">
                Nombre completo
              </label>
              <input
                name="nombre"
                type="text"
                placeholder="Tu nombre"
                className="w-full px-4 py-2.5 rounded-lg border border-[#1A1510]/20 bg-white text-[#1A1510] placeholder:text-[#1A1510]/40 focus:outline-none focus:ring-2 focus:ring-[#C4622D]/40 focus:border-[#C4622D] transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1510] mb-1.5">
                Correo electrónico
              </label>
              <input
                name="email"
                type="email"
                required
                placeholder="tu@correo.com"
                className="w-full px-4 py-2.5 rounded-lg border border-[#1A1510]/20 bg-white text-[#1A1510] placeholder:text-[#1A1510]/40 focus:outline-none focus:ring-2 focus:ring-[#C4622D]/40 focus:border-[#C4622D] transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1510] mb-1.5">
                Contraseña
              </label>
              <input
                name="password"
                type="password"
                required
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-2.5 rounded-lg border border-[#1A1510]/20 bg-white text-[#1A1510] placeholder:text-[#1A1510]/40 focus:outline-none focus:ring-2 focus:ring-[#C4622D]/40 focus:border-[#C4622D] transition"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#C4622D] hover:bg-[#E8845A] text-white font-semibold py-2.5 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>
          <p className="text-center text-sm text-[#1A1510]/60 mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-[#C4622D] font-medium hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
