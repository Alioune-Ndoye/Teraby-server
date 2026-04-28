import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM = process.env.RESEND_FROM_EMAIL || 'Teraby <reservations@teraby.fr>'

const serviceLabel = (type) =>
  ({
    standard_express:  'Standard Express',
    standard_standard: 'Standard',
    standard_premium:  'Standard Premium',
    premium_signature: 'Premium Signature',
    premium_excellence:'Premium Excellence',
    commercial:        'Commercial',
  }[type] || type)

// ─── Send booking confirmation email to client ────────────────────────────────
export const sendBookingConfirmation = async (booking) => {
  if (!resend) {
    console.warn('⚠️  Resend not configured — skipping confirmation email (add RESEND_API_KEY to .env)')
    return null
  }

  const dateStr = new Date(booking.date).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirmation de réservation – Teraby</title>
</head>
<body style="margin:0;padding:0;background:#0a0e1a;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0e1a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#111827;border-radius:12px 12px 0 0;padding:36px 40px;text-align:center;border-bottom:2px solid #e8631a;">
              <div style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:2px;">TERABY</div>
              <div style="font-size:12px;color:#9ca3af;letter-spacing:3px;margin-top:4px;text-transform:uppercase;">Nettoyage Haut de Gamme</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#111827;padding:36px 40px;">
              <div style="font-size:20px;font-weight:700;color:#ffffff;margin-bottom:8px;">
                ✅ Votre réservation est confirmée !
              </div>
              <p style="color:#9ca3af;font-size:15px;line-height:1.6;margin:0 0 28px;">
                Bonjour ${booking.name},<br/><br/>
                Nous avons le plaisir de confirmer votre réservation. Notre équipe sera présente à l'adresse indiquée au créneau choisi.
              </p>

              <!-- Details card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1f2937;border-radius:8px;overflow:hidden;margin-bottom:28px;">
                <tr><td style="padding:20px 24px;border-bottom:1px solid #374151;">
                  <div style="font-size:11px;color:#e8631a;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;">Détails de la prestation</div>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="color:#9ca3af;font-size:14px;padding:6px 0;width:40%;">🧹 Prestation</td>
                      <td style="color:#ffffff;font-size:14px;font-weight:600;padding:6px 0;">${serviceLabel(booking.serviceType)}</td>
                    </tr>
                    <tr>
                      <td style="color:#9ca3af;font-size:14px;padding:6px 0;">📅 Date</td>
                      <td style="color:#ffffff;font-size:14px;font-weight:600;padding:6px 0;">${dateStr}</td>
                    </tr>
                    <tr>
                      <td style="color:#9ca3af;font-size:14px;padding:6px 0;">🕐 Heure</td>
                      <td style="color:#ffffff;font-size:14px;font-weight:600;padding:6px 0;">${booking.time}</td>
                    </tr>
                    <tr>
                      <td style="color:#9ca3af;font-size:14px;padding:6px 0;">📍 Adresse</td>
                      <td style="color:#ffffff;font-size:14px;font-weight:600;padding:6px 0;">${booking.address}</td>
                    </tr>
                    ${booking.estimatedPrice ? `
                    <tr>
                      <td style="color:#9ca3af;font-size:14px;padding:6px 0;">💰 Estimation</td>
                      <td style="color:#e8631a;font-size:14px;font-weight:700;padding:6px 0;">${booking.estimatedPrice}€</td>
                    </tr>` : ''}
                  </table>
                </td></tr>
              </table>

              <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 28px;">
                En cas de question ou d'annulation (au moins 24h à l'avance), n'hésitez pas à nous contacter.<br/>
                Nous nous réjouissons de prendre soin de votre espace.
              </p>

              <div style="text-align:center;">
                <div style="display:inline-block;background:#e8631a;color:#ffffff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:6px;text-decoration:none;letter-spacing:1px;">
                  L'équipe Teraby
                </div>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0f1623;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;border-top:1px solid #1f2937;">
              <p style="color:#4b5563;font-size:12px;margin:0;">
                Teraby • Paris, Île-de-France<br/>
                © ${new Date().getFullYear()} Teraby. Tous droits réservés.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return resend.emails.send({
    from:    FROM,
    to:      booking.email,
    subject: `✅ Réservation confirmée – ${dateStr} à ${booking.time} | Teraby`,
    html,
  })
}

// ─── Send booking rejection email to client ───────────────────────────────────
export const sendBookingRejection = async (booking) => {
  if (!resend) {
    console.warn('⚠️  Resend not configured — skipping rejection email')
    return null
  }

  const dateStr = new Date(booking.date).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mise à jour de votre réservation – Teraby</title>
</head>
<body style="margin:0;padding:0;background:#0a0e1a;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0e1a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#111827;border-radius:12px 12px 0 0;padding:36px 40px;text-align:center;border-bottom:2px solid #e8631a;">
              <div style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:2px;">TERABY</div>
              <div style="font-size:12px;color:#9ca3af;letter-spacing:3px;margin-top:4px;text-transform:uppercase;">Nettoyage Haut de Gamme</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#111827;padding:36px 40px;">
              <div style="font-size:20px;font-weight:700;color:#ffffff;margin-bottom:8px;">
                Mise à jour concernant votre réservation
              </div>
              <p style="color:#9ca3af;font-size:15px;line-height:1.6;margin:0 0 28px;">
                Bonjour ${booking.name},<br/><br/>
                Nous vous informons que nous ne sommes malheureusement pas en mesure de confirmer votre réservation du <strong style="color:#ffffff;">${dateStr} à ${booking.time}</strong>.<br/><br/>
                Nous nous excusons pour la gêne occasionnée et vous invitons à nous recontacter pour trouver un créneau disponible.
              </p>

              <!-- CTA -->
              <div style="text-align:center;margin-bottom:28px;">
                <a href="https://teraby.fr" style="display:inline-block;background:#e8631a;color:#ffffff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:6px;text-decoration:none;letter-spacing:1px;">
                  Nouvelle réservation
                </a>
              </div>

              <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0;">
                Merci de votre compréhension et de votre confiance envers Teraby.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0f1623;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;border-top:1px solid #1f2937;">
              <p style="color:#4b5563;font-size:12px;margin:0;">
                Teraby • Paris, Île-de-France<br/>
                © ${new Date().getFullYear()} Teraby. Tous droits réservés.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return resend.emails.send({
    from:    FROM,
    to:      booking.email,
    subject: `Mise à jour de votre réservation | Teraby`,
    html,
  })
}
