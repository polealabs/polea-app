'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { Documento, Tienda } from '@/lib/types'
import { obtenerDocumento } from '../../actions'

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)
}

function formatFecha(fecha: string) {
  return new Date(fecha + 'T12:00:00').toLocaleDateString('es-CO')
}

function numeroALetras(num: number): string {
  const unidades = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte']
  const decenas = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
  const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos']
  if (num === 0) return 'cero pesos m/cte'
  let valor = Math.floor(Math.max(0, num))
  let resultado = ''
  if (valor >= 1000000) {
    const millones = Math.floor(valor / 1000000)
    resultado += millones === 1 ? 'un millón ' : `${numeroALetras(millones).replace(' pesos m/cte', '')} millones `
    valor %= 1000000
  }
  if (valor >= 1000) {
    const miles = Math.floor(valor / 1000)
    resultado += miles === 1 ? 'mil ' : `${numeroALetras(miles).replace(' pesos m/cte', '')} mil `
    valor %= 1000
  }
  if (valor >= 100) {
    resultado += centenas[Math.floor(valor / 100)] + ' '
    valor %= 100
  }
  if (valor > 20) {
    resultado += decenas[Math.floor(valor / 10)]
    if (valor % 10 > 0) resultado += ' y ' + unidades[valor % 10]
  } else if (valor > 0) {
    resultado += unidades[valor]
  }
  return resultado.trim() + ' pesos m/cte'
}

export default function DocumentoPdfPage() {
  const params = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [descargando, setDescargando] = useState(false)
  const [documento, setDocumento] = useState<Documento | null>(null)
  const [tienda, setTienda] = useState<Tienda | null>(null)

  useEffect(() => {
    const id = window.setTimeout(() => {
      void obtenerDocumento(params.id).then((res) => {
        if (!res?.ok || !res.documento) {
          setLoading(false)
          return
        }
        setDocumento(res.documento as Documento)
        setTienda(res.tienda as Tienda)
        setLoading(false)
      })
    }, 0)
    return () => window.clearTimeout(id)
  }, [params.id])

  const mensajeWA = useMemo(() => {
    if (!documento) return ''
    return `Hola ${documento.destinatario_nombre}, te comparto la ${documento.tipo === 'cotizacion' ? 'cotización' : 'cuenta de cobro'} ${documento.numero} por ${formatCOP(documento.total)}. Quedo atento/a a tu confirmación.`
  }, [documento])

  async function descargarPDF() {
    setDescargando(true)
    try {
      const elemento = document.getElementById('documento-pdf')
      if (!elemento) return

      const { default: html2canvas } = await import('html2canvas')
      const { default: jsPDF } = await import('jspdf')

      // Clonar el elemento para aplicar estilos inline sin afectar el DOM
      const clone = elemento.cloneNode(true) as HTMLElement
      clone.style.position = 'fixed'
      clone.style.top = '-9999px'
      clone.style.left = '-9999px'
      clone.style.width = '794px' // A4 width en px a 96dpi
      clone.style.background = '#FFFFFF'
      clone.style.fontFamily = 'Arial, sans-serif'
      document.body.appendChild(clone)

      const canvas = await html2canvas(clone, {
        scale: 2,
        backgroundColor: '#FFFFFF',
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
          // Reemplazar todos los colores oklab por equivalentes hex
          const elements = clonedDoc.querySelectorAll('*')
          elements.forEach((el) => {
            const htmlEl = el as HTMLElement
            const style = window.getComputedStyle(htmlEl)
            // Forzar colores seguros
            if (style.backgroundColor.includes('oklab') || style.backgroundColor.includes('oklch')) {
              htmlEl.style.backgroundColor = '#ffffff'
            }
            if (style.color.includes('oklab') || style.color.includes('oklch')) {
              htmlEl.style.color = '#1a1510'
            }
            if (style.borderColor.includes('oklab') || style.borderColor.includes('oklch')) {
              htmlEl.style.borderColor = '#ede5dc'
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
      const nombre = `${documento!.numero}-${documento!.destinatario_nombre.replace(/\s+/g, '-')}`
      pdf.save(`${nombre}.pdf`)
    } catch (err) {
      console.error('Error generando PDF:', err)
    } finally {
      setDescargando(false)
    }
  }

  if (loading) return <div className="p-4 md:p-6">Cargando documento...</div>
  if (!documento || !tienda) return <div className="p-4 md:p-6">Documento no encontrado.</div>

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap gap-2 mb-4">
        <Link href="/documentos" className="text-sm px-4 py-2 rounded-lg border border-[#EDE5DC] text-ink-soft hover:text-ink">
          ← Volver
        </Link>
        <button type="button" onClick={() => void descargarPDF()} className="btn-primary text-sm font-semibold px-4 py-2 rounded-lg">
          {descargando ? 'Descargando...' : 'Descargar PDF'}
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent(mensajeWA)}`} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm font-semibold px-4 py-2 rounded-lg">
          WhatsApp
        </a>
      </div>

      <div id="documento-pdf" className="bg-white font-sans max-w-2xl mx-auto p-8 border border-[#EDE5DC] rounded-xl">
        <div className="flex items-start justify-between p-4 rounded-lg text-white" style={{ background: '#1E3A2F' }}>
          <div className="flex items-center gap-3">
            {tienda.logo_url ? (
              <img src={tienda.logo_url} alt="Logo" className="w-14 h-14 object-cover rounded-md bg-white/10" />
            ) : (
              <p className="font-serif text-2xl">{tienda.nombre}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">{documento.tipo === 'cotizacion' ? 'COTIZACIÓN' : 'CUENTA DE COBRO'}</p>
            <p className="text-sm">Número: {documento.numero}</p>
            <p className="text-sm">Fecha: {formatFecha(documento.fecha)}</p>
          </div>
        </div>

        <div className="py-4 text-sm text-[#1A1510] space-y-1">
          <p>NIT: {tienda.nit || '—'}</p>
          <p>{tienda.ciudad || '—'} · {tienda.telefono || '—'}</p>
          <p>{tienda.email || '—'}</p>
          <p>{tienda.direccion || '—'}</p>
        </div>

        {documento.tipo === 'cotizacion' ? (
          <>
            <div className="mb-4 text-sm text-[#1A1510]">
              <p className="font-semibold mb-1">Para:</p>
              <p>{documento.destinatario_nombre}</p>
              <p>NIT/CC: {documento.destinatario_nit || '—'}</p>
              <p>{documento.destinatario_ciudad || '—'} · {documento.destinatario_telefono || '—'}</p>
            </div>

            <table className="w-full text-sm mb-5">
              <thead style={{ background: '#1E3A2F', color: '#fff' }}>
                <tr>
                  <th className="text-left px-3 py-2">Descripción</th>
                  <th className="text-right px-3 py-2">Cant</th>
                  <th className="text-right px-3 py-2">Precio unit</th>
                  <th className="text-right px-3 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {documento.items.map((it, i) => (
                  <tr key={i} className="border-b border-[#EDE5DC]">
                    <td className="px-3 py-2">{it.descripcion}</td>
                    <td className="px-3 py-2 text-right">{it.cantidad}</td>
                    <td className="px-3 py-2 text-right">{formatCOP(it.precio_unitario)}</td>
                    <td className="px-3 py-2 text-right">{formatCOP(it.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={3} className="px-3 py-2 text-right">Subtotal</td><td className="px-3 py-2 text-right">{formatCOP(documento.subtotal)}</td></tr>
                <tr><td colSpan={3} className="px-3 py-2 text-right">Descuento</td><td className="px-3 py-2 text-right">-{formatCOP((documento.subtotal * documento.descuento) / 100)}</td></tr>
                <tr><td colSpan={3} className="px-3 py-2 text-right font-bold text-lg">TOTAL</td><td className="px-3 py-2 text-right font-bold text-lg">{formatCOP(documento.total)}</td></tr>
              </tfoot>
            </table>
          </>
        ) : (
          <div className="text-sm text-[#1A1510] space-y-2 mb-5">
            <p className="font-semibold">Manifiesto que:</p>
            <p className="text-lg font-semibold">{documento.destinatario_nombre}</p>
            <p>NIT/CC: {documento.destinatario_nit || '—'}</p>
            <p className="font-semibold">DEBE A:</p>
            <p className="text-lg font-semibold">{tienda.nombre}</p>
            <p>NIT/CC: {tienda.nit || '—'}</p>
            <p>La suma de:</p>
            <p className="italic">{numeroALetras(documento.total)}</p>
            <p className="text-xl font-bold">({formatCOP(documento.total)})</p>
            <div className="mt-3">
              <p className="font-semibold">Concepto:</p>
              <p>{documento.concepto || 'Cuenta de cobro'}</p>
            </div>
          </div>
        )}

        {documento.tipo === 'cuenta_cobro' && documento.numero_cuenta && (
          <div className="text-sm text-[#1A1510] mb-5">
            <p>Autorizo realizar consignación en la siguiente cuenta bancaria:</p>
            <p>{documento.tipo_cuenta || '—'} {documento.banco || '—'} {documento.numero_cuenta || '—'}</p>
            <p>Titular: {documento.titular_cuenta || '—'} CC {documento.cedula_titular || '—'}</p>
          </div>
        )}

        <div className="flex justify-between mt-16 text-sm text-[#1A1510]">
          <div className="w-1/2 pr-6">
            <div className="border-t border-[#1A1510] pt-1">{tienda.representante || tienda.nombre}</div>
            <p>Representante</p>
          </div>
          <div className="w-1/2 pl-6">
            <div className="border-t border-[#1A1510] pt-1">Firma del receptor</div>
            <p>Fecha:</p>
          </div>
        </div>

        <div className="mt-8 text-sm text-[#1A1510]">
          <p>Atentamente,</p>
          <p>{tienda.representante || tienda.nombre}</p>
          <p>Cel: {tienda.telefono || tienda.whatsapp || '—'}</p>
        </div>
      </div>
    </div>
  )
}
