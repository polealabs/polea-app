'use client'
import { useState } from 'react'
import { responderCaso, cambiarEstadoCaso } from '../actions'

type Props = {
  caso_id: string
  tienda_id: string
  estado: string
}

export default function AdminCasoActions({ caso_id, tienda_id, estado }: Props) {
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  async function handleResponder(e: React.FormEvent) {
    e.preventDefault()
    if (!mensaje.trim()) return
    setEnviando(true)
    setError('')
    const result = await responderCaso(caso_id, tienda_id, mensaje.trim())
    setEnviando(false)
    if (result.ok) {
      setMensaje('')
    } else {
      setError(result.error ?? 'Error al enviar')
    }
  }

  async function handleCambiarEstado(nuevoEstado: 'abierto' | 'en_proceso' | 'resuelto') {
    const result = await cambiarEstadoCaso(caso_id, nuevoEstado)
    if (!result.ok) setError(result.error ?? 'Error al cambiar estado')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Cambiar estado */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '16px 20px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
          Cambiar estado
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['abierto', 'en_proceso', 'resuelto'] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleCambiarEstado(s)}
              disabled={estado === s}
              style={{
                fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 8,
                border: 'none', cursor: estado === s ? 'default' : 'pointer',
                background: estado === s ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
                color: estado === s ? 'white' : 'rgba(255,255,255,0.45)',
                opacity: estado === s ? 1 : 0.8,
                transition: 'all 0.15s',
              }}
            >
              {s === 'abierto' && '● Abierto'}
              {s === 'en_proceso' && '◑ En proceso'}
              {s === 'resuelto' && '✓ Resuelto'}
            </button>
          ))}
        </div>
      </div>

      {/* Responder */}
      {estado !== 'resuelto' && (
        <form onSubmit={handleResponder} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '16px 20px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
            Responder al cliente
          </p>
          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Escribe tu respuesta..."
            rows={4}
            required
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.07)',
              color: 'white', fontSize: 13, resize: 'vertical', boxSizing: 'border-box',
              outline: 'none',
            }}
          />
          {error && <p style={{ color: '#C44040', fontSize: 12, margin: '8px 0 0' }}>{error}</p>}
          <button
            type="submit"
            disabled={enviando}
            style={{
              marginTop: 12, background: '#4A90D9', color: 'white', border: 'none',
              borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600,
              cursor: enviando ? 'not-allowed' : 'pointer', opacity: enviando ? 0.7 : 1,
            }}
          >
            {enviando ? 'Enviando...' : 'Enviar respuesta'}
          </button>
        </form>
      )}
    </div>
  )
}
