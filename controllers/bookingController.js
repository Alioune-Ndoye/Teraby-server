import Booking from '../models/Booking.js'
import { success, created, paginate } from '../utils/responseHelper.js'
import { notifyNewBooking, notifyStatusUpdate } from '../services/twilioService.js'
import { broadcast } from '../server.js'

// ─── Price estimator ──────────────────────────────────────────────────────────
const PRICE_MAP = { residential: 100, deep: 180, move: 220, commercial: 300 }

// ─── POST /api/bookings ───────────────────────────────────────────────────────
export const createBooking = async (req, res) => {
  console.log('[booking] incoming body:', JSON.stringify(req.body, null, 2))
  const { date, time, serviceType } = req.body

  // Double-booking check
  const conflict = await Booking.hasConflict(date, time)
  if (conflict) {
    return res.status(409).json({
      success: false,
      message: 'Ce créneau est déjà réservé. Veuillez choisir une autre heure.',
    })
  }

  const booking = await Booking.create({
    ...req.body,
    estimatedPrice: PRICE_MAP[serviceType] ?? null,
  })

  // Fire-and-forget WhatsApp notification — mark notificationSent on success
  notifyNewBooking(booking)
    .then(async (msg) => {
      console.log(`✅ WhatsApp sent [${msg.sid}] status=${msg.status}`)
      await Booking.findByIdAndUpdate(booking._id, { notificationSent: true })
    })
    .catch((e) => {
      const hint = e.code === 63016
        ? ' → Le numéro destinataire doit rejoindre le sandbox Twilio (envoyez "join <keyword>" au +14155238886 sur WhatsApp)'
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

  // Notify client
  notifyStatusUpdate(booking).catch((e) =>
    console.warn('Status notification failed:', e.message)
  )

  broadcast('booking_updated', { id: booking._id, status })

  return success(res, booking, 'Statut mis à jour')
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
