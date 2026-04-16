import mongoose from 'mongoose'

const { Schema } = mongoose

const teamMemberSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      trim: true,
      maxlength: [100, 'Role cannot exceed 100 characters'],
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [600, 'Bio cannot exceed 600 characters'],
    },
    photo: {
      url:      { type: String },
      publicId: { type: String },
    },
    specialties: [{ type: String, trim: true }],
    yearsExperience: {
      type: Number,
      min: [0, 'Years of experience cannot be negative'],
    },
    active: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
)

// ─── Indexes ──────────────────────────────────────────────────────────────────
teamMemberSchema.index({ active: 1, order: 1 })

const TeamMember = mongoose.model('TeamMember', teamMemberSchema)
export default TeamMember
