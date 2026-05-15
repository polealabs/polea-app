import fs from 'fs'

const p = 'app/(dashboard)/consignaciones/page.tsx'
let text = fs.readFileSync(p, 'utf8')

const salidasBlock = `          <motion.div className="mt-6">
            <ImportCSV
              descripcion="Columnas: fecha*, tienda_aliada*, producto*, cantidad*, precio_unitario*. Filas con la misma fecha y tienda se agrupan en una remisión."
              onDescargarPlantilla={descargarPlantillaSalidasHistorial}
              onProcesar={async (filas) => {
                const res = await importarSalidasConsignacion(filas)
                if (res.exitosos > 0) {
                  showToast(
                    \`\${res.exitosos} línea\${res.exitosos > 1 ? 's' : ''} de salida importada\${res.exitosos > 1 ? 's' : ''}\`,
                  )
                  await loadData()
                }
                return res
              }}
            />
            <motion.div className="flex items-center justify-between mb-3 mt-4">`

text = text.replace(
  /          <div className="mt-6">[\s\S]*?            <\/motion.div>\n            \{remisionesFiltradas/,
  `${salidasBlock}\n            {remisionesFiltradas`,
)

const devolucionesImport = `          <ImportCSV
            descripcion="Columnas: fecha*, tienda_aliada*, producto*, cantidad, notas (opcional)"
            onDescargarPlantilla={descargarPlantillaDevolucionesHistorial}
            onProcesar={async (filas) => {
              const res = await importarDevolucionesConsignacion(filas)
              if (res.exitosos > 0) {
                showToast(
                  \`\${res.exitosos} devolución\${res.exitosos > 1 ? 'es' : ''} importada\${res.exitosos > 1 ? 's' : ''}\`,
                )
                await loadData()
              }
              return res
            }}
          />
          <motion.div className="min-w-0 bg-white border border-[#EDE5DC] rounded-2xl overflow-x-auto">`

if (!text.includes('importarDevolucionesConsignacion(filas)')) {
  text = text.replace(
    '          <motion.div className="min-w-0 bg-white border border-[#EDE5DC] rounded-2xl overflow-x-auto">',
    devolucionesImport,
    1,
  )
}

const liquidacionesImport = `          <ImportCSV
            descripcion="Columnas: fecha*, tienda_aliada*, mes* (YYYY-MM), total_vendido*, notas (opcional)"
            onDescargarPlantilla={descargarPlantillaLiquidacionesHistorial}
            onProcesar={async (filas) => {
              const res = await importarLiquidacionesConsignacion(filas)
              if (res.exitosos > 0) {
                showToast(
                  \`\${res.exitosos} liquidación\${res.exitosos > 1 ? 'es' : ''} importada\${res.exitosos > 1 ? 's' : ''}\`,
                )
                await loadData()
              }
              return res
            }}
          />
          <motion.div className="min-w-0 bg-white border border-[#EDE5DC] rounded-2xl overflow-x-auto">`

const liqIdx = text.indexOf("{tab === 'liquidaciones'")
const devImportIdx = text.indexOf('importarLiquidacionesConsignacion')
if (liqIdx !== -1 && !text.slice(liqIdx).includes('importarLiquidacionesConsignacion(filas)')) {
  const tableInLiq = text.indexOf(
    '          <motion.div className="min-w-0 bg-white border border-[#EDE5DC] rounded-2xl overflow-x-auto">',
    liqIdx,
  )
  if (tableInLiq !== -1) {
    text =
      text.slice(0, tableInLiq) +
      liquidacionesImport.replace(/motion\.div/g, 'motion.div').replace('motion.div', 'div') +
      text.slice(tableInLiq + '          <motion.div className="min-w-0 bg-white border border-[#EDE5DC] rounded-2xl overflow-x-auto">'.length)
  }
}

// fix accidental motion.div typos from script
text = text.replace(/<motion\.motion\.motion\.div/g, '<motion.div')
text = text.replace(/<motion\.div className="mt-6">/g, '<motion.div className="mt-6">')
text = text.replace(/<motion\.div className="flex items-center justify-between mb-3 mt-4">/g, '<motion.div className="flex items-center justify-between mb-3 mt-4">')
text = text.replace(/<motion\.div className="min-w-0 bg-white/g, '<motion.div className="min-w-0 bg-white')

fs.writeFileSync(p, text, 'utf8')
console.log('patched')
