'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTienda } from '@/lib/hooks/useTienda'

function unwrapOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

type ConsignacionEmbed = {
  consignataria_id?: string
  precio_unitario?: number
  productos?: { nombre?: string; sku?: string } | { nombre?: string; sku?: string }[] | null
  tiendas_consignatarias?:
    | {
        nombre?: string
        ciudad?: string
        nit?: string
        telefono?: string
        contacto?: string
      }
    | {
        nombre?: string
        ciudad?: string
        nit?: string
        telefono?: string
        contacto?: string
      }[]
    | null
}

type MovimientoDetalle = {
  id: string
  fecha: string
  cantidad: number
  notas?: string | null
  consignaciones?: ConsignacionEmbed | null
}

function consignacionFromMov(mov: MovimientoDetalle): ConsignacionEmbed | null {
  return unwrapOne(mov.consignaciones as ConsignacionEmbed | ConsignacionEmbed[] | null)
}

function productoFromMov(mov: MovimientoDetalle) {
  const c = consignacionFromMov(mov)
  return unwrapOne(c?.productos ?? null)
}

export default function DevolucionPdfPage() {
  const params = useParams<{ id: string }>()
  const { tienda, loading: tiendaLoading } = useTienda()
  const [loadingMovs, setLoadingMovs] = useState(true)
  const [descargando, setDescargando] = useState(false)
  const [movimientos, setMovimientos] = useState<MovimientoDetalle[]>([])

  useEffect(() => {
    if (tiendaLoading) return

    if (!tienda?.id) {
      setMovimientos([])
      setLoadingMovs(false)
      return
    }

    let cancelled = false
    setLoadingMovs(true)
    setMovimientos([])

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        const supabase = createClient()

        const { data: baseRow } = await supabase
          .from('consignacion_movimientos')
          .select('id, fecha, tipo, consignaciones(consignataria_id)')
          .eq('id', params.id)
          .eq('tienda_id', tienda.id)
          .maybeSingle()

        const baseConsig = unwrapOne(baseRow?.consignaciones as ConsignacionEmbed | ConsignacionEmbed[] | null)
        const consignatariaId = baseConsig?.consignataria_id
        const fechaBase = baseRow?.fecha as string | undefined

        if (
          cancelled ||
          !baseRow ||
          baseRow.tipo !== 'devolucion' ||
          !consignatariaId ||
          !fechaBase
        ) {
          if (!cancelled) setLoadingMovs(false)
          return
        }

        const { data: movsRaw } = await supabase
          .from('consignacion_movimientos')
          .select(
            `
            id, fecha, cantidad, notas,
            consignaciones(
              consignataria_id,
              precio_unitario,
              productos(nombre, sku),
              tiendas_consignatarias(nombre, ciudad, nit, telefono, contacto)
            )
          `,
          )
          .eq('tienda_id', tienda.id)
          .eq('fecha', fechaBase)
          .eq('tipo', 'devolucion')
          .order('created_at')

        const filtered = (movsRaw ?? []).filter((row) => {
          const c = unwrapOne(
            (row as { consignaciones?: ConsignacionEmbed | ConsignacionEmbed[] | null }).consignaciones,
          )
          return c?.consignataria_id === consignatariaId
        }) as MovimientoDetalle[]

        if (!cancelled) {
          setMovimientos(filtered)
          setLoadingMovs(false)
        }
      })()
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [params.id, tienda?.id, tiendaLoading])

  const consignataria = useMemo(() => {
    const embed = movimientos[0] ? consignacionFromMov(movimientos[0]) : null
    return unwrapOne(embed?.tiendas_consignatarias ?? null)
  }, [movimientos])

  const fecha = movimientos[0]?.fecha
  const totalUnidades = useMemo(() => movimientos.reduce((s, m) => s + m.cantidad, 0), [movimientos])

  async function descargarPDF() {
    setDescargando(true)
    try {
      const elemento = document.getElementById('devolucion-pdf')
      if (!elemento) return
      const { default: html2canvas } = await import('html2canvas')
      const { default: jsPDF } = await import('jspdf')
      const clone = elemento.cloneNode(true) as HTMLElement
      clone.style.position = 'fixed'
      clone.style.top = '-9999px'
      clone.style.left = '-9999px'
      clone.style.width = '794px'
      clone.style.background = '#FFFFFF'
      document.body.appendChild(clone)
      const canvas = await html2canvas(clone, {
        scale: 2,
        backgroundColor: '#FFFFFF',
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
          clonedDoc.querySelectorAll('*').forEach((el) => {
            const htmlEl = el as HTMLElement
            const style = window.getComputedStyle(htmlEl)
            if (style.backgroundColor.includes('oklab') || style.backgroundColor.includes('oklch')) {
              htmlEl.style.backgroundColor = '#ffffff'
            }
            if (style.color.includes('oklab') || style.color.includes('oklch')) {
              htmlEl.style.color = '#1a1510'
            }
          })
        },
      })
      document.body.removeChild(clone)
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      const nombreTienda = consignataria?.nombre?.replace(/\s+/g, '-') ?? 'tienda'
      pdf.save(`devolucion-${nombreTienda}-${fecha}.pdf`)
    } catch (err) {
      console.error('Error generando PDF:', err)
    } finally {
      setDescargando(false)
    }
  }

  if (tiendaLoading || loadingMovs) return <div className="p-4 md:p-6">Cargando devolución...</div>
  if (!tienda) return <div className="p-4 md:p-6">No se encontró la tienda.</div>
  if (movimientos.length === 0) return <div className="p-4 md:p-6">Devolución no encontrada.</div>

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex gap-3 justify-between items-center mb-6">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="text-sm px-4 py-2 rounded-lg border transition"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-soft)' }}
        >
          ← Volver
        </button>
        <button
          type="button"
          onClick={() => void descargarPDF()}
          disabled={descargando}
          className="text-sm px-5 py-2.5 rounded-xl font-semibold transition disabled:opacity-50"
          style={{ background: 'var(--color-accent)', color: 'white' }}
        >
          {descargando ? 'Generando PDF...' : '⬇ Descargar PDF'}
        </button>
      </div>

      <div id="devolucion-pdf" className="bg-white font-sans max-w-3xl mx-auto border border-[#EDE5DC]">
        <div
          style={{
            background: '#1E3A2F',
            padding: '24px 32px',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            {tienda?.logo_url ? (
              <img src={tienda.logo_url} alt="Logo" style={{ height: '48px', objectFit: 'contain', marginBottom: '8px' }} />
            ) : (
              <p style={{ fontFamily: 'serif', fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>{tienda?.nombre}</p>
            )}
            {tienda?.nit && <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>NIT: {tienda.nit}</p>}
            {tienda?.ciudad && <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>{tienda.ciudad}</p>}
            {tienda?.telefono && <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Tel: {tienda.telefono}</p>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '0.05em' }}>DEVOLUCIÓN</p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>
              Fecha:{' '}
              {fecha ? new Date(`${fecha}T12:00:00`).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}
            </p>
          </div>
        </div>

        <div
          style={{
            padding: '20px 32px',
            borderBottom: '1px solid #EDE5DC',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
          }}
        >
          <div>
            <p
              style={{
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#8A7D72',
                marginBottom: '6px',
              }}
            >
              De:
            </p>
            <p style={{ fontSize: '15px', fontWeight: '600', color: '#1A1510' }}>{consignataria?.nombre}</p>
            {consignataria?.nit && <p style={{ fontSize: '12px', color: '#8A7D72' }}>NIT: {consignataria.nit}</p>}
            {consignataria?.ciudad && <p style={{ fontSize: '12px', color: '#8A7D72' }}>{consignataria.ciudad}</p>}
            {consignataria?.contacto && <p style={{ fontSize: '12px', color: '#8A7D72' }}>Contacto: {consignataria.contacto}</p>}
            {consignataria?.telefono && <p style={{ fontSize: '12px', color: '#8A7D72' }}>Tel: {consignataria.telefono}</p>}
          </div>
          <div>
            <p
              style={{
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#8A7D72',
                marginBottom: '6px',
              }}
            >
              Para:
            </p>
            <p style={{ fontSize: '15px', fontWeight: '600', color: '#1A1510' }}>{tienda?.nombre}</p>
            {tienda?.representante && <p style={{ fontSize: '12px', color: '#8A7D72' }}>{tienda.representante}</p>}
            {tienda?.email && <p style={{ fontSize: '12px', color: '#8A7D72' }}>{tienda.email}</p>}
          </div>
        </div>

        <div style={{ padding: '0 32px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
            <thead>
              <tr style={{ background: '#FAF6F0' }}>
                {['SKU', 'Producto', 'Cant.'].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 12px',
                      textAlign: i === 1 ? 'left' : i === 2 ? 'center' : 'left',
                      fontSize: '11px',
                      fontWeight: '600',
                      color: '#8A7D72',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderBottom: '2px solid #EDE5DC',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movimientos.map((mov, i) => {
                const prod = productoFromMov(mov)
                return (
                  <tr
                    key={mov.id}
                    style={{
                      borderBottom: '1px solid #F0EBE4',
                      background: i % 2 === 0 ? 'white' : '#FDFAF7',
                    }}
                  >
                    <td style={{ padding: '12px', fontSize: '12px', color: '#8A7D72' }}>{prod?.sku || '—'}</td>
                    <td style={{ padding: '12px', fontSize: '13px', fontWeight: '500', color: '#1A1510' }}>{prod?.nombre}</td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#1A1510', textAlign: 'center' }}>{mov.cantidad}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div
          style={{
            padding: '16px 32px',
            display: 'flex',
            justifyContent: 'flex-end',
            borderTop: '2px solid #EDE5DC',
            marginTop: '8px',
          }}
        >
          <div style={{ minWidth: '200px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 0',
                borderBottom: '2px solid #1E3A2F',
              }}
            >
              <span style={{ fontSize: '15px', fontWeight: '700', color: '#1E3A2F' }}>Total devuelto</span>
              <span style={{ fontSize: '15px', fontWeight: '700', color: '#1E3A2F' }}>{totalUnidades} uds</span>
            </div>
          </div>
        </div>

        {movimientos[0]?.notas && (
          <div style={{ padding: '16px 32px', borderTop: '1px solid #EDE5DC' }}>
            <p style={{ fontSize: '11px', textTransform: 'uppercase', color: '#8A7D72', marginBottom: '4px' }}>Notas:</p>
            <p style={{ fontSize: '13px', color: '#4A3F35' }}>{movimientos[0].notas}</p>
          </div>
        )}

        <div style={{ padding: '40px 32px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #1A1510', paddingTop: '8px' }}>
              <p style={{ fontSize: '12px', color: '#4A3F35', fontWeight: '600' }}>{consignataria?.contacto || consignataria?.nombre}</p>
              <p style={{ fontSize: '11px', color: '#8A7D72' }}>Entrega</p>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #1A1510', paddingTop: '8px' }}>
              <p style={{ fontSize: '12px', color: '#4A3F35', fontWeight: '600' }}>{tienda?.representante || tienda?.nombre}</p>
              <p style={{ fontSize: '11px', color: '#8A7D72' }}>Recibe</p>
            </div>
          </div>
        </div>

        <div style={{ background: '#1E3A2F', padding: '12px 32px', textAlign: 'center' }}>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
            Documento generado por Polea · {new Date().toLocaleDateString('es-CO')}
          </p>
        </div>
      </div>
    </div>
  )
}
