/**
 * Generates the mobile-friendly Accept/Deny HTML page for admins.
 * Served at GET /confirm/:token — opened directly from the WhatsApp link.
 */

const serviceLabel = (type) =>
  ({
    standard_express:   'Standard Express',
    standard_standard:  'Standard',
    standard_premium:   'Standard Premium',
    premium_signature:  'Premium Signature',
    premium_excellence: 'Premium Excellence',
    commercial:         'Commercial',
  }[type] || type)

const frequencyLabel = (freq) =>
  ({
    once:     'Une seule fois',
    weekly:   'Hebdomadaire',
    biweekly: 'Bimensuel',
    monthly:  'Mensuel',
  }[freq] || freq)

export const buildConfirmPage = (booking, token, apiBase) => {
  const dateStr = new Date(booking.date).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const isPending = booking.status === 'pending'

  const statusBanner = {
    accepted: `<div class="status-banner accepted">✅ Réservation acceptée — email envoyé au client</div>`,
    declined: `<div class="status-banner declined">❌ Réservation refusée</div>`,
    completed:`<div class="status-banner accepted">🌟 Prestation terminée</div>`,
  }[booking.status] || ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/>
  <title>Réservation Teraby</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#0a0e1a;color:#e5e7eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh;padding:20px}
    .card{background:#111827;border-radius:16px;padding:24px;max-width:440px;margin:0 auto;border:1px solid #1f2937}
    .header{text-align:center;margin-bottom:24px}
    .brand{font-size:22px;font-weight:800;color:#fff;letter-spacing:2px}
    .subtitle{font-size:11px;color:#6b7280;letter-spacing:3px;text-transform:uppercase;margin-top:4px}
    .divider{height:1px;background:#1f2937;margin:20px 0}
    .section-label{font-size:11px;color:#e8631a;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;font-weight:600}
    .row{display:flex;gap:12px;margin-bottom:10px;align-items:flex-start}
    .row .icon{font-size:16px;min-width:22px}
    .row .label{font-size:12px;color:#6b7280;margin-bottom:2px}
    .row .val{font-size:15px;color:#fff;font-weight:500}
    .price{font-size:24px;font-weight:800;color:#e8631a;text-align:center;padding:16px;background:#1f2937;border-radius:12px;margin:16px 0}
    .price span{font-size:13px;color:#6b7280;display:block;font-weight:400;margin-top:2px}
    .btn{display:block;width:100%;padding:16px;border:none;border-radius:12px;font-size:17px;font-weight:700;cursor:pointer;letter-spacing:0.5px;transition:opacity .15s;-webkit-tap-highlight-color:transparent}
    .btn:active{opacity:.8}
    .btn-accept{background:#16a34a;color:#fff;margin-bottom:12px}
    .btn-decline{background:#1f2937;color:#ef4444;border:1px solid #ef4444}
    .btn-disabled{opacity:.4;cursor:default}
    .status-banner{padding:14px;border-radius:10px;text-align:center;font-weight:600;margin-bottom:16px;font-size:15px}
    .status-banner.accepted{background:#14532d;color:#4ade80;border:1px solid #16a34a}
    .status-banner.declined{background:#450a0a;color:#f87171;border:1px solid #ef4444}
    .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1f2937;color:#fff;padding:14px 24px;border-radius:12px;font-size:14px;font-weight:500;opacity:0;transition:opacity .3s;pointer-events:none;border:1px solid #374151;min-width:200px;text-align:center}
    .toast.show{opacity:1}
    .loading{display:none;text-align:center;color:#6b7280;font-size:14px;margin:8px 0}
    .notes-box{background:#1f2937;border-radius:10px;padding:12px;font-size:13px;color:#9ca3af;line-height:1.5;font-style:italic}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="brand">TERABY</div>
      <div class="subtitle">Admin · Confirmation réservation</div>
    </div>

    ${statusBanner}

    <div class="section-label">Client</div>
    <div class="row"><div class="icon">👤</div><div><div class="label">Nom</div><div class="val">${booking.name}</div></div></div>
    <div class="row"><div class="icon">📧</div><div><div class="label">Email</div><div class="val">${booking.email}</div></div></div>
    <div class="row"><div class="icon">📱</div><div><div class="label">Téléphone</div><div class="val">${booking.phone}</div></div></div>

    <div class="divider"></div>
    <div class="section-label">Prestation</div>
    <div class="row"><div class="icon">🧹</div><div><div class="label">Service</div><div class="val">${serviceLabel(booking.serviceType)}</div></div></div>
    <div class="row"><div class="icon">🔁</div><div><div class="label">Fréquence</div><div class="val">${frequencyLabel(booking.frequency)}</div></div></div>
    <div class="row"><div class="icon">📅</div><div><div class="label">Date</div><div class="val">${dateStr}</div></div></div>
    <div class="row"><div class="icon">🕐</div><div><div class="label">Heure</div><div class="val">${booking.time}</div></div></div>
    <div class="row"><div class="icon">📍</div><div><div class="label">Adresse</div><div class="val">${booking.address}</div></div></div>

    ${booking.estimatedPrice ? `
    <div class="price">
      ${booking.estimatedPrice}€
      <span>Estimation</span>
    </div>` : ''}

    ${booking.notes ? `
    <div class="divider"></div>
    <div class="section-label">Notes</div>
    <div class="notes-box">${booking.notes}</div>` : ''}

    <div class="divider"></div>

    ${isPending ? `
    <div class="loading" id="loading">⏳ Traitement en cours…</div>
    <button class="btn btn-accept" id="btnAccept" onclick="act('accepted')">✅ Accepter la réservation</button>
    <button class="btn btn-decline" id="btnDecline" onclick="act('declined')">❌ Refuser</button>
    ` : `<p style="text-align:center;color:#6b7280;font-size:13px">Cette réservation a déjà été traitée.</p>`}
  </div>

  <div class="toast" id="toast"></div>

  <script>
    const API = '${apiBase}'
    const TOKEN = '${token}'

    async function act(action) {
      const btnA = document.getElementById('btnAccept')
      const btnD = document.getElementById('btnDecline')
      const load = document.getElementById('loading')
      if (btnA) btnA.disabled = true
      if (btnD) btnD.disabled = true
      if (load) load.style.display = 'block'

      try {
        const r = await fetch(API + '/api/bookings/confirm/' + TOKEN, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action })
        })
        const data = await r.json()
        if (!r.ok) throw new Error(data.message || 'Erreur')

        const msg = action === 'accepted'
          ? '✅ Accepté — email de confirmation envoyé'
          : '❌ Réservation refusée'

        document.querySelector('.card').innerHTML = \`
          <div class="header"><div class="brand">TERABY</div></div>
          <div class="status-banner \${action === 'accepted' ? 'accepted' : 'declined'}" style="margin-top:24px">
            \${msg}
          </div>
          <p style="text-align:center;color:#6b7280;font-size:14px;margin-top:16px">
            Vous pouvez fermer cette page.
          </p>
        \`
      } catch(e) {
        showToast('❌ ' + e.message)
        if (btnA) btnA.disabled = false
        if (btnD) btnD.disabled = false
        if (load) load.style.display = 'none'
      }
    }

    function showToast(msg) {
      const t = document.getElementById('toast')
      t.textContent = msg
      t.classList.add('show')
      setTimeout(() => t.classList.remove('show'), 3500)
    }
  </script>
</body>
</html>`
}
