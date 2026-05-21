# CLAUDE.md — Contexto completo del proyecto Polea

> Este archivo está optimizado para que Claude Code tenga todo el contexto necesario para trabajar en el proyecto sin preguntas adicionales.

---

## 1. DESCRIPCIÓN DEL PROYECTO

**Polea** es un SaaS de gestión administrativa para pequeños negocios colombianos que venden por WhatsApp, Instagram y presencial. Permite registrar ventas, controlar inventario, gestionar gastos y generar reportes financieros (P&L y Flujo de caja).

- **Fundadores:** Nicolás Idrobo (SDR) · Luis Daniel (QA Lead)
- **Ciudad:** Cali, Colombia
- **Industrias objetivo:** Joyería, ropa, cosméticos, ferretería, restaurantes, artesanías y más
- **Modelo de negocio:** SaaS con suscripción mensual (cobro vía Wompi — pendiente)
- **Estado:** En producción con clientes reales

---

## 2. STACK TECNOLÓGICO

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16.2.3 (App Router, Turbopack) |
| Lenguaje | TypeScript 5 |
| Estilos | Tailwind CSS v4 |
| Base de datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth |
| Deploy | Vercel (plan Hobby) |
| PDF | jsPDF + html2canvas |
| Fuentes | Fraunces (serif) + DM Sans (sans) |
| Package manager | pnpm |

---

## 3. INFRAESTRUCTURA

```
Repositorio:   https://github.com/polealabs/polea-app
Supabase URL:  https://amzldldwuxtahohueule.supabase.co
Producción:    https://polea-app.vercel.app
```

**Variables de entorno requeridas (en `.env.local` y Vercel):**
```
NEXT_PUBLIC_SUPABASE_URL=https://amzldldwuxtahohueule.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=https://polea-app.vercel.app
```

**Proxy:** El proyecto usa `proxy.ts` en la raíz en lugar de `middleware.ts` por requerimiento de Next.js 16. Protege todas las rutas del dashboard.

---

## 4. ESTRUCTURA DE CARPETAS

```
polea-app/
├── app/
│   ├── (auth)/                    # Rutas públicas de autenticación
│   │   ├── actions.ts             # login, registro, logout, recuperar contraseña
│   │   ├── login/page.tsx
│   │   ├── registro/page.tsx
│   │   ├── recuperar-contrasena/page.tsx
│   │   └── nueva-contrasena/page.tsx
│   ├── (dashboard)/               # Todas las rutas protegidas
│   │   ├── layout.tsx             # Layout del dashboard con Sidebar
│   │   ├── actions-tienda.ts      # Acciones de configuración de tienda
│   │   ├── dashboard/page.tsx     # KPIs, gráficos, alertas
│   │   ├── productos/             # Inventario con variantes expandibles
│   │   │   ├── page.tsx
│   │   │   ├── actions.ts
│   │   │   ├── actions-import.ts
│   │   │   └── [id]/variantes/page.tsx  # Gestión avanzada de atributos
│   │   ├── entradas/              # Compras de inventario
│   │   ├── ventas/                # Registro de ventas multi-producto
│   │   ├── clientes/              # CRM básico
│   │   │   └── [id]/page.tsx      # Detalle con historial de compras
│   │   ├── gastos/                # Gastos variables/fijos/financieros
│   │   ├── proveedores/
│   │   ├── reportes/              # P&L y Flujo de caja
│   │   ├── consignaciones/        # Tiendas aliadas completo
│   │   │   ├── page.tsx
│   │   │   ├── actions.ts
│   │   │   ├── actions-import.ts          # CSV tiendas consignatarias
│   │   │   ├── actions-import-historial.ts # CSV salidas/devoluciones/liquidaciones
│   │   │   ├── salida/[id]/pdf/page.tsx   # PDF remisión de salida
│   │   │   └── devolucion/[id]/pdf/page.tsx # PDF devolución
│   │   ├── documentos/            # Cotizaciones y cuentas de cobro
│   │   ├── eventos/               # Módulo de ferias y eventos
│   │   │   ├── page.tsx           # Lista de eventos
│   │   │   ├── actions.ts
│   │   │   └── [id]/
│   │   │       ├── page.tsx       # Detalle con tabs inventario/ventas/gastos/consolidado
│   │   │       └── actions-import.ts # CSV masivo por tab
│   │   ├── equipo/                # Roles e invitaciones
│   │   ├── configuracion/medios-pago/  # Medios de pago personalizables
│   │   ├── perfil/
│   │   ├── preferencias/          # Umbrales de alertas
│   │   └── ayuda/
│   ├── invitacion/[token]/page.tsx # Aceptar invitación de equipo
│   ├── polealabs/                 # Admin panel (solo polealabs@gmail.com)
│   │   ├── page.tsx               # Overview métricas globales
│   │   ├── tiendas/               # Lista y detalle de tiendas
│   │   ├── usuarios/
│   │   └── metricas/
│   ├── layout.tsx                 # Layout raíz con anti-flash de temas
│   ├── page.tsx                   # Landing page pública
│   └── globals.css
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx            # Navegación lateral
│   │   ├── Header.tsx
│   │   └── HeaderWrapper.tsx
│   ├── skeletons/
│   │   └── ModuleTableSkeleton.tsx
│   └── ui/
│       ├── ProductoSelect.tsx     # Select con búsqueda para productos
│       ├── CalculadoraPrecios.tsx # Calculadora de margen por industria
│       ├── Toast.tsx              # Sistema de notificaciones toast
│       ├── ImportCSV.tsx          # Carga masiva CSV reutilizable
│       ├── ConfirmModal.tsx       # Modal de confirmación
│       └── Tooltip.tsx            # Tooltip con portal (evita z-index issues)
├── lib/
│   ├── hooks/
│   │   ├── useTienda.ts           # Hook principal de contexto de tienda
│   │   └── useToast.ts
│   ├── context/
│   │   └── TemaContext.tsx
│   ├── supabase/
│   │   ├── client.ts              # Cliente browser
│   │   └── server.ts              # Cliente servidor (Server Actions)
│   ├── types.ts                   # Todos los tipos TypeScript
│   ├── utils.ts                   # formatCOP, calcularComisionMedioPago, etc.
│   ├── csv.ts                     # parsearCSV, descargarCSV, normalizarFecha
│   ├── temas.ts                   # Definición de los 4 temas
│   ├── tipos-industria.ts         # Márgenes por industria para calculadora
│   └── notificaciones.ts          # Generación de alertas inteligentes
├── proxy.ts                       # Reemplaza middleware.ts para Next.js 16
├── next.config.ts                 # turbopack.root: __dirname
├── tailwind.config.ts
└── CLAUDE.md                      # Este archivo
```

---

## 5. DECISIONES TÉCNICAS CRÍTICAS

### proxy.ts en lugar de middleware.ts
Next.js 16 deprecó `middleware.ts`. El proxy no usa `@supabase/ssr` para evitar el error `__dirname` en Edge Runtime. Protege todas las rutas del dashboard verificando sesión de Supabase.

### RLS en Supabase
- **Tabla `tiendas`**: RLS activo. La referencia circular con `miembros` se resolvió con la función `get_tiendas_usuario()` (`SECURITY DEFINER`), que consulta ambas tablas sin RLS y retorna los `tienda_id` del usuario. La política es `id IN (SELECT get_tiendas_usuario())`.
- **Resto de tablas**: RLS activo con políticas que filtran por `tienda_id IN (SELECT id FROM tiendas WHERE owner_id = auth.uid())`.
- Las tablas nuevas (eventos, evento_inventario, evento_ventas, evento_gastos) tienen RLS activo.

### Triggers eliminados
- `trg_entrada_crea_gasto`: eliminado porque creaba gastos duplicados en el P&L al registrar entradas de inventario.
- `trg_entrada_suma_stock`: activo — suma stock al registrar entradas.
- `trg_consignacion_resta_stock`: activo — resta stock al registrar salida a tienda aliada.
- `trg_consignacion_devolucion_stock`: activo — restaura stock al registrar devolución.

### Constraints eliminados
- `gastos_categoria_check`: eliminado para permitir subcategorías libres sin validación de BD.
- `ventas_cabecera_plataforma_pago_check`: eliminado para soportar medios de pago personalizados.

### Anti-flash de temas
Script inline en `app/layout.tsx` aplica variables CSS desde `localStorage` antes del primer paint para evitar flash del tema por defecto.

### Timezone Colombia
Todos los selectores de mes usan `new Date().getTime() - getTimezoneOffset() * 60000` para evitar que a las 7pm Colombia (medianoche UTC) el mes cambie incorrectamente.

### CPV (Costo de Productos Vendidos)
1. Por cada producto vendido, buscar `costo_produccion` en tabla `productos`
2. Si no tiene, buscar `costo_unitario` de la entrada más reciente antes de la venta
3. CPV = Σ (cantidad_vendida × costo_unitario)
Solo aplica a productos tipo "Producto terminado".

### compra_inventario solo en flujo de caja
Las compras de insumos/materia prima van como tipo `compra_inventario` en `gastos`. Este tipo aparece SOLO en el flujo de caja, NO en el P&L. Esto evita doble conteo con el CPV.

### Validación CSV en dos pasos
1. **Paso 1 (validación):** Recorre todas las filas, acumula errores. Si hay CUALQUIER error → abortar, devolver todos los errores, NO escribir nada en BD.
2. **Paso 2 (escritura):** Solo si paso 1 sin errores → insertar fila por fila, acumular errores de BD.
Mensaje de aborto: "Se encontraron N error(es). No se importó ningún registro."

### Admin panel en /polealabs
Protegido por tabla `admins` en Supabase. Solo accesible para `polealabs@gmail.com` y `ldct.ldct@gmail.com`. No aparece en el Sidebar normal.

### Variantes de productos
- Los productos pueden tener variantes (tallas, colores, etc.)
- `productos.tiene_variantes = true` y `productos.stock_actual = 0` cuando tiene variantes
- El stock real vive en `producto_variantes.stock_actual`
- **CRÍTICO:** Para calcular stock bajo/agotado, NO usar `p.tiene_variantes` (puede estar desactualizado). Usar si hay registros en `producto_variantes` para ese producto (`tieneVariantesReal = variantesDelProducto.length > 0`).
- En el módulo de inventario, las variantes se muestran como filas expandibles bajo el producto padre.

### Encoding UTF-8 en consignaciones/page.tsx
Este archivo ha tenido problemas recurrentes de encoding. El `.vscode/settings.json` está configurado con `"files.encoding": "utf8"` y `"files.autoGuessEncoding": false`. Si los caracteres especiales se corrompen de nuevo, usar escapes Unicode en strings críticos: `devoluci{'\u00f3'}n`, `{'\u2192'}`.

---

## 6. TRIGGERS EN SUPABASE

| Trigger | Tabla | Qué hace |
|---------|-------|----------|
| `trg_entrada_suma_stock` | `entradas` | Suma `cantidad` al `stock_actual` del producto al INSERT |
| `trg_consignacion_resta_stock` | `consignaciones` | Resta stock al producto al registrar salida a tienda aliada |
| `trg_consignacion_devolucion_stock` | `consignacion_movimientos` | Restaura stock al producto al registrar devolución |

---

## 7. TABLAS DE BASE DE DATOS

### Tablas principales

**tiendas** — `id, nombre, owner_id, ciudad, categoria, whatsapp, moneda, logo_url, tema, tamano_letra, nit, representante, telefono, email, direccion`

**perfiles** — `id (→ auth.users), nombre, updated_at`

**miembros** — `id, tienda_id, user_id, rol (owner/admin/vendedor/readonly), email, invitado_por, created_at`

**invitaciones** — `id, tienda_id, email, rol, token, aceptada, invitado_por, expires_at`

**productos** — `id, tienda_id, nombre, sku, tipo, precio_venta, costo_produccion, stock_actual, stock_minimo, unidades_defectuosas, tiene_variantes, estado`

**producto_variantes** — `id, tienda_id, producto_id, nombre, sku, atributos (jsonb), precio_venta, costo_produccion, stock_actual, stock_minimo, activa`

**producto_atributos** — `id, tienda_id, producto_id, nombre`

**entradas** — `id, tienda_id, producto_id, proveedor_id, cantidad, costo_unitario, fecha, notas`

**ventas_cabecera** — `id, tienda_id, cliente_id, canal, plataforma_pago, medio_pago_id, fecha, total_bruto, total_neto, total_costo_transaccion, comision_iva, envio`

**venta_items** — `id, tienda_id, venta_id, producto_id, variante_id, cantidad, precio_venta, descuento, neto, costo_transaccion`

**clientes** — `id, tienda_id, nombre, email, telefono, direccion, ciudad, fecha_creacion, created_at`

**gastos** — `id, tienda_id, descripcion, monto, fecha, categoria, tipo_gasto (variable/fijo/financiero/compra_inventario), subcategoria, proveedor_id`

**proveedores** — `id, tienda_id, nombre, categorias (array), telefono, nit, ciudad`

**medios_pago** — `id, tienda_id, nombre, tipo (efectivo/transferencia/datafono/pasarela_web/cuotas/contraentrega/nequi_daviplata), comision_porcentaje, tarifa_fija, cobra_iva, activo`

**documentos** — `id, tienda_id, tipo (cotizacion/cuenta_cobro), numero, cliente_id, destinatario_*, concepto, items (jsonb), subtotal, descuento, total, datos_bancarios, fecha, fecha_vencimiento, estado, notas`

**contadores_documentos** — `id, tienda_id, cotizaciones, cuentas_cobro`

### Tiendas aliadas (consignaciones)

**tiendas_consignatarias** — `id, tienda_id, nombre, contacto, telefono, ciudad, nit, porcentaje_comision, activa`

**consignacion_salidas** — `id, tienda_id, consignataria_id, fecha, notas`

**consignaciones** — `id, tienda_id, consignataria_id, producto_id, variante_id, salida_id, cantidad, precio_unitario, unidades_disponibles, fecha, estado (activa/liquidada/devuelta)`

**consignacion_movimientos** — `id, tienda_id, consignacion_id, consignataria_id, tipo (devolucion/liquidacion), cantidad, precio_venta, total_bruto, comision, neto, fecha, notas`

**liquidaciones** — `id, tienda_id, consignataria_id, fecha, mes, total_vendido, porcentaje_comision, comision, neto, notas, consignaciones_ids (array)`

### Eventos

**eventos** — `id, tienda_id, nombre, lugar, fecha_inicio, fecha_fin, tipo (feria/consignacion), estado (activo/cerrado), notas, created_at`

**evento_inventario** — `id, tienda_id, evento_id, producto_id, variante_id, cantidad_llevada, cantidad_vendida, cantidad_devuelta, created_at`

**evento_ventas** — `id, tienda_id, evento_id, producto_id, cantidad, precio_venta, medio_pago, created_at`

**evento_gastos** — `id, tienda_id, evento_id, descripcion, monto, categoria, created_at`

### Cuentas por pagar

**cuentas_por_pagar** — `id, tienda_id, proveedor_id, entrada_id, descripcion, monto_total, monto_pagado, fecha_vencimiento, tipo_pago, numero_cuotas, frecuencia_cuotas, estado, notas`

**cuotas_pago** — `id, tienda_id, cuenta_id, numero_cuota, monto, fecha_vencimiento, fecha_pago, estado`

### Otras

**devoluciones_venta** — `id, tienda_id, venta_id, fecha, tipo, resolucion, producto_original_id, cantidad, precio_original, producto_cambio_id, precio_cambio, diferencia, motivo, notas, mes_contable`

**preferencias** — `id, tienda_id, stock_bajo_umbral, sin_movimiento_dias, clientes_recurrentes_umbral, ventas_bajas_umbral, alerta_stock_bajo, alerta_sin_movimiento, alerta_cliente_recurrente, alerta_ventas_bajas, porcentaje_alerta_ventas, dias_cliente_recurrente, dias_sin_compra_alerta`

**notificaciones** — `id, tienda_id, tipo, mensaje, leida, metadata (jsonb), created_at`

**admins** — `id, email` (solo para admin panel)

---

## 8. MÓDULOS IMPLEMENTADOS

### Dashboard
- KPIs: ventas hoy, este mes, alertas de stock
- Gráfico con selector semana/mes/año, años dinámicos
- Resumen financiero del mes (ventas, gastos, utilidad)
- Destacados: canal top, cliente top, producto estrella
- Alertas inteligentes con hipervínculo al módulo
- Modal de nueva venta rápida

### Inventario (Productos)
- CRUD completo con SKU, tipo, precio, costo de producción
- **Variantes expandibles inline** — filas que se expanden mostrando subfilas por variante con stock y mínimo editables
- Página `/productos/[id]/variantes` para gestión avanzada de atributos
- Agregar variantes a productos existentes desde el formulario de edición
- Chips: Todos / Agotado / Stock bajo / Sin movimiento / Defectuosos / Archivados
- **Stock bajo considera variantes reales** (no `tiene_variantes` de BD)
- Carga masiva CSV con soporte de variantes
- Calculadora de precios con márgenes por industria

### Entradas
- Flujo: producto + entrada + pago (contado/pagaré/cuotas)
- Tab "Por pagar" con gestión de cuentas y cuotas
- Carga masiva CSV

### Ventas
- Multi-producto con descuentos por línea y variantes
- Medios de pago personalizables con comisión + IVA
- Campo de envío incluido en base de comisión
- Devoluciones (defectuoso/cambio) con historial
- Carga masiva CSV

### Clientes
- CRUD con chips: Todos/Recurrentes/Activos/Sin compras
- Página `/clientes/[id]` con historial de compras expandible por venta
- Carga masiva CSV

### Gastos
- Tipos: Variable/Fijo/Financiero/Compra de inventario
- Categorías libres (sin constraint en BD)
- Carga masiva CSV con campo `tipo`

### Proveedores
- CRUD con categorías múltiples
- Carga masiva CSV

### Reportes
- P&L con CPV correcto, gastos por tipo
- Flujo de caja con saldo inicial y final
- Top 3 productos y clientes del mes
- Exportar PDF

### Tiendas Aliadas (Consignaciones)
- CRUD tiendas consignatarias
- Salidas múltiples (varios productos en una operación)
- Devoluciones múltiples con PDF de devolución
- Liquidaciones con cálculo de comisión y PDF
- Inventario por tienda y global
- **Carga masiva histórica:** salidas, devoluciones y liquidaciones con soporte de variantes
- Tabs: Tiendas | Inventario | Devoluciones | Liquidaciones

### Documentos
- Cotizaciones y cuentas de cobro en formato colombiano
- Numeración automática: COT-2026-001 / CC-2026-001
- PDF con logo y datos del negocio
- Link WhatsApp para compartir

### Eventos
- Crear eventos (feria/consignación)
- Tabs: Inventario / Ventas / Gastos / Consolidado
- Inventario: lista expandible multi-producto con soporte de variantes
- Ventas: solo muestra productos del inventario del evento con stock disponible
- Carga masiva CSV en cada tab
- **Cierre de evento:** exporta ventas a `ventas_cabecera/venta_items` y gastos a `gastos`, actualiza stock
- KPIs en tiempo real: ingresos, gastos, utilidad, rentabilidad %
- RLS activo en todas las tablas de eventos

### Equipo
- Roles: owner/admin/vendedor/readonly
- Invitaciones por link con expiración 7 días
- Cambio de rol y eliminación

### Configuración
- Medios de pago personalizables
- Temas de color (4 opciones)
- Tamaño de letra (Normal/Grande)
- Datos legales

### Auth
- Login, registro, logout
- **Recuperar contraseña:** `/recuperar-contrasena` → email → `/nueva-contrasena`
- Invitaciones de equipo: `/invitacion/[token]`

### Admin Panel (`/polealabs`)
- Overview con métricas globales
- Lista de tiendas con detalle
- Lista de usuarios
- Métricas de uso

---

## 9. SISTEMA DE ROLES

| Rol | Ver todo | Editar | Eliminar | Ver finanzas |
|-----|----------|--------|----------|--------------|
| owner | ✅ | ✅ | ✅ | ✅ |
| admin | ✅ | ✅ | ✅ | ✅ |
| vendedor | Parcial | ✅ | ❌ | ❌ |
| readonly | ✅ | ❌ | ❌ | ❌ |

**Gastos y Reportes:** solo owner y admin (`canViewFinanzas`)
**Eliminación:** solo owner y admin (`canDelete`)

### Hook useTienda
Busca la tienda del usuario — primero como owner, luego como miembro.

Expone:
- `tienda` — objeto completo de la tienda
- `loading` — boolean
- `rol` — 'owner' | 'admin' | 'vendedor' | 'readonly'
- `isOwner`, `isAdmin`, `isVendedor`, `isReadonly`
- `canEdit` — owner | admin | vendedor
- `canDelete` — owner | admin
- `canViewFinanzas` — owner | admin

---

## 10. LÓGICA FINANCIERA

### Cálculo de comisiones de medios de pago
```typescript
function calcularComisionMedioPago(subtotal, envio, medio) {
  const base = subtotal + envio
  const comision_base = (base * medio.comision_porcentaje / 100) + medio.tarifa_fija
  const iva_comision = medio.cobra_iva ? comision_base * 0.19 : 0
  const comision_total = comision_base + iva_comision
  const neto = base - comision_total
  return { base, comision_base, iva_comision, comision_total, neto }
}
```

### Estructura P&L
```
Ventas brutas
- Devoluciones del mes
- Descuentos aplicados
- Comisiones de plataforma
= Ventas netas
- CPV (Costo de productos vendidos)
= Utilidad bruta
- Gastos variables
= Utilidad después de variables
- Gastos fijos
= Utilidad operacional
- Gastos financieros
= Utilidad neta
```

**NOTA:** `compra_inventario` NO aparece en P&L, solo en Flujo de caja.

### Flujo de caja
```
ENTRADAS: Cobros por ventas del mes
SALIDAS OPERATIVAS: Compras inventario + gastos variables + fijos
SALIDAS FINANCIERAS: Gastos financieros
= Flujo neto + Saldo inicial = Saldo final
```

---

## 11. COMPONENTES REUTILIZABLES

| Componente | Descripción |
|-----------|-------------|
| `ProductoSelect` | Select con búsqueda de texto para productos. Props: `productos`, `value`, `onChange`, `opciones` (formato `{id, label, sublabel}`) |
| `CalculadoraPrecios` | Calculadora de precio por margen e industria |
| `ImportCSV` | Carga masiva CSV. Props: `onDescargarPlantilla`, `onProcesar (filas) => Promise<ResultadoImport>`, `descripcion` |
| `Toast / useToast` | Sistema de toasts. `showToast(mensaje, tipo?)` donde tipo es `'success' | 'error'` |
| `ConfirmModal` | Modal de confirmación. Props: `open`, `mensaje`, `onConfirm`, `onCancel`, `title?`, `danger?`, `confirmLabel?` |
| `ModuleTableSkeleton` | Skeleton de carga para módulos. Props: `maxWidthClass?`, `showToolbarButton?` |
| `Tooltip` | Tooltip con portal a `document.body` para evitar quedar detrás de tablas. Props: `texto` |

---

## 12. CONVENCIONES DE CÓDIGO

### Server Actions (`'use server'`)
Patrón estándar en todos los `actions.ts`:
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getTienda() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data } = await supabase.from('tiendas').select('id').eq('owner_id', user.id).maybeSingle()
  if (!data) throw new Error('Tienda no encontrada')
  return { tienda_id: data.id, supabase }
}

export async function miAccion(params) {
  try {
    const { tienda_id, supabase } = await getTienda()
    // ... lógica
    revalidatePath('/ruta')
    return { ok: true as const }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}
```

### Manejo de errores
- Server actions retornan `{ ok: true }` o `{ error: string }`, nunca lanzan excepciones al cliente
- En el cliente: `if (result?.error) { showToast(result.error, 'error'); return }`
- Queries Supabase: siempre verificar `if (error) return { error: error.message }`

### Cliente Supabase
- **Server Actions / Server Components:** `import { createClient } from '@/lib/supabase/server'` + `await createClient()`
- **Client Components:** `import { createClient } from '@/lib/supabase/client'` + `createClient()` (sin await)
- **NUNCA** usar el cliente de servidor en componentes client ni viceversa

### Temas CSS
**SIEMPRE** usar variables CSS, NUNCA colores hardcodeados en JSX:
```tsx
// ✅ Correcto
style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}
style={{ borderColor: 'var(--color-border)' }}
style={{ background: 'var(--color-accent)', color: 'white' }}

// ❌ Incorrecto
className="bg-white text-gray-900"  // no respeta el tema
style={{ background: '#FAF6F0' }}    // hardcodeado
```

Variables disponibles: `--color-primary`, `--color-primary-light`, `--color-accent`, `--color-accent-hover`, `--color-accent-pale`, `--color-background`, `--color-surface`, `--color-border`, `--color-text`, `--color-text-soft`, `--color-text-faint`

**Excepción:** Colores de estado (rojo error, verde éxito, amarillo warning) pueden ser hardcodeados: `#C44040`, `#3A7D5A`, `#D4A853`.

### Toasts
```typescript
const { toasts, showToast, removeToast } = useToast()
showToast('Mensaje de éxito')
showToast('Mensaje de error', 'error')
// En el JSX:
<Toast toasts={toasts} onRemove={removeToast} />
```

### Patrón CSV (actions-import.ts)
```typescript
'use server'
const MENSAJE_ABORTO = (n: number) =>
  `Se encontraron ${n} error(es). No se importó ningún registro. Corrige los errores y vuelve a intentarlo.`

export async function importarX(filas: Record<string, string>[]) {
  // Paso 1: validar todas las filas
  const errores = []
  const validas = []
  for (let i = 0; i < filas.length; i++) {
    const numFila = i + 2 // +2 porque fila 1 es header
    // ... validaciones → errores.push({ fila: numFila, mensaje: '...' })
  }
  if (errores.length > 0) return { exitosos: 0, errores, mensaje: MENSAJE_ABORTO(errores.length) }
  
  // Paso 2: insertar
  let exitosos = 0
  const erroresPaso2 = []
  for (const op of validas) {
    const { error } = await supabase.from('tabla').insert(op.insert)
    if (error) erroresPaso2.push({ fila: op.fila, mensaje: error.message })
    else exitosos++
  }
  if (exitosos > 0) revalidatePath('/ruta')
  return { exitosos, errores: erroresPaso2 }
}
```

### Formato de fechas Colombia
```typescript
// Para mostrar fechas sin desfase de timezone:
new Date(`${fecha}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })

// Para el selector de mes actual:
const offset = new Date().getTimezoneOffset() * 60000
const local = new Date(Date.now() - offset)
const mesActual = local.toISOString().slice(0, 7) // YYYY-MM
```

### formatCOP
```typescript
import { formatCOP } from '@/lib/utils'
// O inline:
new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)
```

---

## 13. PENDIENTES Y BACKLOG

| Item | Prioridad | Descripción |
|------|-----------|-------------|
| Suscripciones — Fase 2 | ~~Alta~~ | ~~`proxy.ts` verifica suscripción + `/cuenta-bloqueada` + `/suscripcion` (ver plan del usuario)~~ ✅ Implementado |
| **Suscripciones — Fase 3** | **Alta** | Tokenización Wompi post-registro + cron job de cobros (requiere credenciales Wompi) |
| **Suscripciones — Fase 4** | **Alta** | Webhooks Wompi + emails Resend + reintentos automáticos |
| PWA | Media | App instalable en celular |
| Modo POS | Media | Vista rápida de venta para ferias |
| RLS tiendas | ~~Alta~~ | ~~Resolver referencia circular con miembros~~ ✅ Resuelto con `get_tiendas_usuario()` |
| Facturación DIAN | Baja | Facturación electrónica |
| Resend dominio | Media | Emails transaccionales con dominio verificado |
| SinMovimiento con variantes | ~~Baja~~ | ~~Dashboard aún usa `p.stock_actual` para sin movimiento~~ ✅ Resuelto |
| Suscripciones — Fase 1 | ~~Alta~~ | ~~SQL (5 tablas) + admin de planes en `/polealabs/planes` + beta por tienda~~ ✅ Implementado |

---

## 14. COMANDOS ÚTILES

```bash
# Desarrollo
pnpm run dev              # Corre en localhost:3000

# Verificación
pnpm exec tsc --noEmit    # TypeScript sin compilar
pnpm run lint             # ESLint
pnpm run build            # Build de producción

# Git
git add .
git commit -m "feat: descripción"
git push
```

---

## 15. NOTAS IMPORTANTES PARA CLAUDE CODE

1. **Antes de cualquier cambio en lógica de stock:** verificar si el producto tiene variantes usando `variantesDelProducto.length > 0`, NO `p.tiene_variantes`.

2. **Al crear tablas nuevas en Supabase:** siempre agregar RLS con política estándar filtrando por `tienda_id IN (SELECT id FROM tiendas WHERE owner_id = auth.uid())`.

3. **Al tocar `consignaciones/page.tsx`:** tener extremo cuidado con el encoding. Si se corrompen caracteres especiales, NO usar scripts de conversión masiva. Usar escapes Unicode en strings críticos.

4. **El campo `venta_id` en `venta_items`** en BD se llama `cabecera_id` en algunas versiones del código. Verificar antes de hacer queries.

5. **Medios de pago de eventos:** al cerrar un evento, mapear el medio de pago del evento al tipo de la tabla `medios_pago` usando `mapEventoMedioATipo()` en `eventos/actions.ts`.

6. **Al agregar nuevos módulos al Sidebar:** editar `components/layout/Sidebar.tsx`.

7. **Timezone:** Colombia es UTC-5. Todos los cálculos de mes deben compensar el offset para evitar que a las 7pm cambie el mes.

---

## 16. DISEÑO: SISTEMA DE SUSCRIPCIONES (pendiente de implementar)

### Decisiones tomadas
- **Trial:** 30 días, requiere tarjeta desde el inicio (sin cobro durante el trial)
- **Pago fallido:** notificación por email (Resend) + banner in-app → 42h de gracia → reintento automático a las 40h → si falla: estado `vencida`
- **Procesador:** Wompi (tokenización de tarjeta para cobro recurrente). Arquitectura abierta para agregar otros procesadores en el futuro.
- **Periodicidad:** mensual y anual
- **Descuento anual:** pagan 10 meses, usan 12 (~16.7%). Porcentaje parametrizable desde `/polealabs`.
- **Precios:** parametrizables desde `/polealabs`. Valores iniciales: $49,000/mes (básico) y $89,000/mes (premium).
- **Diferencia entre planes:** límites de uso (productos, miembros del equipo) + acceso a módulos

### Tablas nuevas

```sql
planes (id, nombre, descripcion, precio_mensual, precio_anual, descuento_anual_porcentaje,
        max_productos, max_miembros, funcionalidades jsonb, activo, orden)

suscripciones (id, tienda_id, plan_id, estado, periodicidad, fecha_inicio, fecha_fin,
               fecha_proximo_cobro, trial_usado)
  -- estado: 'trial' | 'activa' | 'gracia' | 'vencida' | 'cancelada'
  -- periodicidad: 'mensual' | 'anual'

metodos_pago_suscripcion (id, tienda_id, token_wompi, ultimos_4, marca, nombre_titular, activo)

cobros (id, tienda_id, suscripcion_id, plan_id, monto, periodicidad, estado,
        referencia_wompi, intentos, fecha_cobro)
  -- estado: 'pendiente' | 'exitoso' | 'fallido'

creditos_suscripcion (id, tienda_id, tipo, valor, motivo, aplicado, otorgado_por)
  -- tipo: 'mes_gratis' | 'extension_dias'
  -- Otorgados manualmente desde /polealabs
```

### Ciclo de vida
```
Registro → trial (30d) → activa → gracia (42h) → vencida
                ↑             ↓
          cancelada ←─────────┘
```

### Cron job (Vercel Cron, diario 10am Colombia)
1. Buscar suscripciones con `fecha_proximo_cobro <= NOW()`
2. Cobrar token Wompi
3. Exitoso → extender `fecha_fin` + actualizar `fecha_proximo_cobro`
4. Fallido → estado `gracia` + `fecha_fin = NOW() + 42h` + email + notificación in-app
5. Reintento automático a las 40h. Si falla → estado `vencida`

### Beta de usuarios

- **Campos en `tiendas`:** `es_beta boolean default false`, `beta_hasta timestamptz`
- **Activación:** desde `/polealabs/tiendas/[id]` → panel "Acceso Beta" (toggle + fecha de vencimiento)
- **Badge en app:** pill "BETA" violeta en el header del dashboard, visible mientras `es_beta = true` y `beta_hasta > NOW()`
- **Columna en lista:** `/polealabs/tiendas` muestra columna "Beta" con badge si está vigente
- **Acceso:** los usuarios beta tienen acceso completo; en Fase 2 bypassearán el chequeo de suscripción
- **Ciclo:** `beta → (vence) → necesita suscribirse` (igual que trial vencido)

### Fases de implementación

| Fase | Estado | Descripción |
|------|--------|-------------|
| 1 | ✅ Listo | SQL (5 tablas) + admin de planes `/polealabs/planes` + beta por tienda + badge en app |
| 2 | ✅ Listo | `proxy.ts` verifica suscripción + `/cuenta-bloqueada` + `/suscripcion` + banner gracia |
| 3 | Pendiente | Tokenización Wompi post-registro + cron job de cobros (requiere credenciales Wompi) |
| 4 | Pendiente | Webhooks Wompi + emails Resend + reintentos automáticos |
