import { sendWhatsApp, parseWebhook, notifyStatusUpdate } from '../services/twilioService.js'
import { chat } from '../services/anthropicService.js'
import { sendBookingConfirmation } from '../services/resendService.js'
import { success } from '../utils/responseHelper.js'
import { broadcast } from '../server.js'
import Booking from '../models/Booking.js'

const ADMIN_NUMBER = (process.env.BUSINESS_WHATSAPP_NUMBER || '').replace('whatsapp:', '')

// ─── POST /api/whatsapp/send ──────────────────────────────────────────────────
export const sendMessage = async (req, res) => {
  const { to, message } = req.body
  if (!to || !message) {
    return res.status(400).json({ success: false, message: 'to and message are required' })
  }
  const result = await sendWhatsApp(to, message)
  return success(res, { sid: result.sid }, 'Message envoyé')
}

// ─── POST /api/whatsapp/webhook (Twilio webhook) ──────────────────────────────
export const webhook = async (req, res) => {
  const { from, message } = parseWebhook(req.body)
  const msg = message.trim()

  console.log('Incoming WhatsApp:', msg, 'from:', from)
  broadcast('whatsapp_message', { from, message: msg })

  const isAdmin = ADMIN_NUMBER && from === ADMIN_NUMBER

  if (isAdmin && (msg === '1' || msg === '2')) {
    await handleAdminReply(from, msg)
  } else {
    try {
      const reply = await chat([], msg)
      await sendWhatsApp(from, reply)
    } catch (e) {
      console.warn('WhatsApp auto-reply failed:', e.message)
    }
  }

  res.set('Content-Type', 'text/xml')
  res.status(200).send('<Response></Response>')
}

// ─── Handle admin "1" / "2" reply ────────────────────────────────────────────
async function handleAdminReply(adminFrom, msg) {
  const action = msg === '1' ? 'accepted' : 'declined'

  const booking = await Booking.findOne({ status: 'pending' }).sort({ createdAt: -1 })
  if (!booking) {
    await sendWhatsApp(adminFrom, 'Aucune réservation en attente.').catch(() => {})
    return
  }

  booking.status = action
  booking.statusHistory.push({ status: action, changedAt: new Date() })
  await booking.save()

  broadcast('booking_updated', { id: booking._id, status: action })

  notifyStatusUpdate(booking).catch((e) =>
    console.warn('Client WhatsApp notification failed:', e.message)
  )

  if (action === 'accepted') {
    sendBookingConfirmation(booking)
      .then(() => console.log(`📧 Confirmation email sent to ${booking.email}`))
      .catch((e) => console.warn('Confirmation email failed:', e.message))
  }

  const shortId = booking._id.toString().slice(-6).toUpperCase()
  const confirmMsg = action === 'accepted'
    ? `✅ Réservation #${shortId} acceptée — ${booking.name}, ${new Date(booking.date).toLocaleDateString('fr-FR')} à ${booking.time}`
    : `❌ Réservation #${shortId} refusée — ${booking.name}`

  await sendWhatsApp(adminFrom, confirmMsg).catch((e) =>
    console.warn('Admin confirmation WhatsApp failed:', e.message)
  )
}
