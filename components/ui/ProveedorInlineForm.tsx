'use client'

import { useState } from 'react'
import { crearProveedor } from '@/app/(dashboard)/proveedores/actions'

const CATEGORIAS = ['Producción', 'Empaque', 'Envíos', 'Marketing', 'Plataformas', 'Otro']

interface Props {
  onCreado: (proveedor: { id: string; nombre: string }) => void
  onCancelar: () => void
}

export default function ProveedorInlineForm({ onCreado, onCancelar }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [nit, setNit] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<string[]>([])

  function toggleCategoria(cat: string) {
    setCategoriasSeleccionadas((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    )
  }

  async function handleSubmit() {
    if (!nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    if (categoriasSeleccionadas.length === 0) {
      setError('Selecciona al menos una categoría')
      return
    }

    setSubmitting(true)
    setError(null)

    const formData = new FormData()
    formData.set('nombre', nombre.trim())
    formData.set('telefono', telefono.trim())
    formData.set('nit', nit.trim())
    formData.set('ciudad', ciudad.trim())
    categoriasSeleccionadas.forEach((c) => formData.append('categorias', c))

    const result = await crearProveedor(formData)
    if (result?.error) {
      setError(result.error)
    } else {
      onCreado({ id: '__reload__', nombre: nombre.trim() })
    }
    setSubmitting(false)
  }

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-[#EDE5DC] bg-white text-[#1A1510] placeholder:text-[#C4B8B0] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D] transition text-sm'
  const labelClass = 'block text-xs font-medium text-[#8A7D72] mb-1'

  return (
    <div className="bg-[#FAF6F0] rounded-xl border border-[#EDE5DC] p-4 mt-3">
      <p className="text-sm font-semibold text-[#1E3A2F] mb-3">Nuevo proveedor</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass}>Nombre *</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del proveedor"
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Categoría * (selecciona al menos una)</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {CATEGORIAS.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategoria(cat)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                  categoriasSeleccionadas.includes(cat)
                    ? 'bg-[#1E3A2F] border-[#1E3A2F] text-white'
                    : 'bg-white border-[#EDE5DC] text-[#4A3F35] hover:border-[#C4B8B0]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelClass}>Teléfono</label>
          <input
            type="text"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="3001234567"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>NIT</label>
          <input type="text" value={nit} onChange={(e) => setNit(e.target.value)} placeholder="900123456-1" className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Ciudad</label>
          <input type="text" value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder="Cali" className={inputClass} />
        </div>
        {error && (
          <p className="sm:col-span-2 text-xs text-[#C44040] bg-[#FDEAEA] px-3 py-2 rounded-lg">{error}</p>
        )}
        <div className="sm:col-span-2 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancelar}
            className="text-sm text-[#8A7D72] hover:text-[#1A1510] px-3 py-1.5 rounded-lg border border-[#EDE5DC] transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="text-sm bg-[#C4622D] text-white px-3 py-1.5 rounded-lg hover:bg-[#E8845A] transition disabled:opacity-50"
          >
            {submitting ? 'Guardando...' : 'Crear proveedor'}
          </button>
        </div>
      </div>
    </div>
  )
}
