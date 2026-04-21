'use client'

import { useState } from 'react'
import { crearTienda } from '../actions-tienda'
import { INDUSTRIAS } from '@/lib/industrias'

export default function OnboardingPage() {
  const [error, setError] = useState<string | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

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
    setLogoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await crearTienda(formData)
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
          <p className="text-[#1A1510]/60 mt-2 text-sm">Primero cuéntanos sobre tu tienda</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-[#1A1510]/8 p-8">
          <form action={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#1A1510] mb-1.5">
                Nombre de tu tienda
              </label>
              <input
                name="nombre"
                type="text"
                required
                placeholder="Ej: Vaza Jewelry"
                className="w-full px-4 py-2.5 rounded-lg border border-[#1A1510]/20 bg-white text-[#1A1510] placeholder:text-[#1A1510]/40 focus:outline-none focus:ring-2 focus:ring-[#C4622D]/40 focus:border-[#C4622D] transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1510] mb-1.5">
                Ciudad
              </label>
              <input
                name="ciudad"
                type="text"
                placeholder="Ej: Cali"
                className="w-full px-4 py-2.5 rounded-lg border border-[#1A1510]/20 bg-white text-[#1A1510] placeholder:text-[#1A1510]/40 focus:outline-none focus:ring-2 focus:ring-[#C4622D]/40 focus:border-[#C4622D] transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1510] mb-1.5">
                Categoría / industria
              </label>
              <select
                name="categoria"
                required
                defaultValue=""
                className="w-full px-4 py-2.5 rounded-lg border border-[#1A1510]/20 bg-white text-[#1A1510] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/40 focus:border-[#C4622D] transition"
              >
                <option value="" disabled>
                  Selecciona una industria
                </option>
                {INDUSTRIAS.map((industria) => (
                  <option key={industria} value={industria}>
                    {industria}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1510] mb-1.5">
                WhatsApp
              </label>
              <input
                name="whatsapp"
                type="text"
                placeholder="Ej: 3001234567"
                className="w-full px-4 py-2.5 rounded-lg border border-[#1A1510]/20 bg-white text-[#1A1510] placeholder:text-[#1A1510]/40 focus:outline-none focus:ring-2 focus:ring-[#C4622D]/40 focus:border-[#C4622D] transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1510] mb-1.5">
                Logo (opcional)
              </label>
              <input
                name="logo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleLogoChange}
                className="block w-full text-sm text-[#4A3F35] file:mr-3 file:px-3 file:py-1.5 file:text-xs file:rounded-lg file:border-0 file:bg-[#FAF6F0] file:text-[#4A3F35] hover:file:bg-[#F9EDE5]"
              />
              <p className="text-xs text-[#8A7D72] mt-1">
                Formatos: JPG, PNG o WebP · Máx 2MB · Recomendado: 400×400px
              </p>
              {logoPreview && (
                <div className="mt-3 w-16 h-16 rounded-lg overflow-hidden border border-[#EDE5DC] bg-[#FAF6F0]">
                  <img src={logoPreview} alt="Preview logo" className="w-full h-full object-cover" />
                </div>
              )}
              {logoError && (
                <p className="text-xs text-red-600 mt-1">{logoError}</p>
              )}
            </div>
            <input type="hidden" name="moneda" value="COP" />
            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg">{error}</p>
            )}
            {logoError && !error && (
              <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg">{logoError}</p>
            )}
            <button
              type="submit"
              disabled={loading || Boolean(logoError)}
              className="w-full bg-[#C4622D] hover:bg-[#E8845A] text-white font-semibold py-2.5 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creando tienda...' : 'Crear tienda'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
