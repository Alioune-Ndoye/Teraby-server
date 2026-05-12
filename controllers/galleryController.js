import GalleryItem from '../models/GalleryItem.js'
import { cloudinary } from '../config/cloudinary.js'
import { success, created } from '../utils/responseHelper.js'

// ─── POST /api/gallery ────────────────────────────────────────────────────────
export const createItem = async (req, res) => {
  const files    = req.files || {}
  const category = req.body.category || 'avant-apres'

  let imageData = {}

  if (category === 'avant-apres') {
    if (!files.beforeImage?.[0] || !files.afterImage?.[0]) {
      return res.status(400).json({
        success: false,
        message: 'beforeImage and afterImage files are required for avant-apres',
      })
    }
    imageData = {
      beforeImage: { url: files.beforeImage[0].path, publicId: files.beforeImage[0].filename },
      afterImage:  { url: files.afterImage[0].path,  publicId: files.afterImage[0].filename },
    }
  } else {
    if (!files.image?.[0]) {
      return res.status(400).json({
        success: false,
        message: 'image file is required',
      })
    }
    imageData = {
      image: { url: files.image[0].path, publicId: files.image[0].filename },
    }
  }

  const item = await GalleryItem.create({ ...req.body, ...imageData })
  return created(res, item, 'Élément galerie créé')
}

// ─── GET /api/gallery ─────────────────────────────────────────────────────────
export const getItems = async (req, res) => {
  const { category, serviceType, featured } = req.query
  const filter = {}
  if (category)              filter.category    = category
  if (serviceType)           filter.serviceType = serviceType
  if (featured !== undefined) filter.featured   = featured === 'true'

  const items = await GalleryItem.find(filter)
    .sort({ featured: -1, order: 1, createdAt: -1 })
    .lean()
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

  const pids = [
    item.image?.publicId,
    item.beforeImage?.publicId,
    item.afterImage?.publicId,
  ].filter(Boolean)
  await Promise.allSettled(pids.map((pid) => cloudinary.uploader.destroy(pid)))

  await item.deleteOne()
  return success(res, null, 'Élément supprimé')
}
