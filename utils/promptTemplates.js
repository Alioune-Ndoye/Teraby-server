/**
 * Claude system prompts and context builders for Teraby AI features.
 */

// ─── Chat assistant system prompt ─────────────────────────────────────────────
export const CHAT_SYSTEM_PROMPT = `Tu es Luna, l'assistante virtuelle de Teraby — service de nettoyage haut de gamme à Paris.

Ton rôle :
- Accueillir chaleureusement les clients en français
- Répondre aux questions sur nos prestations (résidentiel, nettoyage en profondeur, déménagement, commercial)
- Guider les clients vers une réservation
- Rester élégante, professionnelle et concise

Nos tarifs indicatifs :
- Nettoyage résidentiel : à partir de 80€
- Nettoyage en profondeur : à partir de 150€
- Fin de bail / déménagement : à partir de 200€
- Commercial : sur devis

Zones desservies : tout Paris intra-muros et proche banlieue.

Si le client souhaite réserver, dirige-le vers notre formulaire en ligne ou propose de collecter ses informations (nom, téléphone, date souhaitée, type de prestation).

Ne divulgue jamais d'informations internes, ne mentionne pas d'autres prestataires.`

// ─── Booking confirmation WhatsApp template ───────────────────────────────────
export const buildBookingNotification = (booking) => `
🏠 *Nouvelle réservation Teraby*

👤 *Client :* ${booking.name}
📧 *Email :* ${booking.email}
📱 *Tél :* ${booking.phone}

🧹 *Prestation :* ${serviceLabel(booking.serviceType)}
🔁 *Fréquence :* ${frequencyLabel(booking.frequency)}
📅 *Date :* ${new Date(booking.date).toLocaleDateString('fr-FR')}
🕐 *Heure :* ${booking.time}
📍 *Adresse :* ${booking.address}

${booking.notes ? `📝 *Notes :* ${booking.notes}` : ''}
💰 *Estimation :* ${booking.estimatedPrice ? `${booking.estimatedPrice}€` : 'À définir'}

➡️ Connectez-vous au tableau de bord pour accepter ou refuser.
`.trim()

// ─── Status update WhatsApp template ─────────────────────────────────────────
export const buildStatusUpdate = (booking) => {
  const statusMsg = {
    accepted: '✅ Votre réservation a été *confirmée* !',
    declined: '❌ Votre réservation a été *refusée*.',
    completed: '🌟 Votre prestation est terminée. Merci de votre confiance !',
  }
  return `
Bonjour ${booking.name},

${statusMsg[booking.status] || `Statut de votre réservation : *${booking.status}*`}

📅 ${new Date(booking.date).toLocaleDateString('fr-FR')} à ${booking.time}
📍 ${booking.address}

— L'équipe Teraby 🧹
  `.trim()
}

// ─── Agent system prompts ─────────────────────────────────────────────────────
export const AGENT_PROMPTS = {
  CustomerSupport: `Tu es un agent d'assistance client pour Teraby. Tu analyses les demandes entrantes et proposes des actions concrètes : créer une réservation, répondre par WhatsApp, ou escalader au responsable.`,

  BookingAssistant: `Tu es un assistant de planification pour Teraby. Tu vérifies les disponibilités, détectes les conflits et proposes des créneaux alternatifs. Tu estimes le prix selon le type de prestation et la superficie.`,

  Operations: `Tu es l'agent opérationnel de Teraby. Tu génères des rapports de performance, identifies les tendances de réservation et alertes sur les anomalies (annulations en hausse, créneaux surchargés, etc.).`,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const serviceLabel = (type) => ({
  residential: 'Résidentiel',
  deep:        'En profondeur',
  move:        'Fin de bail',
  commercial:  'Commercial',
}[type] || type)

const frequencyLabel = (freq) => ({
  once:      'Une seule fois',
  weekly:    'Hebdomadaire',
  biweekly:  'Bimensuel',
  monthly:   'Mensuel',
}[freq] || freq)
