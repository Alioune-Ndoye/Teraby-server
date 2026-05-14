import ServiceBackground from '../models/ServiceBackground.js'
import { cloudinary } from '../config/cloudinary.js'
import { success } from '../utils/responseHelper.js'

// ─── GET /api/service-backgrounds ────────────────────────────────────────────
export const getBackgrounds = async (req, res) => {
  const backgrounds = await ServiceBackground.find().lean()
  return success(res, backgrounds)
}

// ─── GET /api/service-backgrounds/:serviceType ────────────────────────────────
export const getBackground = async (req, res) => {
  const bg = await ServiceBackground.findOne({ serviceType: req.params.serviceType }).lean()
  if (!bg) return res.status(404).json({ success: false, message: 'Fond introuvable' })
  return success(res, bg)
}

// ─── PUT /api/service-backgrounds/:serviceType ───────────────────────────────
export const upsertBackground = async (req, res) => {
  const { serviceType } = req.params
  const file = req.file

  if (!file) {
    return res.status(400).json({ success: false, message: 'Aucun fichier fourni' })
  }

  // Delete old Cloudinary image if one exists
  const existing = await ServiceBackground.findOne({ serviceType }).lean()
  if (existing?.backgroundImage?.publicId) {
    cloudinary.uploader.destroy(existing.backgroundImage.publicId).catch(() => {})
  }

  const bg = await ServiceBackground.findOneAndUpdate(
    { serviceType },
    { $set: { backgroundImage: { url: file.path, publicId: file.filename } } },
    { new: true, upsert: true, runValidators: true }
  )
  return success(res, bg, 'Fond mis à jour')
}

// ─── DELETE /api/service-backgrounds/:serviceType ────────────────────────────
export const deleteBackground = async (req, res) => {
  const bg = await ServiceBackground.findOne({ serviceType: req.params.serviceType })
  if (!bg) return res.status(404).json({ success: false, message: 'Fond introuvable' })
  if (bg.backgroundImage?.publicId) {
    cloudinary.uploader.destroy(bg.backgroundImage.publicId).catch(() => {})
  }
  await bg.deleteOne()
  return success(res, null, 'Fond supprimé')
}
