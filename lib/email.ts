import { createAdminClient } from './supabase/admin'

export async function enviarEmailInvitacion(payload: {
  emailDestino: string
  nombreOwner: string
  nombreTienda: string
  rolLabel: string
  linkInvitacion: string
}) {
  const { emailDestino, nombreOwner, nombreTienda, rolLabel, linkInvitacion } = payload

  // Referencia para el template «Invite user» en Supabase Dashboard (el envío usa inviteUserByEmail + ese template).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- solo documentación; el HTML activo está en el dashboard
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitación a colaborar — Polea</title>
</head>
<body style="margin:0;padding:0;background-color:#FAF6F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FAF6F0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;">
          <tr>
            <td style="background-color:#1E3A2F;padding:32px 28px;text-align:center;border-radius:12px 12px 0 0;">
              <p style="margin:0;font-size:28px;font-weight:700;letter-spacing:0.06em;color:#FFFFFF;line-height:1.2;">POLEA</p>
              <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.7);letter-spacing:2px;text-transform:uppercase;">Tu tienda, clara</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#FFFFFF;padding:36px 32px;border-left:1px solid #EDE5DC;border-right:1px solid #EDE5DC;">
              <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#1E3A2F;line-height:1.4;">¡Te invitaron a colaborar! 🎉</p>
              <p style="margin:0 0 24px;font-size:15px;color:#4A3F35;line-height:1.6;">
                <strong>${nombreOwner}</strong> te invita a unirte a <strong>${nombreTienda}</strong> en Polea como <strong>${rolLabel}</strong>.
              </p>
              <div style="background-color:#FAF6F0;border:1px solid #EDE5DC;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
                <p style="margin:0;font-size:13px;color:#8A7D72;">Tienda</p>
                <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#1A1510;">${nombreTienda}</p>
                <p style="margin:8px 0 0;font-size:13px;color:#8A7D72;">Tu rol</p>
                <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#1A1510;">${rolLabel}</p>
              </div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 24px;">
                <tr>
                  <td style="border-radius:10px;background-color:#C4622D;">
                    <a href="${linkInvitacion}" target="_blank" rel="noopener noreferrer"
                      style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:10px;">
                      Aceptar invitación →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;color:#8A7D72;line-height:1.5;">
                O copia este link en tu navegador:
              </p>
              <p style="margin:0;font-size:12px;color:#C4622D;word-break:break-all;">${linkInvitacion}</p>
              <p style="margin:24px 0 0;font-size:13px;color:#8A7D72;line-height:1.5;">
                Si no esperabas esta invitación, puedes ignorar este mensaje.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#FAF6F0;padding:20px 24px;text-align:center;border-radius:0 0 12px 12px;border:1px solid #EDE5DC;border-top:none;">
              <p style="margin:0;font-size:11px;color:#8A7D72;line-height:1.5;">© Polea · Este es un correo automático, por favor no respondas.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  const adminClient = createAdminClient()

  try {
    const { error } = await adminClient.auth.admin.inviteUserByEmail(emailDestino, {
      redirectTo: linkInvitacion,
    })

    if (error) {
      console.error('Error enviando email de invitación:', error.message)
      return { error: error.message }
    }

    return { ok: true as const }
  } catch (e: unknown) {
    console.error('Error en enviarEmailInvitacion:', e)
    return { error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}
