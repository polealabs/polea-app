'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useTienda } from '@/lib/hooks/useTienda'
import { INDUSTRIAS } from '@/lib/industrias'
import { actualizarTienda } from './actions'
import Toast from '@/components/ui/Toast'
import { useToast } from '@/lib/hooks/useToast'
import { ModuleTableSkeleton } from '@/components/skeletons/ModuleTableSkeleton'
import { TEMAS } from '@/lib/temas'
import { useTema } from '@/lib/context/TemaContext'

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-[var(--color-text)]/20 bg-white text-[var(--color-text)] placeholder:text-[var(--color-text)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 focus:border-[var(--color-accent)] transition text-sm'
const labelClass = 'block text-xs font-medium text-[var(--color-text)]/60 mb-1'

export default function PerfilPage() {
  const { tienda, loading } = useTienda()
  const { setTemaId } = useTema()
  const { toasts, showToast, removeToast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [temaSeleccionado, setTemaSeleccionado] = useState(tienda?.tema ?? 'bosque')

  useEffect(() => {
    if (!tienda?.tema) return
    const id = window.setTimeout(() => setTemaSeleccionado(tienda.tema ?? 'bosque'), 0)
    return () => window.clearTimeout(id)
  }, [tienda?.tema])

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setLogoError('Formato no válido. Usa JPG, PNG o WebP.')
      showToast('Formato de logo no válido', 'error')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('El archivo supera 2MB.')
      showToast('El logo supera 2MB', 'error')
      return
    }
    setLogoError(null)
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    const nombreVal = String(new FormData(formEl).get('nombre') ?? '').trim()

    if (!nombreVal) {
      setError('El nombre de la tienda es obligatorio')
      showToast('El nombre de la tienda es obligatorio', 'error')
      return
    }

    setSubmitting(true)
    setError(null)

    const formData = new FormData(formEl)
    formData.set('nombre', nombreVal)
    formData.set('tema', temaSeleccionado)
    if (logoFile) formData.set('logo', logoFile)

    const res = await actualizarTienda(formData)
    if (res?.error) {
      setError(res.error)
      showToast(res.error, 'error')
    } else {
      showToast('Cambios guardados')
    }
    setSubmitting(false)
  }

  if (loading) {
    return <ModuleTableSkeleton maxWidthClass="max-w-5xl" rows={8} />
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>Configuración de tienda</h1>
        <p className="text-sm text-[var(--color-text)]/50 mt-0.5">Administra los datos visibles de tu negocio.</p>
      </div>

      <div className="bg-white rounded-2xl border border-[var(--color-text)]/8 p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-[var(--color-background)] border border-[var(--color-border)] flex items-center justify-center">
                {logoPreview ?? tienda?.logo_url ? (
                  <img src={logoPreview ?? tienda?.logo_url} alt="Logo tienda" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-[var(--color-accent)]">
                    {(tienda?.nombre || 'P').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <input
                  id="logo"
                  name="logo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleLogoChange}
                  className="block w-full text-sm text-[#4A3F35] file:mr-3 file:px-3 file:py-1.5 file:text-xs file:rounded-lg file:border-0 file:bg-[var(--color-background)] file:text-[#4A3F35] hover:file:bg-[#F9EDE5]"
                />
                <p className="text-xs text-[var(--color-text-soft)] mt-1">
                  Formatos: JPG, PNG o WebP · Máx 2MB · Recomendado: 400×400px
                </p>
              </div>
            </div>
            {logoError && <p className="text-xs text-red-600 mt-2">{logoError}</p>}
          </div>

          <div>
            <label className={labelClass}>Nombre de tienda *</label>
            <input name="nombre" defaultValue={tienda?.nombre ?? ''} className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>Ciudad</label>
            <input name="ciudad" defaultValue={tienda?.ciudad ?? ''} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>WhatsApp</label>
            <input name="whatsapp" defaultValue={tienda?.whatsapp ?? ''} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Moneda</label>
            <select name="moneda" defaultValue={tienda?.moneda ?? 'COP'} className={inputClass}>
              <option value="COP">COP</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="MXN">MXN</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Categoría / industria</label>
            <select name="categoria" defaultValue={tienda?.categoria ?? ''} className={inputClass}>
              <option value="">Selecciona una industria</option>
              {INDUSTRIAS.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 mt-1">
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-primary)' }}>
              Información legal y de contacto
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>NIT o Cédula</label>
                <input name="nit" defaultValue={tienda?.nit ?? ''} placeholder="900123456-1" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Nombre del representante</label>
                <input
                  name="representante"
                  defaultValue={tienda?.representante ?? ''}
                  placeholder="Valentina Sánchez"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Teléfono</label>
                <input name="telefono" defaultValue={tienda?.telefono ?? ''} placeholder="3017433083" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email de contacto</label>
                <input
                  type="email"
                  name="email"
                  defaultValue={tienda?.email ?? ''}
                  placeholder="contacto@minegocio.com"
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Dirección</label>
                <input
                  name="direccion"
                  defaultValue={tienda?.direccion ?? ''}
                  placeholder="Calle 10 # 5-23, Cali"
                  className={inputClass}
                />
              </div>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--color-primary)' }}>Tema de color</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {TEMAS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTemaSeleccionado(t.id)
                    setTemaId(t.id)
                  }}
                  className={`relative rounded-xl border-2 p-3 text-left transition cursor-pointer
          ${
            temaSeleccionado === t.id
              ? 'border-[var(--color-accent)] shadow-md'
              : 'border-[var(--color-border)] hover:border-[var(--color-text-faint)]'
          }`}
                >
                  <div className="flex gap-1 mb-2">
                    <div className="w-6 h-6 rounded-md flex-shrink-0" style={{ background: t.colores.primary }} />
                    <div className="w-6 h-6 rounded-md flex-shrink-0" style={{ background: t.colores.accent }} />
                    <div className="w-6 h-6 rounded-md flex-shrink-0" style={{ background: t.colores.background }} />
                  </div>
                  <p className="text-xs font-semibold text-[var(--color-text)]">{t.nombre}</p>
                  <p className="text-[10px] text-[var(--color-text-soft)] mt-0.5">{t.descripcion}</p>
                  {temaSeleccionado === t.id && (
                    <span className="absolute top-2 right-2 text-[var(--color-accent)] text-sm">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="sm:col-span-2 text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg">{error}</p>}
          {logoPreview && (
            <p className="sm:col-span-2 text-xs text-[var(--color-text-soft)]">El nuevo logo se guardará al enviar el formulario.</p>
          )}

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
