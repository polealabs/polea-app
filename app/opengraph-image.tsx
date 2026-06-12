import { ImageResponse } from 'next/og'

export const alt = 'Leva — Tu negocio, sin enredos.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Imagen Open Graph generada dinámicamente (se usa al compartir el link).
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0D0D0D',
          color: '#F4F1EA',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 20,
              background: '#4A90D9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 52,
              fontWeight: 800,
              color: '#0D0D0D',
            }}
          >
            L
          </div>
          <div
            style={{
              fontSize: 120,
              fontWeight: 800,
              letterSpacing: '0.04em',
              lineHeight: 1,
            }}
          >
            LEVA
          </div>
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 38,
            color: '#4A90D9',
            fontWeight: 600,
          }}
        >
          Tu negocio, sin enredos.
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 24,
            color: 'rgba(244,241,234,0.6)',
            maxWidth: 760,
            textAlign: 'center',
          }}
        >
          Ventas, inventario, gastos y rentabilidad en un solo lugar.
        </div>
      </div>
    ),
    { ...size },
  )
}
