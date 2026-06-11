import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://polea-app.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard',
        '/productos',
        '/entradas',
        '/ventas',
        '/pos',
        '/clientes',
        '/consignaciones',
        '/documentos',
        '/gastos',
        '/proveedores',
        '/reportes',
        '/eventos',
        '/equipo',
        '/perfil',
        '/preferencias',
        '/configuracion',
        '/suscripcion',
        '/onboarding',
        '/ayuda',
        '/polealabs',
        '/invitacion',
        '/cuenta-bloqueada',
        '/cuenta-eliminada',
        '/login',
        '/registro',
        '/recuperar-contrasena',
        '/nueva-contrasena',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
