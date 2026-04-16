import TeamMember from '../models/TeamMember.js'
import { cloudinary } from '../config/cloudinary.js'
import { success, created } from '../utils/responseHelper.js'

// ─── POST /api/team ───────────────────────────────────────────────────────────
export const createMember = async (req, res) => {
  const photo = req.file
  const member = await TeamMember.create({
    ...req.body,
    specialties: req.body.specialties
      ? JSON.parse(req.body.specialties)
      : [],
    ...(photo && {
      photo: { url: photo.path, publicId: photo.filename },
    }),
  })
  return created(res, member, 'Membre créé')
}

// ─── GET /api/team ────────────────────────────────────────────────────────────
export const getMembers = async (req, res) => {
  const filter = {}
  if (req.query.active !== undefined) filter.active = req.query.active === 'true'
  const members = await TeamMember.find(filter).sort({ order: 1, createdAt: -1 }).lean()
  return success(res, members)
}

// ─── GET /api/team/:id ────────────────────────────────────────────────────────
export const getMember = async (req, res) => {
  const member = await TeamMember.findById(req.params.id)
  if (!member) return res.status(404).json({ success: false, message: 'Membre introuvable' })
  return success(res, member)
}

// ─── PUT /api/team/:id ────────────────────────────────────────────────────────
export const updateMember = async (req, res) => {
  const photo = req.file
  const update = {
    ...req.body,
    ...(req.body.specialties && { specialties: JSON.parse(req.body.specialties) }),
    ...(photo && { photo: { url: photo.path, publicId: photo.filename } }),
  }

  // Delete old photo if a new one is uploaded
  if (photo) {
    const old = await TeamMember.findById(req.params.id).select('photo').lean()
    if (old?.photo?.publicId) {
      cloudinary.uploader.destroy(old.photo.publicId).catch(() => {})
    }
  }

  const member = await TeamMember.findByIdAndUpdate(
    req.params.id,
    { $set: update },
    { new: true, runValidators: true }
  )
  if (!member) return res.status(404).json({ success: false, message: 'Membre introuvable' })
  return success(res, member, 'Membre mis à jour')
}

// ─── DELETE /api/team/:id ─────────────────────────────────────────────────────
export const deleteMember = async (req, res) => {
  const member = await TeamMember.findById(req.params.id)
  if (!member) return res.status(404).json({ success: false, message: 'Membre introuvable' })
  if (member.photo?.publicId) {
    cloudinary.uploader.destroy(member.photo.publicId).catch(() => {})
  }
  await member.deleteOne()
  return success(res, null, 'Membre supprimé')
}
