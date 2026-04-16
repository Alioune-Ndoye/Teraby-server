import mongoose from 'mongoose'

const { Schema } = mongoose

const stepSchema = new Schema(
  {
    tool:   { type: String },
    input:  { type: Schema.Types.Mixed },
    output: { type: Schema.Types.Mixed },
    ts:     { type: Date, default: Date.now },
  },
  { _id: false }
)

const agentLogSchema = new Schema(
  {
    agentName: {
      type: String,
      required: [true, 'Agent name is required'],
      enum: ['CustomerSupport', 'BookingAssistant', 'Operations'],
    },
    task: {
      type: String,
      required: [true, 'Task description is required'],
    },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed'],
      default: 'running',
    },
    steps:  [stepSchema],
    result: { type: Schema.Types.Mixed },
    error:  { type: String },
    // Execution timing
    startedAt:   { type: Date, default: Date.now },
    completedAt: { type: Date },
    durationMs:  { type: Number },
    // Optional link to related entities
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
    },
    sessionId: { type: String },
  },
  {
    timestamps: true,
  }
)

// ─── Indexes ──────────────────────────────────────────────────────────────────
agentLogSchema.index({ agentName: 1, status: 1 })
agentLogSchema.index({ createdAt: -1 })
agentLogSchema.index({ bookingId: 1 })

// ─── Pre-save: compute duration ───────────────────────────────────────────────
agentLogSchema.pre('save', function (next) {
  if (this.completedAt && this.startedAt) {
    this.durationMs = this.completedAt - this.startedAt
  }
  next()
})

const AgentLog = mongoose.model('AgentLog', agentLogSchema)
export default AgentLog
