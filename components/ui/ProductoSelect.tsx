'use client'

import { useEffect, useRef, useState } from 'react'

interface Opcion {
  id: string
  label: string
  sublabel?: string
}

interface ProductoSelectProps {
  opciones: Opcion[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export default function ProductoSelect({
  opciones,
  value,
  onChange,
  placeholder = 'Buscar producto...',
  disabled = false,
  className = '',
}: ProductoSelectProps) {
  const [busqueda, setBusqueda] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const seleccionado = opciones.find((o) => o.id === value)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setBusqueda('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const opcionesFiltradas = opciones.filter((o) =>
    o.label.toLowerCase().includes(busqueda.toLowerCase()),
  )

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((v) => !v)
          setBusqueda('')
        }}
        className="w-full px-3 py-2 rounded-lg border text-sm text-left flex items-center justify-between transition disabled:opacity-60"
        style={{
          borderColor: 'var(--color-border)',
          background: 'var(--color-surface)',
          color: seleccionado ? 'var(--color-text)' : 'var(--color-text-soft)',
        }}
      >
        <span className="truncate">{seleccionado ? seleccionado.label : placeholder}</span>
        <span className="ml-2 text-xs" style={{ color: 'var(--color-text-soft)' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded-xl border shadow-xl overflow-hidden"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="p-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <input
              autoFocus
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Escribir para buscar..."
              className="w-full px-3 py-1.5 rounded-lg border text-sm outline-none"
              style={{
                borderColor: 'var(--color-border)',
                background: 'var(--color-background)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div className="max-h-52 overflow-y-auto">
            {opcionesFiltradas.length === 0 ? (
              <p className="text-sm px-4 py-3 text-center" style={{ color: 'var(--color-text-soft)' }}>
                Sin resultados
              </p>
            ) : (
              opcionesFiltradas.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    onChange(o.id)
                    setOpen(false)
                    setBusqueda('')
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm transition hover:opacity-80"
                  style={{
                    background: o.id === value ? 'var(--color-accent-pale)' : 'transparent',
                    color: o.id === value ? 'var(--color-accent)' : 'var(--color-text)',
                  }}
                >
                  <p className="font-medium">{o.label}</p>
                  {o.sublabel && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-soft)' }}>
                      {o.sublabel}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
