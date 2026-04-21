export function descargarCSV(nombre: string, filas: string[][]) {
  const contenido = filas
    .map((fila) =>
      fila
        .map((celda) => {
          const s = String(celda ?? '')
          return s.includes(',') || s.includes('"') || s.includes('\n')
            ? `"${s.replace(/"/g, '""')}"`
            : s
        })
        .join(','),
    )
    .join('\n')

  const blob = new Blob(['\uFEFF' + contenido], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

export function parsearCSV(texto: string): Record<string, string>[] {
  const lineas = texto
    .replace(/^\uFEFF/, '')
    .trim()
    .split('\n')
    .map((l) => l.replace(/\r$/, ''))

  if (lineas.length < 2) return []

  // Detectar separador automáticamente basado en la primera línea
  const primeraLinea = lineas[0]
  const separador = primeraLinea.split(';').length > primeraLinea.split(',').length ? ';' : ','

  const encabezados = primeraLinea
    .split(separador)
    .map((h) => h.trim().replace(/^"|"$/g, '').replace(/^\uFEFF/, ''))

  return lineas
    .slice(1)
    .filter((l) => l.trim() !== '')
    .map((linea) => {
      const valores: string[] = []
      let dentro = false
      let actual = ''
      for (const char of linea) {
        if (char === '"') {
          dentro = !dentro
        } else if (char === separador && !dentro) {
          valores.push(actual.trim())
          actual = ''
        } else {
          actual += char
        }
      }
      valores.push(actual.trim())

      const fila: Record<string, string> = {}
      encabezados.forEach((h, i) => {
        fila[h] = (valores[i] ?? '').replace(/^"|"$/g, '')
      })
      return fila
    })
    .filter((fila) => Object.values(fila).some((v) => v.trim() !== ''))
}

export function normalizarFecha(valor: string): string | null {
  if (!valor?.trim()) return null
  const v = valor.trim()

  // Ya está en formato correcto YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v

  // DD/MM/YYYY o DD-MM-YYYY
  const dmy = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (dmy) {
    const [, d, m, y] = dmy
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // MM/DD/YYYY (formato americano)
  const mdy = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdy) {
    const [, m, d, y] = mdy
    // Si el primer número > 12, es DD/MM/YYYY
    if (parseInt(m) > 12) {
      return `${y}-${d.padStart(2, '0')}-${m.padStart(2, '0')}`
    }
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // YYYY/MM/DD
  const ymd = v.match(/^(\d{4})\/(\d{2})\/(\d{2})$/)
  if (ymd) {
    const [, y, m, d] = ymd
    return `${y}-${m}-${d}`
  }

  // Intentar con Date nativo como último recurso
  const d = new Date(v)
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0]
  }

  return null
}
