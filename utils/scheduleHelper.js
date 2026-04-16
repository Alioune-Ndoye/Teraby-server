/**
 * Schedule utilities — date grouping, time slot generation, conflict helpers.
 */

// ─── Available time slots ─────────────────────────────────────────────────────
export const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
]

// ─── Date range builders ──────────────────────────────────────────────────────
export const startOfDay = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export const endOfDay = (date) => {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

export const startOfWeek = (date) => {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sunday
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

export const endOfWeek = (date) => {
  const d = startOfWeek(date)
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d
}

export const startOfMonth = (date) => {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

export const endOfMonth = (date) => {
  const d = new Date(date)
  d.setMonth(d.getMonth() + 1, 0)
  d.setHours(23, 59, 59, 999)
  return d
}

// ─── Group bookings by day ────────────────────────────────────────────────────
export const groupByDay = (bookings) => {
  const map = {}
  for (const booking of bookings) {
    const key = new Date(booking.date).toISOString().split('T')[0]
    if (!map[key]) map[key] = []
    map[key].push(booking)
  }
  return map
}

// ─── Compute free slots for a date given existing bookings ────────────────────
export const freeSlots = (bookings, date) => {
  const dayKey = new Date(date).toISOString().split('T')[0]
  const taken  = bookings
    .filter((b) => new Date(b.date).toISOString().split('T')[0] === dayKey)
    .map((b) => b.time)
  return TIME_SLOTS.filter((slot) => !taken.includes(slot))
}

// ─── French date label helpers ────────────────────────────────────────────────
export const frenchDateLabel = (date) =>
  new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day:     '2-digit',
    month:   'long',
    year:    'numeric',
  })
