'use client'

import type React from 'react'
import { useRef, useState } from 'react'

interface ResultadoImport {
  exitosos: number
  errores: { fila: number; mensaje: string }[]
}

interface ImportCSVProps {
  onDescargarPlantilla: () => void
  onProcesar: (filas: Record<string, string>[]) => Promise<ResultadoImport>
  descripcion?: string
}

export default function ImportCSV({ onDescargarPlantilla, onProcesar, descripcion }: ImportCSVProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [procesando, setProcesando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoImport | null>(null)

  async function handleArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return

    // Validar extensión
    if (!archivo.name.toLowerCase().endsWith('.csv')) {
      setResultado({
        exitosos: 0,
        errores: [
          {
            fila: 0,
            mensaje:
              'El archivo debe ser formato CSV (.csv). Descarga la plantilla, diligénciala en Excel y guárdala como "CSV UTF-8".',
          },
        ],
      })
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    // Validar tamaño (máximo 5MB)
    if (archivo.size > 5 * 1024 * 1024) {
      setResultado({
        exitosos: 0,
        errores: [{ fila: 0, mensaje: 'El archivo es demasiado grande. El tamaño máximo permitido es 5MB.' }],
      })
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setProcesando(true)
    setResultado(null)

    try {
      const texto = await archivo.text()
      const { parsearCSV } = await import('@/lib/csv')
      const filas = parsearCSV(texto)

      if (filas.length === 0) {
        setResultado({
          exitosos: 0,
          errores: [
            {
              fila: 0,
              mensaje:
                'El archivo está vacío o no tiene filas de datos. Verifica que tenga al menos una fila además del encabezado.',
            },
          ],
        })
        setProcesando(false)
        if (inputRef.current) inputRef.current.value = ''
        return
      }

      const res = await onProcesar(filas)
      setResultado(res)
    } catch {
      setResultado({
        exitosos: 0,
        errores: [
          {
            fila: 0,
            mensaje:
              'No se pudo leer el archivo. Asegúrate de que esté guardado como CSV UTF-8 desde Excel.',
          },
        ],
      })
    }

    setProcesando(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="bg-[#FAF6F0] border border-[#EDE5DC] rounded-xl p-4 mb-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[#1E3A2F] uppercase tracking-wide mb-0.5">
            Carga masiva
          </p>
          {descripcion && (
            <p className="text-xs text-[#8A7D72] leading-snug">{descripcion}</p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onDescargarPlantilla}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[#EDE5DC] bg-white text-[#4A3F35] hover:border-[#C4B8B0] transition"
          >
            ↓ Plantilla CSV
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={procesando}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#1E3A2F] text-white hover:bg-[#2D4A3E] transition disabled:opacity-50"
          >
            {procesando ? 'Procesando...' : '↑ Cargar CSV'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleArchivo}
          />
        </div>
      </div>

      {resultado && (
        <div className="mt-3 pt-3 border-t border-[#EDE5DC]">
          {resultado.exitosos > 0 && (
            <p className="text-xs text-[#3A7D5A] font-medium mb-1">
              ✓ {resultado.exitosos} registro{resultado.exitosos > 1 ? 's' : ''} importado
              {resultado.exitosos > 1 ? 's' : ''} correctamente
            </p>
          )}
          {resultado.errores.length > 0 && (
            <div className="px-4 py-3 bg-[#FDEAEA] rounded-lg">
              <p className="text-sm font-semibold text-[#C44040] mb-1.5">
                {resultado.errores.length === 1 && resultado.errores[0].fila === 0
                  ? 'Error al cargar el archivo:'
                  : `${resultado.errores.length} error${resultado.errores.length > 1 ? 'es' : ''} encontrado${resultado.errores.length > 1 ? 's' : ''}:`}
              </p>
              <ul className="space-y-1">
                {resultado.errores.slice(0, 10).map((e, i) => (
                  <li key={i} className="text-xs text-[#C44040]">
                    {e.fila === 0 ? e.mensaje : `Fila ${e.fila}: ${e.mensaje}`}
                  </li>
                ))}
                {resultado.errores.length > 10 && (
                  <li className="text-xs text-[#C44040]">
                    ...y {resultado.errores.length - 10} errores más
                  </li>
                )}
              </ul>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setResultado(null)
            }}
            className="text-xs text-[#8A7D72] hover:text-[#1A1510] mt-2 underline underline-offset-2"
          >
            Limpiar
          </button>
        </div>
      )}
    </div>
  )
}
