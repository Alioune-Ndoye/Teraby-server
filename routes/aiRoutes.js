import { Router } from 'express'
import { body } from 'express-validator'
import rateLimit from 'express-rate-limit'
import asyncHandler from '../middleware/asyncHandler.js'
import validate from '../middleware/validate.js'
import { chatHandler, getSessions, getSession } from '../controllers/aiController.js'

const router = Router()

// Tighter rate limit for AI endpoint
const aiLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      Number(process.env.AI_RATE_LIMIT_MAX) || 30,
  message:  { success: false, message: 'Trop de requêtes AI. Réessayez dans 15 minutes.' },
})

router.post(
  '/chat',
  aiLimit,
  [body('message').trim().notEmpty().withMessage('message is required')],
  validate,
  asyncHandler(chatHandler)
)

router.get('/sessions',           asyncHandler(getSessions))
router.get('/sessions/:sessionId', asyncHandler(getSession))

export default router
