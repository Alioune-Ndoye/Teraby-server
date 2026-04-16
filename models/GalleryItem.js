import mongoose from 'mongoose'

const { Schema } = mongoose

const galleryItemSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [400, 'Description cannot exceed 400 characters'],
    },
    serviceType: {
      type: String,
      enum: ['residential', 'deep', 'move', 'commercial'],
    },
    // Before image
    beforeImage: {
      url:       { type: String, required: [true, 'Before image URL is required'] },
      publicId:  { type: String, required: [true, 'Before image public ID is required'] },
    },
    // After image
    afterImage: {
      url:       { type: String, required: [true, 'After image URL is required'] },
      publicId:  { type: String, required: [true, 'After image public ID is required'] },
    },
    featured: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
    tags: [{ type: String, trim: true }],
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
)

// ─── Indexes ──────────────────────────────────────────────────────────────────
galleryItemSchema.index({ featured: 1, order: 1 })
galleryItemSchema.index({ serviceType: 1 })
galleryItemSchema.index({ createdAt: -1 })

const GalleryItem = mongoose.model('GalleryItem', galleryItemSchema)
export default GalleryItem
