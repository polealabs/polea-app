# Handoff: Leva — Landing page (dirección Azul + Space Grotesk)

> **Para quien implementa (Claude Code):** lee este README completo antes de empezar.
> El objetivo es **recrear este diseño** dentro del stack real de la página de Leva,
> usando los componentes y convenciones que ya existan en ese proyecto — **no** copiar
> el HTML tal cual a producción.

---

## 1. Overview

Landing page de **Leva**, un SaaS de gestión administrativa para pequeños negocios
colombianos que venden por WhatsApp, Instagram y presencial. Leva es el primer producto
de **Polea** (empresa de tecnología, Cali). El landing debe transmitir **confianza y
simplicidad**, dirigido al **dueño de negocio informal** (no a un contador), con lenguaje
directo en español colombiano.

Eslogan principal: **"Tu negocio, sin enredos."**
Secundario: "La fuerza detrás de tu negocio."

Esta es la dirección elegida entre varias exploraciones: **fondo de hero oscuro + acento
azul `#4A90D9` + títulos en Space Grotesk**, con un mockup de dashboard flotante como
visual protagonista, y las secciones de contenido sobre fondo papel claro.

## 2. Sobre los archivos de este bundle

Los archivos `Leva Landing.html`, `styles.css` e `image-slot.js` son una **referencia de
diseño hecha en HTML/CSS** — un prototipo que muestra el look & feel y el comportamiento
buscados. **No son código de producción para pegar directamente.** La tarea es
reconstruir este diseño en el entorno del codebase de destino (React/Next, Vue, Astro,
etc.), reutilizando su sistema de componentes y sus patrones. Si aún no existe un entorno,
elige el framework más apropiado (recomendado: **Next.js + CSS Modules o Tailwind**) e
impleméntalo ahí.

El prototipo usa CSS puro con **custom properties** (variables CSS) — son trasladables
casi 1:1 a cualquier sistema de tokens (Tailwind theme, CSS vars, styled-components theme).

## 3. Fidelidad

**Alta fidelidad (hi-fi).** Colores, tipografía, espaciados e interacciones son finales.
Reprodúcelo fielmente. Las únicas piezas marcadas como provisionales (ver §9) son:
métricas y testimonios (datos de ejemplo) y los precios (placeholder).

## 4. Estructura de la página (en orden)

1. **Nav** (sticky, fondo oscuro translúcido)
2. **Hero** — oscuro, full-viewport, copy a la izquierda + dashboard flotante a la derecha
3. **01 · Problema** — 3 dolores con su solución (grid de 3 cards)
4. **02 · Funciones** — 6 módulos en grid (3×2) con icono de línea
5. **03 · Cómo funciona** — banda oscura, 3 pasos numerados
6. **04 · Para quién es** — 6 industrias + tira de 3 fotos (slots)
7. **05 · Historias** — 3 métricas + 2 testimonios (datos de ejemplo)
8. **06 · Precios** — 2 planes (Gratis / Pro)
9. **CTA final** — banda oscura centrada
10. **Footer** — Polea como empresa madre, 4 columnas de links + redes

Cada sección lleva `data-screen-label` para referencia.

## 5. Design tokens (valores exactos)

### Colores — base de marca (Polea)
| Token | Hex | Uso |
|---|---|---|
| `--crow` (Negro cuervo) | `#0D0D0D` | Fondos oscuros (hero, bandas, footer) |
| `--graphite` | `#1A1A1A` | Superficie de cards en oscuro (dashboard) |
| `--graphite-2` | `#202020` | Superficie alterna |
| `--champagne` | `#E8DFC4` | Texto principal sobre oscuro / wordmark |
| `--champ-deep` | `#C9BE9A` | Texto champagne atenuado |
| `--smoke` | `#5A5A5A` | Texto terciario / labels mono |
| `--paper` | `#F4F1EA` | Fondo claro (secciones de contenido) |
| `--paper-2` | `#ECE8DE` | Fondo claro alterno |
| `--line` | `#DCD7CA` | Bordes/divisores sobre claro |
| `--line-dk` | `#262626` | Bordes/divisores sobre oscuro |
| `--ink` | `#16140F` | Texto principal sobre claro |
| `--ink-2` | `#4A463C` | Texto secundario sobre claro |
| `--on-dark` | `#E8DFC4` | = champagne (texto sobre oscuro) |
| `--on-dark-2` | `rgba(232,223,196,0.52)` | Texto secundario sobre oscuro |

### Acento — AZUL (dirección elegida)
| Token | Valor | Uso |
|---|---|---|
| `--accent` | `#4A90D9` | Botón primario, énfasis, hovers |
| `--accent-on-blk` | `#5C9FE0` | Acento sobre fondo negro (más brillante para contraste) |
| `--accent-ink` | `#2F6DB0` | Acento sobre fondo claro (texto/iconos, más oscuro) |
| `--accent-soft` | `rgba(74,144,217,0.12)` | Relleno suave de iconos sobre claro |
| `--accent-soft-dk` | `rgba(92,159,224,0.16)` | Relleno suave sobre oscuro |

> Nota de contraste: usa `--accent-on-blk` (#5C9FE0) cuando el acento va **sobre negro**, y
> `--accent-ink` (#2F6DB0) cuando va **sobre papel claro**. El `--accent` base (#4A90D9) es
> para rellenos de botón. Esta separación mantiene AA en ambos fondos.

### Estados
| Token | Hex |
|---|---|
| `--success` | `#27AE60` |
| `--alert` | `#E74C3C` |

### Tipografía
| Rol | Familia | Pesos | Notas |
|---|---|---|---|
| Wordmark "LEVA" | **Rubik** | 700 | mayúsculas, `letter-spacing:0.16em` |
| Títulos (h1–h4) | **Space Grotesk** | 600 | `letter-spacing:-0.02em` a `-0.035em` según tamaño |
| Cuerpo | **Geist** | 300/400/600 | base 17px / line-height 1.62 |
| Datos / labels / eyebrows | **Geist Mono** | 400/500 | `letter-spacing:0.1–0.2em`, UPPERCASE |

Fuentes vía Google Fonts (Rubik, Space Grotesk, Geist, Geist Mono). En el prototipo se
cargan en el `<link>` del `<head>`. Geist está en Google Fonts; si tu stack usa
`next/font`, cárgalas ahí.

### Escala tipográfica clave (clamp responsive)
| Elemento | font-size |
|---|---|
| Hero h1 | `clamp(44px, 6.4vw, 82px)` / line-height 1.0 |
| Hero subtítulo | `clamp(17px, 2vw, 20px)` |
| Título de sección (h2) | `clamp(30px, 4vw, 46px)` |
| Pregunta de "Problema" | 21px |
| Métricas (número) | `clamp(38px, 5vw, 54px)` |
| CTA final h2 | `clamp(34px, 5vw, 62px)` |
| Precio (número) | 44px |

### Espaciado / radios / sombra
| Token | Valor |
|---|---|
| Ancho máx. contenedor (`--maxw`) | `1180px` |
| Gutter lateral (`--gutter`) | `40px` (22px en móvil ≤680px) |
| Padding vertical de sección | `108px` (76px en móvil ≤760px) |
| Radio cards | `14–20px` (botones `9–12px`) |
| Radio dashboard | `20px` |
| Sombra dashboard | `0 50px 90px -40px rgba(0,0,0,0.7)` |
| Sombra chips flotantes | `0 20px 40px -18px rgba(0,0,0,0.8)` |

## 6. Detalle por sección

### Nav (sticky)
- `position:sticky; top:0`. Fondo `rgba(13,13,13,0.72)` con `backdrop-filter:blur(14px)`;
  al hacer scroll >40px se oscurece a `rgba(13,13,13,0.92)` (ver script al final del HTML).
- Izquierda: símbolo "cam" (SVG, ver §8) + wordmark "Leva" en Rubik 21px champagne.
- Centro: links (`Por qué Leva`, `Funciones`, `Cómo funciona`, `Precios`) — Geist 14.5px,
  `--on-dark-2`, hover → champagne. Se ocultan ≤880px.
- Derecha: "Entrar" (texto) + botón primario "Prueba gratis" (`.btn-primary`, azul).

### Hero (oscuro)
- `min-height:calc(100vh - 63px)`, fondo `--crow`, padding `64px 0 80px`.
- Grid 2 columnas `1.02fr 0.98fr`, gap 54px; colapsa a 1 columna ≤940px.
- Motivo "cam" gigante de fondo en `rgba(92,159,224,0.05)` (azul tenue, ya unificado con la
  dirección azul en esta copia).
- Copy: kicker tipo pill ("Un producto de Polea · Hecho en Cali"), h1 "Tu negocio, / sin
  enredos." (la 2ª línea en `--accent-on-blk`), subtítulo, 2 CTAs (`Prueba gratis`
  primario + `Ver demo` ghost), y una fila "trust" (Sin tarjeta · Listo en 5 minutos · En
  español).
- **Visual:** mockup de dashboard (`.dash`) — ver §7.

### 01 · Problema
- `.sec-head` con eyebrow "01 — El problema", h2, lede.
- `.prob-grid`: 3 cards (`#fff`, borde `--line`, radio 16px). Cada una: pregunta grande
  (Space Grotesk 21px), texto del dolor, y bloque solución separado por borde superior con
  badge "Leva" (mono, fondo `--accent-soft`, texto `--accent-ink`).
- Colapsa a 1 columna ≤860px.

### 02 · Funciones
- `.feat-grid`: grid 3×2 con divisores de 1px (técnica `gap:1px` + fondo `--line`), radio
  exterior 18px. 2 columnas ≤860px, 1 ≤560px.
- Cada `.feat`: icono de línea en cuadro `--accent-soft` (46px, radio 12px, color
  `--accent-ink`), título Space Grotesk 19px, descripción Geist 14.5px. Hover → fondo
  `#fff`.
- Módulos: Ventas, Inventario, Gastos, Reportes P&L, Tiendas aliadas, Eventos y ferias.

### 03 · Cómo funciona (banda oscura)
- `.dark-band` fondo `--crow`. 3 pasos con número en círculo (borde champagne translúcido,
  número en `--accent-on-blk`), título Space Grotesk 22px champagne, descripción.
- Línea punteada conectora entre pasos (desktop), oculta ≤860px.

### 04 · Para quién es
- `.ind-grid`: 6 chips (Joyería, Ropa, Cosméticos, Ferretería, Restaurantes, Artesanías),
  cada uno icono en cuadro grafito + nombre + subnota mono. Hover → borde acento + leve
  translateY.
- `.photos`: 3 `<image-slot>` (1 vertical + 2 cuadradas) — **placeholders donde el usuario
  arrastra fotos reales** de comerciantes. Ver §8.

### 05 · Historias (datos de ejemplo)
- `.metrics`: 3 cifras grandes con borde superior 2px (`+2.400` negocios, `$18.000M`
  ventas, `5 min`/día).
- `.testi-grid`: 2 testimonios en cards con avatar de inicial.
- Lleva una etiqueta `eg-tag` "Métricas e historias de ejemplo · reemplazar con datos
  reales". **Sustituir por datos reales antes de publicar.**

### 06 · Precios (placeholder)
- 2 planes: **Gratis** ($0/siempre, card clara) y **Pro** ($39.900/mes, card oscura
  `--crow` con badge "Recomendado"). Lista de features con check en color acento.
- Precios de referencia — confirmar antes de lanzar.

### CTA final (banda oscura)
- Centrado, h2 grande "Empieza hoy gratis.", subtítulo, botón primario "Prueba gratis" +
  ghost "Hablar con nosotros", línea de reaseguro mono.

### Footer
- Fondo `--crow`. 4 columnas: marca **Polea** (símbolo + wordmark + blurb + "Cali,
  Colombia · 2026"), Producto, Empresa, Soporte. Barra inferior: copyright +
  Instagram/WhatsApp/TikTok.

## 7. Mockup del dashboard (visual del hero)

Es la pieza más detallada — un dashboard financiero falso pero realista (`.dash`):
- Barra de ventana (3 puntos + URL `app.leva.co`).
- Cifra grande "Ventas de mayo $4.850.000" + "↑ 12% vs. abril" (en acento), y a la derecha
  "Utilidad real $1.920.000" (en `--success`).
- Gráfico de barras (8 barras, la penúltima resaltada en `--accent`).
- 2 mini-cards (Flujo de caja, En inventario).
- Lista de 3 ventas con canal (WhatsApp / Local / Instagram).
- 2 **chips flotantes** absolutos (Margen 39,6% / Stock bajo 3 productos) — se ocultan
  ≤520px.

Todos los datos son ilustrativos. Si tu app puede mostrar datos reales/demo, mejor; si no,
mantén estos valores.

## 8. Assets

- **Símbolo "cam" de Leva** — SVG inline (perfil de leva excéntrica, rotado 26°). Está
  definido como `<symbol id="leva-mark">` y `#leva-ghost` (versión contorno) al inicio del
  `<body>`. Reutilizable; pásalo a un componente `<LevaMark/>`.
- **Iconos de línea** (funciones e industrias) — set de `<symbol>` SVG 24×24, stroke
  `currentColor`, width 1.7. Reemplázalos por los de tu librería de iconos si prefieres
  (Lucide/Phosphor tienen equivalentes).
- **`image-slot.js`** — web component de placeholder para fotos arrastrables (solo para el
  prototipo). En producción reemplaza `<image-slot>` por tus `<img>`/`<Image>` reales con
  fotos de comerciantes (luz natural, fondo del local, sin stock genérico).
- **Iconos de redes** (Instagram/WhatsApp/TikTok) — SVG inline en el footer.

## 9. Contenido provisional (reemplazar antes de publicar)

- Métricas de §05 (negocios activos, ventas registradas, minutos/día).
- Testimonios de §05 (Marcela R., Julián O.).
- Precios de §06 ($0 y $39.900/mes).
- Fotos de §04 (slots vacíos).
- Links del nav/footer y redes (`href="#"`).

## 10. Interacciones y comportamiento

- **Nav scroll:** el fondo se oscurece al pasar 40px de scroll (script al final del HTML).
- **Entrada sutil:** los elementos con clase `.reveal` hacen un translateY de 16px → 0
  (solo transform, opacity siempre 1; animación pura CSS con `prefers-reduced-motion`
  respetado). Implementa como animación de entrada al montar o on-scroll, sin parpadeo.
- **Hovers:** botones (cambio de fondo), cards de funciones (fondo a blanco), industrias
  (borde acento + translateY), links (color a champagne). Duraciones ~0.16–0.18s.
- **Responsive:** breakpoints principales en 940px (hero), 860px (grids a 1–2 col), 760px
  (nav simplificado, padding reducido), 680px (gutter), 520px (chips/elementos finos
  ocultos). Mobile-first es prioridad: la mayoría de usuarios ven desde el celular.

## 11. Reglas de diseño a respetar

- Sin gradientes complejos, sin glassmorphism (salvo el blur del nav), sin sombras
  decorativas excesivas. Mucho espacio en blanco.
- El acento azul es **acento**, no protagonista: úsalo en CTAs, énfasis puntuales e
  iconos — no lo riegues por toda la página.
- Lenguaje directo, español colombiano, sin tecnicismos de contador.
- Hit targets en móvil ≥44px. Texto de cuerpo nunca < 14px.

## 12. Archivos en este bundle

- `Leva Landing.html` — markup completo de referencia (acento azul fijado, sin panel de
  tweaks).
- `styles.css` — todos los estilos y tokens (variables CSS en `:root`).
- `image-slot.js` — web component de los placeholders de foto (solo prototipo).

> Para verlo: abre `Leva Landing.html` en el navegador (los 3 archivos deben estar juntos).
