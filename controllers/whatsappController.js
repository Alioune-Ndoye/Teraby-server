import { sendWhatsApp, parseWebhook } from '../services/twilioService.js'
import { chat } from '../services/anthropicService.js'
import { success } from '../utils/responseHelper.js'
import { broadcast } from '../server.js'

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

  broadcast('whatsapp_message', { from, message })

  // Auto-reply via Luna AI
  let reply = ''
  try {
    reply = await chat([], message)
    await sendWhatsApp(from, reply)
  } catch (e) {
    console.warn('WhatsApp auto-reply failed:', e.message)
  }

  // Twilio expects 200 + empty TwiML or plain text
  res.set('Content-Type', 'text/xml')
  res.status(200).send('<Response></Response>')
}
