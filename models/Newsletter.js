import mongoose from 'mongoose'

const { Schema } = mongoose

const newsletterSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, 'Email requis'],
      lowercase: true,
      trim: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, 'Email invalide'],
    },
    source: { type: String, default: 'footer' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

newsletterSchema.index({ email: 1 }, { unique: true })
newsletterSchema.index({ createdAt: -1 })

const Newsletter = mongoose.model('Newsletter', newsletterSchema)
export default Newsletter
