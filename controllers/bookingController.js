import { v4 as uuidv4 } from 'uuid'
import Booking from '../models/Booking.js'
import { success, created, paginate } from '../utils/responseHelper.js'
import { notifyNewBooking, notifyStatusUpdate } from '../services/twilioService.js'
import { sendBookingConfirmation } from '../services/resendService.js'
import { buildConfirmPage } from '../utils/confirmPage.js'
import { broadcast } from '../server.js'

// ─── Price estimator ──────────────────────────────────────────────────────────
const PRICE_MAP = {
  standard_express:   90,
  standard_standard:  120,
  standard_premium:   150,
  premium_signature:  140,
  premium_excellence: 240,
  commercial:         300,
}

// ─── POST /api/bookings ───────────────────────────────────────────────────────
export const createBooking = async (req, res) => {
  console.log('[booking] incoming body:', JSON.stringify(req.body, null, 2))
  const { date, time, serviceType } = req.body

  const conflict = await Booking.hasConflict(date, time)
  if (conflict) {
    return res.status(409).json({
      success: false,
      message: 'Ce créneau est déjà réservé. Veuillez choisir une autre heure.',
    })
  }

  const booking = await Booking.create({
    ...req.body,
    confirmToken:   uuidv4(),
    estimatedPrice: req.body.estimatedPrice ?? PRICE_MAP[serviceType] ?? null,
  })

  // Fire-and-forget WhatsApp notification to business
  notifyNewBooking(booking)
    .then(async (msg) => {
      console.log(`✅ WhatsApp sent [${msg.sid}] status=${msg.status}`)
      await Booking.findByIdAndUpdate(booking._id, { notificationSent: true })
    })
    .catch((e) => {
      const hint = e.code === 63016
        ? ' → Le numéro destinataire doit rejoindre le sandbox Twilio'
        : ''
      console.error(`❌ WhatsApp failed [code=${e.code}]: ${e.message}${hint}`)
    })

  broadcast('new_booking', booking)

  return created(res, booking, 'Réservation créée avec succès')
}

// ─── GET /api/bookings ────────────────────────────────────────────────────────
export const getBookings = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query
  const filter = {}
  if (status) filter.status = status

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean(),
    Booking.countDocuments(filter),
  ])

  return paginate(res, bookings, total, page, limit)
}

// ─── GET /api/bookings/:id ────────────────────────────────────────────────────
export const getBooking = async (req, res) => {
  const booking = await Booking.findById(req.params.id)
  if (!booking) return res.status(404).json({ success: false, message: 'Réservation introuvable' })
  return success(res, booking)
}

// ─── PATCH /api/bookings/:id/status ──────────────────────────────────────────
export const updateStatus = async (req, res) => {
  const { status, note } = req.body
  const booking = await Booking.findById(req.params.id)
  if (!booking) return res.status(404).json({ success: false, message: 'Réservation introuvable' })

  booking.status = status
  if (note) booking.statusHistory.push({ status, note, changedAt: new Date() })
  await booking.save()

  // Notify client via WhatsApp
  notifyStatusUpdate(booking).catch((e) =>
    console.warn('Status WhatsApp notification failed:', e.message)
  )

  // Send confirmation email when accepted
  if (status === 'accepted') {
    sendBookingConfirmation(booking)
      .then(() => console.log(`📧 Confirmation email sent to ${booking.email}`))
      .catch((e) => console.warn('Confirmation email failed:', e.message))
  }

  broadcast('booking_updated', { id: booking._id.toString(), status })

  return success(res, booking, 'Statut mis à jour')
}

// ─── GET /confirm/:token — mobile accept/deny page ───────────────────────────
export const confirmPage = async (req, res) => {
  const { token } = req.params
  const booking = await Booking.findOne({ confirmToken: token })

  const apiBase = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`

  if (!booking) {
    return res.status(404).send('<h2 style="font-family:sans-serif;text-align:center;margin-top:60px;color:#ef4444">Réservation introuvable ou lien invalide.</h2>')
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(buildConfirmPage(booking, token, apiBase))
}

// ─── POST /api/bookings/confirm/:token — process accept/deny from phone ──────
export const confirmAction = async (req, res) => {
  const { token } = req.params
  const { action } = req.body

  if (!['accepted', 'declined'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Action invalide' })
  }

  const booking = await Booking.findOne({ confirmToken: token })
  if (!booking) return res.status(404).json({ success: false, message: 'Réservation introuvable' })
  if (booking.status !== 'pending') {
    return res.status(409).json({ success: false, message: 'Cette réservation a déjà été traitée.' })
  }

  booking.status = action
  booking.statusHistory.push({ status: action, changedAt: new Date() })
  await booking.save()

  // Notify client via WhatsApp
  notifyStatusUpdate(booking).catch((e) =>
    console.warn('Status WhatsApp failed:', e.message)
  )

  // Send confirmation email on acceptance
  if (action === 'accepted') {
    sendBookingConfirmation(booking)
      .then(() => console.log(`📧 Confirmation email sent to ${booking.email}`))
      .catch((e) => console.warn('Confirmation email failed:', e.message))
  }

  broadcast('booking_updated', { id: booking._id.toString(), status: action })

  return success(res, { status: action }, `Réservation ${action === 'accepted' ? 'acceptée' : 'refusée'}`)
}

// ─── PUT /api/bookings/:id ────────────────────────────────────────────────────
export const updateBooking = async (req, res) => {
  const booking = await Booking.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  )
  if (!booking) return res.status(404).json({ success: false, message: 'Réservation introuvable' })
  broadcast('booking_updated', booking)
  return success(res, booking, 'Réservation mise à jour')
}

// ─── DELETE /api/bookings/:id ─────────────────────────────────────────────────
export const deleteBooking = async (req, res) => {
  const booking = await Booking.findByIdAndDelete(req.params.id)
  if (!booking) return res.status(404).json({ success: false, message: 'Réservation introuvable' })
  broadcast('booking_deleted', { id: req.params.id })
  return success(res, null, 'Réservation supprimée')
}
