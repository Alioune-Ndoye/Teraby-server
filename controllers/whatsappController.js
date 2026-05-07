import { sendWhatsApp, parseWebhook, notifyStatusUpdate } from '../services/twilioService.js'
import { chat } from '../services/anthropicService.js'
import { sendBookingConfirmation, sendBookingRejection } from '../services/resendService.js'
import { success } from '../utils/responseHelper.js'
import { broadcast } from '../server.js'
import Booking from '../models/Booking.js'

const normalizeNumber = (value = '') => value.replace('whatsapp:', '').replace(/\s/g, '')

const ADMIN_NUMBER = normalizeNumber(process.env.BUSINESS_WHATSAPP_NUMBER)

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
  const parsed = parseWebhook(req.body)
  const from = normalizeNumber(parsed.from)
  const msg = (parsed.message || '').trim()

  console.log('RAW FROM:', req.body.From)
  console.log('NORMALIZED FROM:', from)
  console.log('ADMIN:', ADMIN_NUMBER)

  broadcast('whatsapp_message', { from, message: msg })

  const isAdmin = Boolean(ADMIN_NUMBER && from === ADMIN_NUMBER)
  console.log('[webhook] isAdmin=%s msg=%s', isAdmin, msg)

  // Admin replies: "1 <bookingId>" to accept, "2 <bookingId>" to decline
  // Bare "1" or "2" still works as fallback (picks most recent pending)
  const parts = msg.split(/\s+/)
  const digit = parts[0]

  if (isAdmin && (digit === '1' || digit === '2')) {
    await handleAdminReply(from, digit, parts[1] || null)
  } else if (!isAdmin) {
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
async function handleAdminReply(adminFrom, digit, bookingId) {
  const action = digit === '1' ? 'accepted' : 'declined'

  let booking = null

  if (bookingId && /^[a-f0-9]{24}$/i.test(bookingId)) {
    booking = await Booking.findOne({ _id: bookingId, status: 'pending' })
    if (!booking) {
      console.log('[webhook] booking %s not found or not pending', bookingId)
      await sendWhatsApp(adminFrom, `Réservation introuvable ou déjà traitée.`).catch(() => {})
      return
    }
  } else {
    booking = await Booking.findOne({ status: 'pending' }).sort({ createdAt: -1 })
    if (!booking) {
      console.log('[webhook] no pending booking found')
      await sendWhatsApp(adminFrom, 'Aucune réservation en attente.').catch(() => {})
      return
    }
  }

  console.log('[webhook] updating booking %s to %s', booking._id, action)
  booking.status = action
  await booking.save()
  console.log('[webhook] booking saved, broadcasting')

  broadcast('booking_updated', { id: booking._id.toString(), status: action, source: 'whatsapp' })

  notifyStatusUpdate(booking).catch((e) =>
    console.warn('Client WhatsApp notification failed:', e.message)
  )

  if (action === 'accepted') {
    sendBookingConfirmation(booking)
      .then(() => console.log(`📧 Confirmation email sent to ${booking.email}`))
      .catch((e) => console.warn('Confirmation email failed:', e.message))
  } else {
    sendBookingRejection(booking)
      .then(() => console.log(`📧 Rejection email sent to ${booking.email}`))
      .catch((e) => console.warn('Rejection email failed:', e.message))
  }

  const shortId = booking._id.toString().slice(-6).toUpperCase()
  const confirmMsg = action === 'accepted'
    ? `✅ Réservation #${shortId} acceptée — ${booking.name}, ${new Date(booking.date).toLocaleDateString('fr-FR')} à ${booking.time}`
    : `❌ Réservation #${shortId} refusée — ${booking.name}`

  await sendWhatsApp(adminFrom, confirmMsg).catch((e) =>
    console.warn('Admin confirmation WhatsApp failed:', e.message)
  )
}
