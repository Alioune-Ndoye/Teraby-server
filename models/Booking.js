import mongoose from 'mongoose'

const { Schema } = mongoose

const bookingSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
    },
    serviceType: {
      type: String,
      required: [true, 'Service type is required'],
      enum: {
        values: ['residential', 'deep', 'move', 'commercial'],
        message: 'Service type must be: residential, deep, move, or commercial',
      },
    },
    frequency: {
      type: String,
      enum: ['once', 'weekly', 'biweekly', 'monthly'],
      default: 'once',
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    time: {
      type: String,
      required: [true, 'Time slot is required'],
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'completed'],
      default: 'pending',
    },
    // Internal tracking fields
    notificationSent: { type: Boolean, default: false },
    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        note: String,
      },
    ],
    // Estimated price computed at creation
    estimatedPrice: { type: Number },
  },
  {
    timestamps: true, // adds createdAt + updatedAt automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Compound index for double-booking prevention
bookingSchema.index({ date: 1, time: 1, address: 1 })
bookingSchema.index({ status: 1 })
bookingSchema.index({ email: 1 })
bookingSchema.index({ createdAt: -1 })

// ─── Virtual: formatted date ──────────────────────────────────────────────────
bookingSchema.virtual('dateFormatted').get(function () {
  return this.date
    ? this.date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null
})

// ─── Pre-save: track status history ──────────────────────────────────────────
bookingSchema.pre('save', function (next) {
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({ status: this.status, changedAt: new Date() })
  }
  next()
})

// ─── Static: check for double-booking ─────────────────────────────────────────
bookingSchema.statics.hasConflict = async function (date, time, excludeId = null) {
  const query = {
    date: {
      $gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
      $lt:  new Date(new Date(date).setHours(23, 59, 59, 999)),
    },
    time,
    status: { $nin: ['declined', 'completed'] },
  }
  if (excludeId) query._id = { $ne: excludeId }
  const count = await this.countDocuments(query)
  return count > 0
}

const Booking = mongoose.model('Booking', bookingSchema)
export default Booking
