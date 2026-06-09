'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTienda } from '@/lib/hooks/useTienda'

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(n || 0)
}

type SalidaDetalle = {
  id: string
  fecha: string
  notas?: string | null
  tiendas_consignatarias?: {
    nombre?: string
    ciudad?: string
    nit?: string
    telefono?: string
    contacto?: string
  } | null
}

type SalidaItem = {
  id: string
  cantidad: number
  precio_unitario: number
  productos?: { nombre?: string; sku?: string } | null
}

export default function SalidaPdfPage() {
  const params = useParams<{ id: string }>()
  const { tienda } = useTienda()
  const [loading, setLoading] = useState(true)
  const [descargando, setDescargando] = useState(false)
  const [salida, setSalida] = useState<SalidaDetalle | null>(null)
  const [items, setItems] = useState<SalidaItem[]>([])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void (async () => {
        const supabase = createClient()
        const { data: salidaData } = await supabase
          .from('consignacion_salidas')
          .select('*, tiendas_consignatarias(nombre, ciudad, nit, telefono, contacto)')
          .eq('id', params.id)
          .single()

        const { data: itemsData } = await supabase
          .from('consignaciones')
          .select('*, productos(nombre, sku)')
          .eq('salida_id', params.id)
          .order('created_at')

        setSalida((salidaData ?? null) as SalidaDetalle | null)
        setItems((itemsData ?? []) as SalidaItem[])
        setLoading(false)
      })()
    }, 0)
    return () => window.clearTimeout(id)
  }, [params.id])

  const totalRemision = useMemo(
    () => items.reduce((s, item) => s + item.cantidad * item.precio_unitario, 0),
    [items],
  )
  const totalUnidades = useMemo(() => items.reduce((s, i) => s + i.cantidad, 0), [items])

  async function descargarPDF() {
    setDescargando(true)
    try {
      const elemento = document.getElementById('salida-pdf')
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
      const nombreTienda = salida?.tiendas_consignatarias?.nombre?.replace(/\s+/g, '-') ?? 'tienda'
      pdf.save(`remision-${nombreTienda}-${salida?.fecha}.pdf`)
    } catch (err) {
      console.error('Error generando PDF:', err)
    } finally {
      setDescargando(false)
    }
  }

  if (loading) return <div className="p-4 md:p-6">Cargando remisión...</div>
  if (!salida) return <div className="p-4 md:p-6">Remisión no encontrada.</div>

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex gap-3 justify-between items-center mb-6">
        <button
          onClick={() => window.history.back()}
          className="text-sm px-4 py-2 rounded-lg border transition"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-soft)' }}
        >
          ← Volver
        </button>
        <button
          onClick={() => void descargarPDF()}
          disabled={descargando}
          className="text-sm px-5 py-2.5 rounded-xl font-semibold transition disabled:opacity-50"
          style={{ background: 'var(--color-accent)', color: 'white' }}
        >
          {descargando ? 'Generando PDF...' : '⬇ Descargar PDF'}
        </button>
      </div>

      <div id="salida-pdf" className="bg-white font-sans max-w-3xl mx-auto border border-[#EDE5DC]">
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
              <img
                src={tienda.logo_url}
                alt="Logo"
                style={{ height: '48px', objectFit: 'contain', marginBottom: '8px' }}
              />
            ) : (
              <p
                style={{
                  fontFamily: 'serif',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  marginBottom: '4px',
                }}
              >
                {tienda?.nombre}
              </p>
            )}
            {tienda?.nit && (
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>NIT: {tienda.nit}</p>
            )}
            {tienda?.ciudad && (
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>{tienda.ciudad}</p>
            )}
            {tienda?.telefono && (
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Tel: {tienda.telefono}</p>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '0.05em' }}>
              REMISIÓN DE SALIDA
            </p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>
              Fecha:{' '}
              {salida
                ? new Date(`${salida.fecha}T12:00:00`).toLocaleDateString('es-CO', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })
                : ''}
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
              Para:
            </p>
            <p style={{ fontSize: '15px', fontWeight: '600', color: '#1A1510' }}>
              {salida?.tiendas_consignatarias?.nombre}
            </p>
            {salida?.tiendas_consignatarias?.nit && (
              <p style={{ fontSize: '12px', color: '#8A7D72' }}>
                NIT: {salida.tiendas_consignatarias.nit}
              </p>
            )}
            {salida?.tiendas_consignatarias?.ciudad && (
              <p style={{ fontSize: '12px', color: '#8A7D72' }}>{salida.tiendas_consignatarias.ciudad}</p>
            )}
            {salida?.tiendas_consignatarias?.contacto && (
              <p style={{ fontSize: '12px', color: '#8A7D72' }}>
                Contacto: {salida.tiendas_consignatarias.contacto}
              </p>
            )}
            {salida?.tiendas_consignatarias?.telefono && (
              <p style={{ fontSize: '12px', color: '#8A7D72' }}>
                Tel: {salida.tiendas_consignatarias.telefono}
              </p>
            )}
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
              De:
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
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#8A7D72', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #EDE5DC' }}>SKU</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#8A7D72', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #EDE5DC' }}>Producto</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#8A7D72', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #EDE5DC' }}>Cant.</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '11px', fontWeight: '600', color: '#8A7D72', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #EDE5DC' }}>Precio unit.</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '11px', fontWeight: '600', color: '#8A7D72', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #EDE5DC' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const subtotal = item.cantidad * item.precio_unitario
                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid #F0EBE4',
                      background: i % 2 === 0 ? 'white' : '#FDFAF7',
                    }}
                  >
                    <td style={{ padding: '12px', fontSize: '12px', color: '#8A7D72' }}>
                      {item.productos?.sku || '—'}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', fontWeight: '500', color: '#1A1510' }}>
                      {item.productos?.nombre}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#1A1510', textAlign: 'center' }}>
                      {item.cantidad}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#1A1510', textAlign: 'right' }}>
                      {formatCOP(item.precio_unitario)}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', fontWeight: '600', color: '#1A1510', textAlign: 'right' }}>
                      {formatCOP(subtotal)}
                    </td>
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
          <div style={{ minWidth: '240px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 0',
                borderBottom: '2px solid #1E3A2F',
              }}
            >
              <span style={{ fontSize: '15px', fontWeight: '700', color: '#1E3A2F' }}>Total remisión</span>
              <span style={{ fontSize: '15px', fontWeight: '700', color: '#1E3A2F' }}>
                {formatCOP(totalRemision)}
              </span>
            </div>
            <p style={{ fontSize: '11px', color: '#8A7D72', marginTop: '6px' }}>{totalUnidades} unidades en total</p>
          </div>
        </div>

        {salida?.notas && (
          <div style={{ padding: '16px 32px', borderTop: '1px solid #EDE5DC' }}>
            <p style={{ fontSize: '11px', textTransform: 'uppercase', color: '#8A7D72', marginBottom: '4px' }}>
              Notas:
            </p>
            <p style={{ fontSize: '13px', color: '#4A3F35' }}>{salida.notas}</p>
          </div>
        )}

        <div style={{ padding: '40px 32px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #1A1510', paddingTop: '8px' }}>
              <p style={{ fontSize: '12px', color: '#4A3F35', fontWeight: '600' }}>
                {tienda?.representante || tienda?.nombre}
              </p>
              <p style={{ fontSize: '11px', color: '#8A7D72' }}>Entrega</p>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #1A1510', paddingTop: '8px' }}>
              <p style={{ fontSize: '12px', color: '#4A3F35', fontWeight: '600' }}>
                {salida?.tiendas_consignatarias?.contacto || salida?.tiendas_consignatarias?.nombre}
              </p>
              <p style={{ fontSize: '11px', color: '#8A7D72' }}>Recibe</p>
            </div>
          </div>
        </div>

        <div style={{ background: '#1E3A2F', padding: '12px 32px', textAlign: 'center' }}>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
            Documento generado por Leva · {new Date().toLocaleDateString('es-CO')}
          </p>
        </div>
      </div>
    </div>
  )
}
