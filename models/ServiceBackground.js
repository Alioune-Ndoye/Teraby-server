import mongoose from 'mongoose'

const { Schema } = mongoose

const serviceBackgroundSchema = new Schema(
  {
    serviceType: {
      type: String,
      required: [true, 'serviceType is required'],
      enum: ['regular', 'airbnb', 'commercial'],
      unique: true,
      trim: true,
    },
    backgroundImage: {
      url:      { type: String },
      publicId: { type: String },
    },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
)

const ServiceBackground = mongoose.model('ServiceBackground', serviceBackgroundSchema)
export default ServiceBackground
