# CLAUDE.md — Leva / Polea

## 1. PROYECTO

**Leva** = producto SaaS de gestión para pequeños negocios colombianos (ventas, inventario, gastos, P&L). **Polea** = empresa madre (Polea S.A.S., Cali).
- Dashboard: aparece como "Leva" · Admin `/polealabs`: "Polea Admin"
- Fundadores: Nicolás Idrobo (SDR) · Luis Daniel (QA Lead)
- Estado: producción con clientes reales

---

## 2. STACK

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16.2.3 (App Router, Turbopack) |
| Lenguaje | TypeScript 5 |
| Estilos | Tailwind CSS v4 |
| Base de datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth |
| Deploy | Vercel (plan Hobby) |
| PDF | jsPDF + html2canvas |
| Animaciones | Framer Motion (dashboard) · CSS animations (landing) |
| Fuentes | Space Grotesk (app) · Fraunces (display) · Rubik (wordmark landing) |
| Package manager | pnpm |

---

## 3. INFRAESTRUCTURA

```
Repositorio:   https://github.com/polealabs/polea-app
Supabase URL:  https://amzldldwuxtahohueule.supabase.co
Producción:    https://polea-app.vercel.app
```

**Variables de entorno (`.env.local` y Vercel):**
```
NEXT_PUBLIC_SUPABASE_URL=https://amzldldwuxtahohueule.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=https://polea-app.vercel.app
SUPABASE_SERVICE_ROLE_KEY=...   # Requerido para eliminarCuenta() y ops admin
RESEND_API_KEY=...              # ⚠️ En .env.local está como RESEND_API_KEY1 (nombre incorrecto) — renombrar antes de activar emails
```

---

## 4. ESTRUCTURA DE CARPETAS

```
polea-app/
├── app/
│   ├── (auth)/                    # login, registro, recuperar contraseña
│   ├── (dashboard)/               # Todas las rutas protegidas
│   │   ├── layout.tsx             # Layout con Sidebar
│   │   ├── actions-tienda.ts      # Configuración de tienda
│   │   ├── dashboard/
│   │   ├── productos/
│   │   │   └── [id]/variantes/    # Gestión avanzada de atributos
│   │   ├── entradas/
│   │   ├── ventas/
│   │   ├── pos/                   # Punto de venta rápido para ferias
│   │   ├── clientes/[id]/         # Detalle con historial de compras
│   │   ├── gastos/
│   │   ├── proveedores/
│   │   ├── reportes/
│   │   ├── consignaciones/        # Tiendas aliadas
│   │   │   ├── actions-import.ts           # CSV tiendas consignatarias
│   │   │   ├── actions-import-historial.ts # CSV salidas/devoluciones/liquidaciones
│   │   │   └── salida|devolucion/[id]/pdf/
│   │   ├── documentos/            # Cotizaciones y cuentas de cobro
│   │   ├── eventos/[id]/
│   │   │   └── actions-import.ts  # CSV masivo por tab
│   │   ├── equipo/
│   │   ├── configuracion/medios-pago/
│   │   ├── perfil/
│   │   ├── preferencias/
│   │   └── soporte/actions.ts     # Server actions del widget de soporte
│   ├── invitacion/[token]/        # Aceptar invitación de equipo
│   ├── polealabs/                 # Admin panel (solo polealabs@gmail.com y ldct.ldct@gmail.com)
│   │   ├── planes/
│   │   ├── tiendas/[id]/
│   │   ├── usuarios/
│   │   ├── metricas/
│   │   └── soporte/               # Gestión de casos de soporte
│   ├── layout.tsx                 # Anti-flash de temas (script inline)
│   └── page.tsx                   # Landing page
├── components/ui/
│   ├── SoporteWidget.tsx          # Chat flotante en dashboard
│   ├── ProductoSelect.tsx
│   ├── CalculadoraPrecios.tsx
│   ├── ImportCSV.tsx
│   ├── Toast.tsx / ConfirmModal.tsx / Tooltip.tsx
│   └── LevaLogo.tsx               # Símbolo cam sobre fondo #0D0D0D
├── lib/
│   ├── hooks/useTienda.ts         # Hook principal — tienda + roles
│   ├── context/TemaContext.tsx
│   ├── supabase/client.ts + server.ts
│   ├── types.ts / utils.ts / csv.ts / temas.ts
│   └── notificaciones.ts
├── proxy.ts                       # Reemplaza middleware.ts (Next.js 16)
└── design_handoff_leva_landing/   # Referencia de diseño — NO BORRAR
```

---

## 5. DECISIONES TÉCNICAS CRÍTICAS

### proxy.ts en lugar de middleware.ts
Next.js 16 deprecó `middleware.ts`. El proxy no usa `@supabase/ssr` para evitar el error `__dirname` en Edge Runtime.

**CRÍTICO:** Los server actions son requests `POST` con header `Next-Action`. El proxy tiene un early return para no interceptarlos — si los intercepta devuelve redirect HTML y el cliente lanza `"An unexpected response was received from the server."`:
```typescript
if (request.method === 'POST' && request.headers.get('next-action')) {
  return NextResponse.next()
}
```

### Upload de archivos
En Next.js 16 + Turbopack, los `File` en `FormData` manual no se serializan al pasarse a server actions programáticamente (`formData.get('logo')` llega null).

**Patrón correcto:** subir directo browser → Supabase Storage, pasar la URL como string al server action. Ver `onboarding/page.tsx → handleCrear()` y `perfil/page.tsx → handleSubmit()`.

### RLS en Supabase
- **`tiendas`**: referencia circular con `miembros` resuelta con función `get_tiendas_usuario()` (`SECURITY DEFINER`). Política: `id IN (SELECT get_tiendas_usuario())`.
- **Resto**: `tienda_id IN (SELECT id FROM tiendas WHERE owner_id = auth.uid())`.
- **`casos_soporte` / `mensajes_soporte`**: política `tienda_id IN (SELECT get_tiendas_usuario())`. El admin escribe con `createAdminClient()` (service role) para bypassear RLS.

### Triggers activos / eliminados
| Trigger | Estado | Qué hace |
|---------|--------|----------|
| `trg_entrada_suma_stock` | ✅ Activo | Suma cantidad a `productos.stock_actual` al INSERT en `entradas` |
| `trg_consignacion_resta_stock` | ✅ Activo | Resta stock al registrar salida a tienda aliada |
| `trg_consignacion_devolucion_stock` | ✅ Activo | Restaura stock al registrar devolución |
| `trg_entrada_crea_gasto` | ❌ Eliminado | Creaba gastos duplicados en el P&L |

### Constraints eliminados
- `gastos_categoria_check`: eliminado para permitir subcategorías libres.
- `ventas_cabecera_plataforma_pago_check`: eliminado para medios de pago personalizados.

### TemaProvider en páginas públicas
`TemaContext.tsx` llama `supabase.auth.getUser()` al montar. `cargarTema()` verifica `window.location.pathname` y retorna temprano en rutas públicas (`/`, `/login`, `/registro`, `/recuperar*`, `/nueva-contrasena*`, `/invitacion*`) para evitar "Failed to fetch".

### CPV (Costo de Productos Vendidos)
1. Buscar `costo_produccion` en `productos`
2. Si no tiene, buscar `costo_unitario` de la entrada más reciente antes de la venta
3. CPV = Σ (cantidad × costo). Solo aplica a "Producto terminado".

### compra_inventario
Tipo de gasto que aparece **solo en flujo de caja, NO en P&L**. Evita doble conteo con CPV.

### Migraciones manuales en Supabase

Patrón recurrente: columnas nullable de FK agregadas sobre tablas existentes al implementar nuevas features. **SQL seguro (IF NOT EXISTS):**

```sql
ALTER TABLE consignaciones ADD COLUMN IF NOT EXISTS variante_id uuid REFERENCES producto_variantes(id);
ALTER TABLE consignacion_movimientos ADD COLUMN IF NOT EXISTS consignataria_id uuid REFERENCES tiendas_consignatarias(id);
ALTER TABLE ventas_cabecera ADD COLUMN IF NOT EXISTS evento_id uuid REFERENCES eventos(id);
ALTER TABLE venta_items ADD COLUMN IF NOT EXISTS variante_id uuid REFERENCES producto_variantes(id);
```

| Columna | Aplicada | Efecto si falta |
|---------|----------|-----------------|
| `consignaciones.variante_id` | 2026-06-09 | CSV salidas Tiendas Aliadas falla |
| `consignacion_movimientos.consignataria_id` | 2026-06-11 | CSV devoluciones y liquidaciones falla |
| `ventas_cabecera.evento_id` | pendiente | POS falla al vincular venta a evento |
| `venta_items.variante_id` | pendiente | Ventas con variantes fallan |

### Sistema de emails
- `lib/email.ts` → `enviarEmailInvitacion()` usa Resend, falla en silencio porque la var se llama `RESEND_API_KEY1` en `.env.local` (nombre incorrecto).
- `from: 'Polea <onboarding@resend.dev>'` (sandbox — solo envía a correos verificados en Resend).
- **Confirmación de email desactivada** en Supabase desde 2026-06-04 (pruebas sin dominio Resend). Reactivar al verificar dominio propio.

### Encoding en consignaciones/page.tsx
Historial de corrupción de caracteres. `.vscode/settings.json` tiene `"files.encoding": "utf8"`. Si se corrompen de nuevo, usar escapes Unicode: `devoluci{'ó'}n`, `{'→'}`.

---

## 6. TABLAS DE BASE DE DATOS

**tiendas** — `id, nombre, owner_id, ciudad, categoria, whatsapp, moneda, logo_url, tema, tamano_letra, nit, representante, telefono, email, direccion, es_beta, beta_hasta`

**perfiles** — `id (→ auth.users), nombre, updated_at`

**miembros** — `id, tienda_id, user_id, rol (owner/admin/vendedor/readonly), email, invitado_por, created_at`

**invitaciones** — `id, tienda_id, email, rol, token, aceptada, invitado_por, expires_at`

**productos** — `id, tienda_id, nombre, sku, tipo, precio_venta, costo_produccion, stock_actual, stock_minimo, unidades_defectuosas, tiene_variantes, estado`

**producto_variantes** — `id, tienda_id, producto_id, nombre, sku, atributos (jsonb), precio_venta, costo_produccion, stock_actual, stock_minimo, activa`

**producto_atributos** — `id, tienda_id, producto_id, nombre`

**entradas** — `id, tienda_id, producto_id, proveedor_id, cantidad, costo_unitario, fecha, notas`

**ventas_cabecera** — `id, tienda_id, cliente_id, canal, plataforma_pago, medio_pago_id, fecha, total_bruto, total_neto, total_costo_transaccion, comision_iva, envio, evento_id`

**venta_items** — `id, tienda_id, cabecera_id, producto_id, variante_id, cantidad, precio_venta, descuento, neto, costo_transaccion`

> ⚠️ El campo FK de `venta_items` se llama `cabecera_id` en el código (no `venta_id`).

**clientes** — `id, tienda_id, nombre, correo, telefono, direccion, ciudad, fecha_creacion, created_at`

> ⚠️ La columna de email del cliente se llama `correo` (no `email`) en BD y en el código (`clientes/actions.ts`, `clientes/page.tsx`).

**gastos** — `id, tienda_id, descripcion, monto, fecha, categoria, tipo_gasto (variable/fijo/financiero/compra_inventario), subcategoria, proveedor_id`

**proveedores** — `id, tienda_id, nombre, categorias (array), telefono, nit, ciudad`

**medios_pago** — `id, tienda_id, nombre, tipo (efectivo/transferencia/datafono/pasarela_web/cuotas/contraentrega/nequi_daviplata), comision_porcentaje, tarifa_fija, cobra_iva, activo`

**documentos** — `id, tienda_id, tipo (cotizacion/cuenta_cobro), numero, cliente_id, destinatario_*, concepto, items (jsonb), subtotal, descuento, total, datos_bancarios, fecha, fecha_vencimiento, estado, notas`

**contadores_documentos** — `id, tienda_id, cotizaciones, cuentas_cobro`

**devoluciones_venta** — `id, tienda_id, venta_id, fecha, tipo, resolucion, producto_original_id, cantidad, precio_original, producto_cambio_id, precio_cambio, diferencia, motivo, notas, mes_contable`

**preferencias** — `id, tienda_id, stock_bajo_umbral, sin_movimiento_dias, clientes_recurrentes_umbral, ventas_bajas_umbral, alerta_*, porcentaje_alerta_ventas, dias_*`

**notificaciones** — `id, tienda_id, tipo, mensaje, leida, metadata (jsonb), created_at`

**admins** — `id, email`

### Tiendas aliadas

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

### Suscripciones (Fases 1-2 implementadas)

**planes** — `id, nombre, descripcion, precio_mensual, precio_anual, descuento_anual_porcentaje, max_productos, max_miembros, funcionalidades (jsonb), activo, orden`

**suscripciones** — `id, tienda_id, plan_id, estado (trial/activa/gracia/vencida/cancelada), periodicidad (mensual/anual), fecha_inicio, fecha_fin, fecha_proximo_cobro, trial_usado`

**metodos_pago_suscripcion** — `id, tienda_id, token_wompi, ultimos_4, marca, nombre_titular, activo`

**cobros** — `id, tienda_id, suscripcion_id, plan_id, monto, periodicidad, estado (pendiente/exitoso/fallido), referencia_wompi, intentos, fecha_cobro`

**creditos_suscripcion** — `id, tienda_id, tipo (mes_gratis/extension_dias), valor, motivo, aplicado, otorgado_por`

### Soporte

**casos_soporte** — `id, tienda_id, titulo, estado (abierto/en_proceso/resuelto), created_at, updated_at`

**mensajes_soporte** — `id, caso_id, tienda_id, autor (cliente/admin), mensaje, created_at`

---

## 7. VARIANTES DE PRODUCTOS

- `productos.tiene_variantes = true` cuando tiene variantes; stock real en `producto_variantes.stock_actual`
- **CRÍTICO:** Para stock bajo/agotado, NO usar `p.tiene_variantes` (puede estar desactualizado). Usar `variantesDelProducto.length > 0`.
- El trigger `trg_entrada_suma_stock` y `trg_consignacion_resta_stock` operan sobre `productos.stock_actual`, que para productos con variantes siempre debe ser 0. Los actions compensan esto manualmente.

---

## 8. SISTEMA DE ROLES

| Rol | Ver todo | Editar | Eliminar | Ver finanzas |
|-----|----------|--------|----------|--------------|
| owner | ✅ | ✅ | ✅ | ✅ |
| admin | ✅ | ✅ | ✅ | ✅ |
| vendedor | Parcial | ✅ | ❌ | ❌ |
| readonly | ✅ | ❌ | ❌ | ❌ |

**`useTienda`** — busca tienda como owner primero, luego como miembro. Expone: `tienda`, `loading`, `rol`, `isOwner/isAdmin/isVendedor/isReadonly`, `canEdit`, `canDelete`, `canViewFinanzas`.

---

## 9. LÓGICA FINANCIERA

### P&L
```
Ventas brutas − Devoluciones − Descuentos − Comisiones = Ventas netas
− CPV = Utilidad bruta
− Gastos variables = Utilidad después de variables
− Gastos fijos = Utilidad operacional
− Gastos financieros = Utilidad neta
```
`compra_inventario` NO aparece en P&L, solo en flujo de caja.

### Flujo de caja
```
ENTRADAS: cobros por ventas
SALIDAS: compras inventario + gastos variables + fijos + financieros
= Flujo neto + Saldo inicial = Saldo final
```

### Comisiones de medios de pago (`lib/utils.ts → calcularComisionMedioPago`)
```
base = subtotal + envio
comision_base = (base × porcentaje / 100) + tarifa_fija
iva_comision = cobra_iva ? comision_base × 0.19 : 0
neto = base − comision_base − iva_comision
```

---

## 10. NOTAS POR MÓDULO (no obvias desde el código)

### Landing (`app/page.tsx`)
- Tiene su propio sistema de tokens CSS (clase `.lv`) en un `<style>` tag inline — completamente separado de `--color-*` del dashboard.
- `useEffect` setea `document.body.style.background = '#F4F1EA'` al montar y lo resetea al desmontar.
- Sin Framer Motion. Animaciones CSS puro `@keyframes lvRise`.
- Referencia de diseño en `design_handoff_leva_landing/` — **no borrar esta carpeta**.
- Precios y testimonios son placeholders — ajustar antes de lanzar.

### Auth
- Registro redirige a `/onboarding`, no a `/dashboard`.
- **Confirmación de email deshabilitada** desde 2026-06-04 en Supabase (Authentication → Providers → Email → "Confirm email" OFF).
- Error de correo duplicado traducido al español: `"Este correo ya está registrado. Intenta iniciar sesión."`.

### POS (`/pos`)
- Al seleccionar un evento, el catálogo muestra solo productos de `evento_inventario` con `disponible = cantidad_llevada − cantidad_vendida − cantidad_devuelta > 0`.
- Las ventas del POS se guardan en `ventas_cabecera` (no en `evento_ventas`) con `evento_id` para trazabilidad.
- Canal fijo: `'Presencial'`. Reutiliza `crearVentaMulti` de `ventas/actions.ts`.

### Eventos — cierre
Al cerrar un evento, exporta: `evento_ventas` → `ventas_cabecera` + `venta_items`; `evento_gastos` → `gastos`. Actualiza stock. Mapea medios de pago con `mapEventoMedioATipo()` en `eventos/actions.ts`.

### Soporte widget (`components/ui/SoporteWidget.tsx`)
Botón flotante en todas las páginas del dashboard. Posición dinámica: en `/dashboard` sube a `bottom: 5.5rem` para no tapar el botón de nueva venta; resto: `bottom: 1.5rem`.
Admin responde desde `/polealabs/soporte` usando `createAdminClient()` para bypassear RLS.

### Suscripciones (Fases 1-2 implementadas)
- Fase 1: tablas SQL + admin de planes en `/polealabs/planes` + beta por tienda + badge "BETA" en header.
- Fase 2: `proxy.ts` verifica suscripción + `/cuenta-bloqueada` + `/suscripcion` + banner de gracia.
- Fase 3 pendiente: tokenización Wompi + cron job de cobros.
- Fase 4 pendiente: webhooks Wompi + emails + reintentos.
- **Beta:** `tiendas.es_beta` + `tiendas.beta_hasta`. Activar desde `/polealabs/tiendas/[id]`.

---

## 11. COMPONENTES REUTILIZABLES

| Componente | Props clave |
|-----------|-------------|
| `ProductoSelect` | `productos, value, onChange, opciones: {id, label, sublabel}[]` |
| `CalculadoraPrecios` | Calculadora de precio por margen e industria |
| `ImportCSV` | `onDescargarPlantilla, onProcesar(filas) => Promise<ResultadoImport>, descripcion` |
| `Toast / useToast` | `showToast(mensaje, tipo?: 'success' \| 'error')` |
| `ConfirmModal` | `open, mensaje, onConfirm, onCancel, title?, danger?, confirmLabel?` |
| `ModuleTableSkeleton` | `maxWidthClass?, showToolbarButton?` |
| `Tooltip` | `texto` — usa portal a `document.body` para evitar z-index issues |
| `LevaLogo` | `size` — símbolo cam sobre fondo `#0D0D0D`. Usar en páginas públicas. |

---

## 12. CONVENCIONES DE CÓDIGO

### Server Actions
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
    // ...
    revalidatePath('/ruta')
    return { ok: true as const }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}
```

### Cliente Supabase
- **Server Actions / Server Components:** `import { createClient } from '@/lib/supabase/server'` + `await createClient()`
- **Client Components:** `import { createClient } from '@/lib/supabase/client'` + `createClient()` (sin await)

### Sistema de diseño — tokens CSS del dashboard
**SIEMPRE** variables CSS, NUNCA colores hardcodeados:
```tsx
style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}
style={{ background: 'var(--color-accent)', color: 'white' }}
// ❌ className="bg-white" o style={{ background: '#C4622D' }} (acento viejo terracota)
```
Variables: `--color-primary`, `--color-accent` (`#4A90D9`), `--color-accent-hover`, `--color-accent-pale`, `--color-background` (`#F4F1EA`), `--color-surface`, `--color-border`, `--color-text`, `--color-text-soft`, `--color-text-faint`.
Excepción — colores de estado hardcodeados OK: `#C44040` (error), `#3A7D5A` (éxito), `#D4A853` (warning).

### Patrón CSV (dos pasos)
```typescript
const MENSAJE_ABORTO = (n: number) =>
  `Se encontraron ${n} error(es). No se importó ningún registro. Corrige los errores y vuelve a intentarlo.`

// Paso 1: validar TODAS las filas → si hay errores, abortar sin escribir nada
// Paso 2: solo si paso 1 sin errores → insertar fila por fila
```

### Fechas Colombia (UTC-5)
```typescript
// Mostrar sin desfase:
new Date(`${fecha}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })

// Mes actual correcto a las 7pm Colombia:
const mesActual = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 7)
```

### Nuevo módulo en Sidebar
Editar `components/layout/Sidebar.tsx` + agregar título en `components/layout/HeaderWrapper.tsx`.

### Nueva tabla en Supabase
Siempre agregar RLS: `tienda_id IN (SELECT id FROM tiendas WHERE owner_id = auth.uid())`.

---

## 13. BACKLOG ACTIVO

| Item | Prioridad | Descripción |
|------|-----------|-------------|
| **Suscripciones Fase 3** | Alta | Tokenización Wompi post-registro + cron job de cobros (requiere credenciales Wompi) |
| **Suscripciones Fase 4** | Alta | Webhooks Wompi + emails Resend + reintentos automáticos |
| **Resend dominio** | Media | Verificar dominio → cambiar `from` en `lib/email.ts` → renombrar `RESEND_API_KEY1` → reactivar "Confirm email" en Supabase |
| **Migraciones BD pendientes** | Media | Aplicar SQL de `ventas_cabecera.evento_id` y `venta_items.variante_id` (ver sección 5) |
| PWA | Media | Instalar `@ducanh2912/next-pwa`, crear `app/manifest.ts`, íconos PNG en `public/` |
| Facturación DIAN | Baja | Proveedor: Factus (Brightidea). Bloqueante: cada tienda necesita NIT + resolución propia ante DIAN. |
