import mongoose from 'mongoose'

const { Schema } = mongoose

const messageSchema = new Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    ts: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
)

const chatLogSchema = new Schema(
  {
    sessionId: {
      type: String,
      required: [true, 'Session ID is required'],
      index: true,
    },
    messages: [messageSchema],
    // Optional: link to a booking created during this chat
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
    },
    // Metadata
    userAgent: String,
    ip:        String,
    resolved:  { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
)

// ─── Indexes ──────────────────────────────────────────────────────────────────
chatLogSchema.index({ createdAt: -1 })
chatLogSchema.index({ bookingId: 1 })

// ─── Virtual: message count ───────────────────────────────────────────────────
chatLogSchema.virtual('messageCount').get(function () {
  return this.messages.length
})

const ChatLog = mongoose.model('ChatLog', chatLogSchema)
export default ChatLog
