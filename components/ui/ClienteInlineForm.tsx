'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { crearCliente } from '@/app/(dashboard)/clientes/actions'

interface Props {
  tiendaId: string
  onCreado: (cliente: { id: string; nombre: string }) => void
  onCancelar: () => void
}

export default function ClienteInlineForm({ tiendaId, onCreado, onCancelar }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creado, setCreado] = useState(false)
  const [nombreCreado, setNombreCreado] = useState('')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [correo, setCorreo] = useState('')

  async function handleSubmit() {
    if (creado) return
    if (!nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }

    setSubmitting(true)
    setError(null)

    const supabase = createClient()
    const { data: existente } = await supabase
      .from('clientes')
      .select('id')
      .eq('tienda_id', tiendaId)
      .ilike('nombre', nombre.trim())
      .maybeSingle()

    if (existente) {
      setError(`Ya existe un cliente con el nombre "${nombre.trim()}". Selecciónalo desde la lista.`)
      setSubmitting(false)
      return
    }

    const formData = new FormData()
    formData.set('nombre', nombre.trim())
    formData.set('telefono', telefono.trim())
    formData.set('ciudad', ciudad.trim())
    formData.set('correo', correo.trim())
    const result = await crearCliente(formData)

    if (result?.error) {
      setError(result.error)
    } else {
      setCreado(true)
      setNombreCreado(nombre.trim())
      onCreado({ id: '__reload__', nombre: nombre.trim() })
    }
    setSubmitting(false)
  }

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-[#EDE5DC] bg-white text-[#1A1510] placeholder:text-[#C4B8B0] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D] transition text-sm'
  const labelClass = 'block text-xs font-medium text-[#8A7D72] mb-1'

  if (creado) {
    return (
      <div className="bg-[#E8F5EE] rounded-xl border border-[#3A7D5A]/20 p-4 mt-3 flex items-center gap-3">
        <span className="text-[#3A7D5A] text-lg">✓</span>
        <div>
          <p className="text-sm font-semibold text-[#3A7D5A]">Cliente creado</p>
          <p className="text-xs text-[#3A7D5A]/70">&quot;{nombreCreado}&quot; fue agregado y seleccionado.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#FAF6F0] rounded-xl border border-[#EDE5DC] p-4 mt-3">
      <p className="text-sm font-semibold text-[#1E3A2F] mb-3">Nuevo cliente</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass}>Nombre *</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del cliente"
            className={inputClass}
          />
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
          <label className={labelClass}>Ciudad</label>
          <input
            type="text"
            value={ciudad}
            onChange={(e) => setCiudad(e.target.value)}
            placeholder="Cali"
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Correo</label>
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="cliente@correo.com"
            className={inputClass}
          />
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
            {submitting ? 'Guardando...' : 'Crear cliente'}
          </button>
        </div>
      </div>
    </div>
  )
}
