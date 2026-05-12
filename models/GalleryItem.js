import mongoose from 'mongoose'

const { Schema } = mongoose

const imageSubSchema = new Schema(
  { url: { type: String }, publicId: { type: String } },
  { _id: false }
)

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
    // Gallery section category
    category: {
      type: String,
      enum: ['avant-apres', 'resultats-premium', 'equipes-action'],
      default: 'avant-apres',
    },
    serviceType: {
      type: String,
      enum: ['residential', 'deep', 'move', 'commercial'],
    },
    // Single image — used for resultats-premium and equipes-action
    image: imageSubSchema,
    // Before/After pair — used for avant-apres
    beforeImage: imageSubSchema,
    afterImage:  imageSubSchema,
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

galleryItemSchema.index({ featured: 1, order: 1 })
galleryItemSchema.index({ category: 1, createdAt: -1 })
galleryItemSchema.index({ createdAt: -1 })

const GalleryItem = mongoose.model('GalleryItem', galleryItemSchema)
export default GalleryItem
