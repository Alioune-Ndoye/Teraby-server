import { Router } from 'express'
import { body } from 'express-validator'
import asyncHandler from '../middleware/asyncHandler.js'
import validate from '../middleware/validate.js'
import { sendMessage, webhook } from '../controllers/whatsappController.js'

const router = Router()

router.post(
  '/send',
  [
    body('to').trim().notEmpty().withMessage('to is required'),
    body('message').trim().notEmpty().withMessage('message is required'),
  ],
  validate,
  asyncHandler(sendMessage)
)

// Twilio webhook — raw urlencoded body parsed in server.js before this route
router.post('/webhook', asyncHandler(webhook))

export default router
