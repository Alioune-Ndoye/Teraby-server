import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import multer from 'multer'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// ─── Gallery storage (before / after images) ──────────────────────────────────
const galleryStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'teraby/gallery',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, crop: 'limit', quality: 'auto' }],
  },
})

// ─── Team member photo storage ────────────────────────────────────────────────
const teamStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'teraby/team',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 600, height: 750, crop: 'fill', gravity: 'face', quality: 'auto' }],
  },
})

const fileFilter = (_req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true)
  } else {
    cb(new Error('Only image files are allowed'), false)
  }
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export const galleryUpload = multer({
  storage: galleryStorage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
})

export const teamUpload = multer({
  storage: teamStorage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
})

export { cloudinary }
