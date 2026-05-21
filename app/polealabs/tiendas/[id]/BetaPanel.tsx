'use client'
import { useState } from 'react'
import { actualizarBeta } from './actions'

interface Props {
  tiendaId: string
  esBeta: boolean
  betaHasta: string | null
}

export default function BetaPanel({ tiendaId, esBeta, betaHasta }: Props) {
  const [activo, setActivo] = useState(esBeta)
  const [fecha, setFecha] = useState(betaHasta ? betaHasta.slice(0, 10) : '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function handleGuardar() {
    setSaving(true)
    setMsg(null)
    const result = await actualizarBeta(tiendaId, {
      es_beta: activo,
      beta_hasta: activo && fecha ? new Date(fecha + 'T23:59:59-05:00').toISOString() : null,
    })
    setSaving(false)
    if (result.error) {
      setMsg(result.error)
    } else {
      setMsg('Guardado correctamente')
      setTimeout(() => setMsg(null), 2000)
    }
  }

  const vigente = activo && fecha && new Date(fecha + 'T23:59:59') > new Date()

  return (
    <div className="rounded-2xl border border-white/10 p-6 space-y-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-semibold">Acceso Beta</p>
          <p className="text-white/40 text-xs mt-0.5">El cliente verá el badge BETA mientras esté activo y dentro de la fecha</p>
        </div>
        {vigente && (
          <span className="text-xs px-2.5 py-1 rounded-full font-bold tracking-wide bg-violet-500/20 text-violet-300 border border-violet-500/30">
            BETA activo
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setActivo((v) => !v)}
            className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${activo ? 'bg-violet-600' : 'bg-white/20'}`}
          >
            <div
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${activo ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </div>
          <span className="text-sm text-white/70">{activo ? 'Beta habilitado' : 'Beta deshabilitado'}</span>
        </label>

        {activo && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/50">Vence el</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm border border-white/20 focus:outline-none focus:border-violet-500"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => void handleGuardar()}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        {msg && (
          <span className={`text-xs ${msg.includes('correctamente') ? 'text-green-400' : 'text-red-400'}`}>
            {msg}
          </span>
        )}
      </div>
    </div>
  )
}
