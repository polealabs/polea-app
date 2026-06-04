'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    return { error: error.message }
  }

  return { ok: true }
}

export async function registro(formData: FormData) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('email address is already used')) {
      return { error: 'Este correo ya está registrado. Intenta iniciar sesión.' }
    }
    return { error: error.message }
  }

  const user = data.user
  if (user) {
    const nombre = (formData.get('nombre') as string)?.trim()
    await supabase.from('perfiles').upsert({
      id: user.id,
      nombre: nombre || null,
    })
  }

  if (!data.session) {
    return { needsConfirmation: true as const }
  }

  redirect('/onboarding')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function solicitarRecuperacion(formData: FormData) {
  const supabase = await createClient()
  const email = (formData.get('email') as string)?.trim()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://polea-app.vercel.app'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/nueva-contrasena`,
  })

  if (error) return { error: error.message }
  return { ok: true }
}

export async function actualizarContrasena(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: error.message }
  return { ok: true }
}
