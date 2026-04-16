import GalleryItem from '../models/GalleryItem.js'
import { cloudinary } from '../config/cloudinary.js'
import { success, created } from '../utils/responseHelper.js'

// ─── POST /api/gallery ────────────────────────────────────────────────────────
// Expects multipart/form-data with fields: beforeImage, afterImage + body fields
export const createItem = async (req, res) => {
  const files = req.files || {}

  if (!files.beforeImage?.[0] || !files.afterImage?.[0]) {
    return res.status(400).json({
      success: false,
      message: 'beforeImage and afterImage files are required',
    })
  }

  const item = await GalleryItem.create({
    ...req.body,
    beforeImage: {
      url:      files.beforeImage[0].path,
      publicId: files.beforeImage[0].filename,
    },
    afterImage: {
      url:      files.afterImage[0].path,
      publicId: files.afterImage[0].filename,
    },
  })

  return created(res, item, 'Élément galerie créé')
}

// ─── GET /api/gallery ─────────────────────────────────────────────────────────
export const getItems = async (req, res) => {
  const { serviceType, featured } = req.query
  const filter = {}
  if (serviceType) filter.serviceType = serviceType
  if (featured !== undefined) filter.featured = featured === 'true'

  const items = await GalleryItem.find(filter).sort({ featured: -1, order: 1, createdAt: -1 }).lean()
  return success(res, items)
}

// ─── GET /api/gallery/:id ─────────────────────────────────────────────────────
export const getItem = async (req, res) => {
  const item = await GalleryItem.findById(req.params.id)
  if (!item) return res.status(404).json({ success: false, message: 'Élément introuvable' })
  return success(res, item)
}

// ─── PATCH /api/gallery/:id ───────────────────────────────────────────────────
export const updateItem = async (req, res) => {
  const item = await GalleryItem.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  )
  if (!item) return res.status(404).json({ success: false, message: 'Élément introuvable' })
  return success(res, item, 'Élément mis à jour')
}

// ─── DELETE /api/gallery/:id ──────────────────────────────────────────────────
export const deleteItem = async (req, res) => {
  const item = await GalleryItem.findById(req.params.id)
  if (!item) return res.status(404).json({ success: false, message: 'Élément introuvable' })

  // Remove images from Cloudinary
  const dels = [item.beforeImage.publicId, item.afterImage.publicId].filter(Boolean)
  await Promise.allSettled(dels.map((pid) => cloudinary.uploader.destroy(pid)))

  await item.deleteOne()
  return success(res, null, 'Élément supprimé')
}
