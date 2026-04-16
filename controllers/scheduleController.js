import Booking from '../models/Booking.js'
import { success } from '../utils/responseHelper.js'
import {
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  groupByDay, freeSlots, TIME_SLOTS,
} from '../utils/scheduleHelper.js'

// ─── GET /api/schedule/day?date=YYYY-MM-DD ────────────────────────────────────
export const getDay = async (req, res) => {
  const date  = req.query.date ? new Date(req.query.date) : new Date()
  const start = startOfDay(date)
  const end   = endOfDay(date)

  const bookings = await Booking.find({
    date:   { $gte: start, $lte: end },
    status: { $nin: ['declined'] },
  }).sort({ time: 1 }).lean()

  return success(res, {
    date:      start.toISOString().split('T')[0],
    bookings,
    freeSlots: freeSlots(bookings, date),
    allSlots:  TIME_SLOTS,
  })
}

// ─── GET /api/schedule/week?date=YYYY-MM-DD ───────────────────────────────────
export const getWeek = async (req, res) => {
  const date  = req.query.date ? new Date(req.query.date) : new Date()
  const start = startOfWeek(date)
  const end   = endOfWeek(date)

  const bookings = await Booking.find({
    date:   { $gte: start, $lte: end },
    status: { $nin: ['declined'] },
  }).sort({ date: 1, time: 1 }).lean()

  return success(res, {
    weekStart: start.toISOString().split('T')[0],
    weekEnd:   end.toISOString().split('T')[0],
    byDay:     groupByDay(bookings),
    total:     bookings.length,
  })
}

// ─── GET /api/schedule/month?date=YYYY-MM-DD ──────────────────────────────────
export const getMonth = async (req, res) => {
  const date  = req.query.date ? new Date(req.query.date) : new Date()
  const start = startOfMonth(date)
  const end   = endOfMonth(date)

  const bookings = await Booking.find({
    date: { $gte: start, $lte: end },
  }).sort({ date: 1, time: 1 }).lean()

  const byStatus = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1
    return acc
  }, {})

  return success(res, {
    month:   `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    byDay:   groupByDay(bookings),
    byStatus,
    total:   bookings.length,
  })
}

// ─── GET /api/schedule/availability?date=YYYY-MM-DD ──────────────────────────
export const getAvailability = async (req, res) => {
  const date  = req.query.date ? new Date(req.query.date) : new Date()
  const start = startOfDay(date)
  const end   = endOfDay(date)

  const bookings = await Booking.find({
    date:   { $gte: start, $lte: end },
    status: { $nin: ['declined', 'completed'] },
  }).lean()

  return success(res, {
    date:      start.toISOString().split('T')[0],
    available: freeSlots(bookings, date),
    taken:     bookings.map((b) => b.time),
  })
}
