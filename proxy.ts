import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/registro')
  const isDashboardRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/productos') ||
    pathname.startsWith('/entradas') ||
    pathname.startsWith('/ventas') ||
    pathname.startsWith('/clientes') ||
    pathname.startsWith('/documentos') ||
    pathname.startsWith('/gastos') ||
    pathname.startsWith('/proveedores') ||
    pathname.startsWith('/equipo') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/perfil') ||
    pathname.startsWith('/ayuda') ||
    pathname.startsWith('/preferencias') ||
    pathname.startsWith('/reportes')

  const supabaseCookie = request.cookies.getAll().find(c =>
    c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
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
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
