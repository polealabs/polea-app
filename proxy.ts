import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

async function isAdmin(supabase: SupabaseClient, email: string): Promise<boolean> {
  const { data } = await supabase.from('admins').select('id').eq('email', email).maybeSingle()
  return !!data
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
    pathname.startsWith('/consignaciones/salida') ||
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
    pathname.startsWith('/polealabs')

  const supabaseCookie = request.cookies.getAll().find(
    (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'),
  )
  const hasSession = !!supabaseCookie

  if (!hasSession && isDashboardRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (hasSession && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
