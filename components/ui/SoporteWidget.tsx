'use client'
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import {
  crearCaso,
  enviarMensajeCliente,
  getCasos,
  getMensajes,
} from '@/app/(dashboard)/soporte/actions'

type Caso = { id: string; titulo: string; estado: string; created_at: string; updated_at: string }
type Mensaje = { id: string; autor: string; mensaje: string; created_at: string }
type Vista = 'lista' | 'nuevo' | 'caso'

const BADGE: Record<string, { label: string; bg: string; color: string }> = {
  abierto:    { label: 'Abierto',    bg: '#E8F2FB', color: '#2F6DB0' },
  en_proceso: { label: 'En proceso', bg: '#FFF8E1', color: '#856404' },
  resuelto:   { label: 'Resuelto',   bg: '#E6F4EA', color: '#1B6B3A' },
}

function formatFecha(iso: string) {
  return new Date(`${iso}`).toLocaleDateString('es-CO', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function SoporteWidget() {
  const pathname = usePathname()
  const enDashboard = pathname === '/dashboard'
  const fabBottom = enDashboard ? '5.5rem' : '1.5rem'
  const panelBottom = enDashboard ? 'calc(5.5rem + 60px)' : '5.5rem'

  const [abierto, setAbierto] = useState(false)
  const [vista, setVista] = useState<Vista>('lista')
  const [casos, setCasos] = useState<Caso[]>([])
  const [casoActual, setCasoActual] = useState<Caso | null>(null)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [cargando, setCargando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [titulo, setTitulo] = useState('')
  const [mensajeInicial, setMensajeInicial] = useState('')
  const [respuesta, setRespuesta] = useState('')

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [mensajes])

  async function cargarCasos() {
    setCargando(true)
    const r = await getCasos()
    if (r.ok) setCasos(r.casos)
    setCargando(false)
  }

  async function abrirCaso(caso: Caso) {
    setCasoActual(caso)
    setVista('caso')
    setMensajes([])
    const r = await getMensajes(caso.id)
    if (r.ok) setMensajes(r.mensajes)
  }

  function abrirWidget() {
    setAbierto(true)
    setVista('lista')
    setErrorMsg('')
    cargarCasos()
  }

  function cerrarWidget() {
    setAbierto(false)
    setVista('lista')
    setErrorMsg('')
  }

  async function handleCrearCaso(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim() || !mensajeInicial.trim()) return
    setEnviando(true)
    setErrorMsg('')
    const r = await crearCaso(titulo.trim(), mensajeInicial.trim())
    setEnviando(false)
    if (r.ok) {
      setTitulo('')
      setMensajeInicial('')
      await cargarCasos()
      setVista('lista')
    } else {
      setErrorMsg(r.error ?? 'Error al crear el caso')
    }
  }

  async function handleEnviarRespuesta(e: React.FormEvent) {
    e.preventDefault()
    if (!respuesta.trim() || !casoActual) return
    setEnviando(true)
    setErrorMsg('')
    const r = await enviarMensajeCliente(casoActual.id, respuesta.trim())
    setEnviando(false)
    if (r.ok) {
      setRespuesta('')
      const r2 = await getMensajes(casoActual.id)
      if (r2.ok) setMensajes(r2.mensajes)
    } else {
      setErrorMsg(r.error ?? 'Error al enviar')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid var(--color-border)',
    background: 'var(--color-background)',
    color: 'var(--color-text)', fontSize: 13,
    boxSizing: 'border-box', outline: 'none',
  }

  const tituloPanel =
    vista === 'lista' ? 'Soporte'
    : vista === 'nuevo' ? 'Nuevo caso'
    : casoActual?.titulo ?? 'Caso'

  return (
    <>
      {/* Panel */}
      {abierto && (
        <div
          style={{
            position: 'fixed', bottom: panelBottom, right: '1.5rem',
            width: 'min(360px, calc(100vw - 2rem))',
            maxHeight: '70vh',
            background: 'var(--color-surface)',
            borderRadius: 16,
            boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            border: '1px solid var(--color-border)',
            display: 'flex', flexDirection: 'column',
            zIndex: 9998,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 18px', borderBottom: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {vista !== 'lista' && (
                <button
                  onClick={() => { setVista('lista'); setErrorMsg(''); cargarCasos() }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-soft)', fontSize: 16, padding: '0 6px 0 0', lineHeight: 1 }}
                >
                  ←
                </button>
              )}
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>{tituloPanel}</p>
                {vista === 'lista' && (
                  <p style={{ fontSize: 11, color: 'var(--color-text-faint)', margin: 0 }}>Equipo de soporte Leva</p>
                )}
                {vista === 'caso' && casoActual && (
                  <span
                    style={{
                      fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 99,
                      background: BADGE[casoActual.estado]?.bg ?? '#E8F2FB',
                      color: BADGE[casoActual.estado]?.color ?? '#2F6DB0',
                    }}
                  >
                    {BADGE[casoActual.estado]?.label ?? casoActual.estado}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={cerrarWidget}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-soft)', fontSize: 20, lineHeight: 1, padding: '0 0 0 8px' }}
            >
              ×
            </button>
          </div>

          {/* Cuerpo */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

            {/* LISTA */}
            {vista === 'lista' && (
              cargando ? (
                <p style={{ textAlign: 'center', color: 'var(--color-text-faint)', fontSize: 13, padding: '28px 0' }}>Cargando...</p>
              ) : casos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 4px' }}>¿Necesitas ayuda?</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-faint)', margin: 0 }}>Crea un caso y te respondemos pronto.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {casos.map((c) => {
                    const b = BADGE[c.estado] ?? BADGE.abierto
                    return (
                      <button
                        key={c.id}
                        onClick={() => abrirCaso(c)}
                        style={{
                          textAlign: 'left', width: '100%', cursor: 'pointer',
                          background: 'var(--color-background)', border: '1px solid var(--color-border)',
                          borderRadius: 10, padding: '11px 14px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', margin: 0 }}>{c.titulo}</p>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: b.bg, color: b.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {b.label}
                          </span>
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--color-text-faint)', margin: '4px 0 0' }}>{formatFecha(c.updated_at)}</p>
                      </button>
                    )
                  })}
                </div>
              )
            )}

            {/* NUEVO CASO */}
            {vista === 'nuevo' && (
              <form onSubmit={handleCrearCaso} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-soft)', display: 'block', marginBottom: 4 }}>Asunto</label>
                  <input
                    ref={inputRef}
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ej: Error al registrar una venta"
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-soft)', display: 'block', marginBottom: 4 }}>Descripción</label>
                  <textarea
                    value={mensajeInicial}
                    onChange={(e) => setMensajeInicial(e.target.value)}
                    placeholder="Cuéntanos qué está pasando con el mayor detalle posible..."
                    required
                    rows={5}
                    style={{ ...inputStyle, resize: 'none' }}
                  />
                </div>
                {errorMsg && <p style={{ fontSize: 12, color: '#C44040', margin: 0 }}>{errorMsg}</p>}
                <button
                  type="submit"
                  disabled={enviando}
                  style={{
                    background: 'var(--color-accent)', color: 'white', border: 'none',
                    borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600,
                    cursor: enviando ? 'not-allowed' : 'pointer', opacity: enviando ? 0.7 : 1,
                  }}
                >
                  {enviando ? 'Enviando...' : 'Crear caso'}
                </button>
              </form>
            )}

            {/* HILO DEL CASO */}
            {vista === 'caso' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {mensajes.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--color-text-faint)', fontSize: 12 }}>Cargando mensajes...</p>
                )}
                {mensajes.map((m) => (
                  <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.autor === 'cliente' ? 'flex-end' : 'flex-start' }}>
                    <div
                      style={{
                        maxWidth: '80%', padding: '9px 13px',
                        borderRadius: m.autor === 'cliente' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                        background: m.autor === 'cliente' ? 'var(--color-accent)' : 'var(--color-background)',
                        border: m.autor === 'admin' ? '1px solid var(--color-border)' : 'none',
                        color: m.autor === 'cliente' ? 'white' : 'var(--color-text)',
                      }}
                    >
                      {m.autor === 'admin' && (
                        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-accent)', margin: '0 0 4px' }}>Equipo Leva</p>
                      )}
                      <p style={{ fontSize: 13, margin: 0, lineHeight: '1.45', whiteSpace: 'pre-wrap' }}>{m.mensaje}</p>
                    </div>
                    <p style={{ fontSize: 10, color: 'var(--color-text-faint)', margin: '3px 4px 0' }}>{formatFecha(m.created_at)}</p>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* Footer */}
          {vista === 'lista' && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)', flexShrink: 0 }}>
              <button
                onClick={() => { setVista('nuevo'); setErrorMsg('') }}
                style={{
                  width: '100%', background: 'var(--color-accent)', color: 'white',
                  border: 'none', borderRadius: 8, padding: '10px 16px',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                + Nuevo caso
              </button>
            </div>
          )}

          {vista === 'caso' && casoActual?.estado !== 'resuelto' && (
            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--color-border)', flexShrink: 0 }}>
              <form onSubmit={handleEnviarRespuesta} style={{ display: 'flex', gap: 8 }}>
                <input
                  value={respuesta}
                  onChange={(e) => setRespuesta(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  required
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  type="submit"
                  disabled={enviando}
                  style={{
                    background: 'var(--color-accent)', color: 'white', border: 'none',
                    borderRadius: 8, padding: '9px 14px', fontSize: 16, cursor: enviando ? 'not-allowed' : 'pointer',
                    opacity: enviando ? 0.7 : 1, flexShrink: 0,
                  }}
                >
                  →
                </button>
              </form>
              {errorMsg && <p style={{ fontSize: 11, color: '#C44040', margin: '6px 0 0' }}>{errorMsg}</p>}
            </div>
          )}

          {vista === 'caso' && casoActual?.estado === 'resuelto' && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)', textAlign: 'center', flexShrink: 0 }}>
              <p style={{ fontSize: 12, color: 'var(--color-text-faint)', margin: 0 }}>✓ Este caso está resuelto</p>
            </div>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={abierto ? cerrarWidget : abrirWidget}
        title="Soporte"
        style={{
          position: 'fixed', bottom: fabBottom, right: '1.5rem',
          width: 52, height: 52, borderRadius: '50%',
          background: 'var(--color-accent)', border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(74,144,217,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999,
        }}
      >
        {abierto ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        )}
      </button>
    </>
  )
}
