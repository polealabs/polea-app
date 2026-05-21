import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

async function isAdmin(supabase: SupabaseClient, email: string): Promise<boolean> {
  const { data } = await supabase.from('admins').select('id').eq('email', email).maybeSingle()
  return !!data
}

async function getAccesoSuscripcion(supabase: SupabaseClient, userId: string): Promise<'ok' | 'bloqueada'> {
  const { data: tienda } = await supabase
    .from('tiendas')
    .select('id, es_beta, beta_hasta')
    .eq('owner_id', userId)
    .maybeSingle()

  let tiendaId: string | null = tienda?.id ?? null
  let esBeta: boolean = tienda?.es_beta ?? false
  let betaHasta: string | null = tienda?.beta_hasta ?? null

  if (!tiendaId) {
    const { data: membresia } = await supabase
      .from('miembros')
      .select('tienda_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (!membresia) return 'ok'
    tiendaId = membresia.tienda_id

    const { data: tiendaMiembro } = await supabase
      .from('tiendas')
      .select('es_beta, beta_hasta')
      .eq('id', tiendaId)
      .maybeSingle()

    esBeta = tiendaMiembro?.es_beta ?? false
    betaHasta = tiendaMiembro?.beta_hasta ?? null
  }

  if (esBeta && betaHasta && new Date(betaHasta) > new Date()) return 'ok'

  if (!tiendaId) return 'ok'

  const { data: sus } = await supabase
    .from('suscripciones')
    .select('estado')
    .eq('tienda_id', tiendaId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!sus) return 'ok'
  if (sus.estado === 'vencida' || sus.estado === 'cancelada') return 'bloqueada'
  return 'ok'
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/polealabs')) {
    let response = NextResponse.next({ request })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            response = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          },
        },
      },
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const admin = await isAdmin(supabase, user.email ?? '')
    if (!admin) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return response
  }

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/registro')
  const isDashboardRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/productos') ||
    pathname.startsWith('/entradas') ||
    pathname.startsWith('/ventas') ||
    pathname.startsWith('/clientes') ||
    pathname.startsWith('/consignaciones') ||
    pathname.startsWith('/documentos') ||
    pathname.startsWith('/gastos') ||
    pathname.startsWith('/proveedores') ||
    pathname.startsWith('/equipo') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/perfil') ||
    pathname.startsWith('/ayuda') ||
    pathname.startsWith('/preferencias') ||
    pathname.startsWith('/configuracion') ||
    pathname.startsWith('/reportes') ||
    pathname.startsWith('/eventos') ||
    pathname.startsWith('/suscripcion')

  if (!isDashboardRoute && !isAuthRoute) return NextResponse.next()

  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const hasSession = !!user

  if (!hasSession && isDashboardRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (hasSession && isDashboardRoute) {
    const skipCheck =
      pathname.startsWith('/suscripcion') ||
      pathname.startsWith('/perfil') ||
      pathname.startsWith('/ayuda')

    if (!skipCheck) {
      const acceso = await getAccesoSuscripcion(supabase, user!.id)
      if (acceso === 'bloqueada') {
        return NextResponse.redirect(new URL('/cuenta-bloqueada', request.url))
      }
    }
  }

  if (hasSession && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
