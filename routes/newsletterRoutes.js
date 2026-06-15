import express from 'express'
import Newsletter from '../models/Newsletter.js'
import asyncHandler from '../middleware/asyncHandler.js'

const router = express.Router()

// POST /api/newsletter — subscribe an email
router.post('/', asyncHandler(async (req, res) => {
  const { email, source = 'footer' } = req.body

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Email invalide.' })
  }

  const existing = await Newsletter.findOne({ email: email.toLowerCase().trim() })
  if (existing) {
    return res.status(409).json({ success: false, message: 'Cet email est déjà inscrit.' })
  }

  await Newsletter.create({ email: email.toLowerCase().trim(), source })
  res.status(201).json({ success: true, message: 'Inscription confirmée !' })
}))

// GET /api/newsletter — list all subscribers (for admin use)
router.get('/', asyncHandler(async (req, res) => {
  const subscribers = await Newsletter.find({ active: true }).sort({ createdAt: -1 })
  res.json({ success: true, count: subscribers.length, data: subscribers })
}))

export default router
