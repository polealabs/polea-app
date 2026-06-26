import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

const ESTADO_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  abierto:    { label: 'Abierto',    bg: 'rgba(74,144,217,0.15)', color: '#5C9FE0' },
  en_proceso: { label: 'En proceso', bg: 'rgba(212,168,83,0.15)',  color: '#D4A853' },
  resuelto:   { label: 'Resuelto',   bg: 'rgba(58,125,90,0.15)',   color: '#3A7D5A' },
}

export default async function SoportePage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>
}) {
  const { estado: filtroEstado } = await searchParams
  const supabase = createAdminClient()

  let query = supabase
    .from('casos_soporte')
    .select('id, titulo, estado, created_at, updated_at, tienda_id, tiendas(nombre)')
    .order('updated_at', { ascending: false })

  if (filtroEstado && ['abierto', 'en_proceso', 'resuelto'].includes(filtroEstado)) {
    query = query.eq('estado', filtroEstado)
  }

  const { data: casos } = await query

  const conteo = {
    total:      casos?.length ?? 0,
    abierto:    casos?.filter((c) => c.estado === 'abierto').length ?? 0,
    en_proceso: casos?.filter((c) => c.estado === 'en_proceso').length ?? 0,
    resuelto:   casos?.filter((c) => c.estado === 'resuelto').length ?? 0,
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: 'white', fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Soporte</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: 0 }}>Casos reportados por los clientes</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Total', valor: conteo.total, color: 'rgba(255,255,255,0.7)' },
          { label: 'Abiertos', valor: conteo.abierto, color: '#5C9FE0' },
          { label: 'En proceso', valor: conteo.en_proceso, color: '#D4A853' },
          { label: 'Resueltos', valor: conteo.resuelto, color: '#3A7D5A' },
        ].map((k) => (
          <div key={k.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '14px 18px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 500, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</p>
            <p style={{ color: k.color, fontSize: 26, fontWeight: 700, margin: 0 }}>{k.valor}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { value: '', label: 'Todos' },
          { value: 'abierto', label: 'Abiertos' },
          { value: 'en_proceso', label: 'En proceso' },
          { value: 'resuelto', label: 'Resueltos' },
        ].map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/polealabs/soporte?estado=${f.value}` : '/polealabs/soporte'}
            style={{
              fontSize: 12, fontWeight: 500, padding: '6px 14px', borderRadius: 20,
              background: filtroEstado === f.value || (!filtroEstado && f.value === '')
                ? 'rgba(255,255,255,0.15)'
                : 'rgba(255,255,255,0.05)',
              color: filtroEstado === f.value || (!filtroEstado && f.value === '')
                ? 'white'
                : 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(255,255,255,0.1)',
              textDecoration: 'none',
              transition: 'all 0.15s',
            }}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Tabla */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        {!casos || casos.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', padding: '40px 0', fontSize: 14 }}>
            No hay casos {filtroEstado ? `con estado "${ESTADO_BADGE[filtroEstado]?.label}"` : ''}.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Tienda', 'Asunto', 'Estado', 'Fecha', ''].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {casos.map((c) => {
                const badge = ESTADO_BADGE[c.estado] ?? ESTADO_BADGE.abierto
                const tiendaRaw = c.tiendas as unknown
                const tienda = (Array.isArray(tiendaRaw) ? tiendaRaw[0] : tiendaRaw) as { nombre: string } | null
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                      {tienda?.nombre ?? '—'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: 'white', fontWeight: 500 }}>
                      {c.titulo}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 99, background: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                      {new Date(c.updated_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <Link
                        href={`/polealabs/soporte/${c.id}`}
                        style={{ fontSize: 12, color: '#5C9FE0', textDecoration: 'none', fontWeight: 500 }}
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
