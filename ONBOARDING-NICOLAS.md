# Guía de setup para Nicolás — Polea App

Todo lo que necesitas para trabajar en Polea desde tu PC.

---

## 1. Instalar herramientas (una sola vez)

### Node.js
- Descargar en: https://nodejs.org/en (versión LTS)
- Instalar con las opciones por defecto

### pnpm (manejador de paquetes)
Abrir terminal (PowerShell o CMD) y correr:
```
npm install -g pnpm
```

### Git
- Descargar en: https://git-scm.com/downloads
- Instalar con las opciones por defecto
- Después de instalar, configurar tu nombre y correo:
```
git config --global user.name "Nicolas Idrobo"
git config --global user.email "tu-correo@gmail.com"
```

### VS Code (recomendado)
- Descargar en: https://code.visualstudio.com

### Claude Code
- Descargar en: https://claude.ai/code
- Es el asistente de IA con el que trabajas en el código
- Se instala como app de escritorio

---

## 2. Clonar el proyecto (una sola vez)

Abrir terminal y correr:
```
git clone https://github.com/polealabs/polea-app.git
cd polea-app
pnpm install
```

Esto descarga todo el código y las dependencias.

---

## 3. Crear el archivo de variables de entorno (una sola vez)

Dentro de la carpeta `polea-app`, crear un archivo llamado `.env.local`
(sin extensión extra — solo `.env.local`).

Pedirle a Luis el contenido exacto de este archivo. Tiene este formato:

```
NEXT_PUBLIC_SUPABASE_URL=https://amzldldwuxtahohueule.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Luis te da este valor>
SUPABASE_SERVICE_ROLE_KEY=<Luis te da este valor>
NEXT_PUBLIC_SITE_URL=https://polea-app.vercel.app
```

IMPORTANTE: Este archivo NUNCA se sube a GitHub. Ya está en el .gitignore.

---

## 4. Correr el proyecto en local

```
pnpm run dev
```

Abrir el navegador en: http://localhost:3000

Para detenerlo: `Ctrl + C` en la terminal.

---

## 5. Flujo de trabajo diario

### Antes de empezar cualquier día
```
git pull
```
Esto jala los últimos cambios que haya hecho Luis.

### Para trabajar con Claude Code
1. Abrir Claude Code (la app de escritorio)
2. Abrir la carpeta del proyecto (`polea-app`)
3. Claude ya tiene todo el contexto del proyecto cargado desde `CLAUDE.md`
4. Describir lo que quieres hacer y Claude Code lo implementa

### Al terminar el trabajo del día
```
git add .
git commit -m "feat: descripción corta de lo que hiciste"
git push
```

Ejemplos de mensajes de commit:
- `feat: agregar filtro por fecha en ventas`
- `fix: corregir cálculo de comisión en reportes`
- `docs: actualizar backlog en CLAUDE.md`

---

## 6. Accesos importantes

### GitHub (código)
- Repositorio: https://github.com/polealabs/polea-app
- Pedirle a Luis que te agregue como colaborador con tu cuenta de GitHub

### Supabase (base de datos)
- Panel: https://supabase.com/dashboard
- Proyecto: amzldldwuxtahohueule
- Luis te tiene que agregar como miembro del proyecto

### Vercel (deploy / producción)
- Panel: https://vercel.com
- La app en producción: https://polea-app.vercel.app
- Luis te tiene que agregar como miembro del equipo

### App en producción (admin)
- Panel admin: https://polea-app.vercel.app/polealabs
- Solo accesible con polealabs@gmail.com o ldct.ldct@gmail.com

---

## 7. Estructura general del proyecto

```
polea-app/
├── app/                  # Todas las páginas
│   ├── (auth)/           # Login, registro
│   ├── (dashboard)/      # Toda la app del cliente
│   └── polealabs/        # Panel admin (solo nosotros)
├── components/           # Componentes reutilizables (Header, Sidebar, etc.)
├── lib/                  # Hooks, tipos, utilidades
├── proxy.ts              # Protege las rutas (auth + suscripción)
├── CLAUDE.md             # Contexto completo del proyecto para Claude Code
└── .env.local            # Variables de entorno (NO va a GitHub)
```

---

## 8. CLAUDE.md — el archivo más importante

`CLAUDE.md` es el "cerebro" del proyecto para Claude Code. Contiene:
- Toda la arquitectura del sistema
- Decisiones técnicas tomadas
- Diseño de la base de datos
- Convenciones de código
- El backlog de lo que falta implementar

Cuando abras Claude Code y le pidas algo, ya sabe todo esto.
Si hay algo que cambió o decidieron diferente, actualiza el CLAUDE.md y haz commit.

---

## 9. Regla de oro

**Siempre `git pull` antes de empezar.**
**Siempre `git push` al terminar.**

Así evitas conflictos entre lo que tú hiciste y lo que Luis hizo.
Si en algún momento Git dice que hay un conflicto, avisarle a Luis antes de intentar resolverlo.

---

## 10. Comandos de referencia rápida

| Qué quieres hacer | Comando |
|---|---|
| Arrancar el proyecto | `pnpm run dev` |
| Jalear cambios de Luis | `git pull` |
| Ver qué archivos cambiaste | `git status` |
| Guardar y subir cambios | `git add . && git commit -m "mensaje" && git push` |
| Verificar que no hay errores de tipos | `pnpm exec tsc --noEmit` |

---

Cualquier duda, hablar con Luis o preguntarle directamente a Claude Code.
