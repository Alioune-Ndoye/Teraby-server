import twilio from 'twilio'
import { buildBookingNotification, buildStatusUpdate } from '../utils/promptTemplates.js'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

const FROM = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`
const BUSINESS = `whatsapp:${process.env.BUSINESS_WHATSAPP_NUMBER}`

// ─── Send a WhatsApp message ──────────────────────────────────────────────────
export const sendWhatsApp = async (to, body) => {
  const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`
  return client.messages.create({ from: FROM, to: toFormatted, body })
}

// ─── Notify business of new booking ──────────────────────────────────────────
export const notifyNewBooking = async (booking) => {
  const body = buildBookingNotification(booking)
  return sendWhatsApp(BUSINESS, body)
}

// ─── Notify client of status change ──────────────────────────────────────────
export const notifyStatusUpdate = async (booking) => {
  if (!booking.phone) return null
  const body = buildStatusUpdate(booking)
  return sendWhatsApp(booking.phone, body)
}

// ─── Parse incoming webhook body (from Twilio) ────────────────────────────────
export const parseWebhook = (body) => ({
  from:    (body.From || '').replace('whatsapp:', ''),
  to:      (body.To   || '').replace('whatsapp:', ''),
  message: body.Body || '',
  sid:     body.MessageSid || '',
})
