import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import AdminCasoActions from './AdminCasoActions'

const ESTADO_BADGE: Record<string, { label: string; color: string }> = {
  abierto:    { label: 'Abierto',    color: '#5C9FE0' },
  en_proceso: { label: 'En proceso', color: '#D4A853' },
  resuelto:   { label: 'Resuelto',   color: '#3A7D5A' },
}

export default async function CasoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: caso } = await supabase
    .from('casos_soporte')
    .select('id, titulo, estado, created_at, updated_at, tienda_id, tiendas(nombre)')
    .eq('id', id)
    .maybeSingle()

  if (!caso) notFound()

  const { data: mensajes } = await supabase
    .from('mensajes_soporte')
    .select('id, autor, mensaje, created_at')
    .eq('caso_id', id)
    .order('created_at', { ascending: true })

  const tiendaRaw = caso.tiendas as unknown
  const tienda = (Array.isArray(tiendaRaw) ? tiendaRaw[0] : tiendaRaw) as { nombre: string } | null
  const badge = ESTADO_BADGE[caso.estado] ?? ESTADO_BADGE.abierto

  return (
    <div style={{ maxWidth: 760 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 28 }}>
        <Link href="/polealabs/soporte" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: 13, marginTop: 2, flexShrink: 0 }}>
          ← Volver
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ color: 'white', fontSize: 20, fontWeight: 700, margin: 0 }}>{caso.titulo}</h1>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: 'rgba(255,255,255,0.08)', color: badge.color }}>
              {badge.label}
            </span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: '4px 0 0' }}>
            {tienda?.nombre ?? '—'} · Abierto el{' '}
            {new Date(caso.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
        {/* Hilo de mensajes */}
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 20, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
            Conversación
          </p>
          {!mensajes || mensajes.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>Sin mensajes aún.</p>
          ) : (
            mensajes.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: m.autor === 'admin' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '80%', padding: '10px 14px',
                    borderRadius: m.autor === 'admin' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                    background: m.autor === 'admin' ? '#4A90D9' : 'rgba(255,255,255,0.08)',
                    color: 'white',
                  }}
                >
                  {m.autor === 'cliente' && (
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#D4A853', margin: '0 0 4px' }}>{tienda?.nombre ?? 'Cliente'}</p>
                  )}
                  {m.autor === 'admin' && (
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', margin: '0 0 4px' }}>Equipo Leva</p>
                  )}
                  <p style={{ fontSize: 13, margin: 0, lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{m.mensaje}</p>
                </div>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', margin: '3px 4px 0' }}>
                  {new Date(m.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Acciones */}
        <AdminCasoActions caso_id={caso.id} tienda_id={caso.tienda_id} estado={caso.estado} />
      </div>
    </div>
  )
}
