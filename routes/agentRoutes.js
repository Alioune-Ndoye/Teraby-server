import { Router } from 'express'
import { body } from 'express-validator'
import asyncHandler from '../middleware/asyncHandler.js'
import validate from '../middleware/validate.js'
import { runAgentHandler, getLogs, getLog } from '../controllers/agentController.js'

const router = Router()

router.post(
  '/run',
  [
    body('agentName').isIn(['CustomerSupport', 'BookingAssistant', 'Operations']).withMessage('Invalid agent name'),
    body('task').trim().notEmpty().withMessage('task is required'),
  ],
  validate,
  asyncHandler(runAgentHandler)
)

router.get('/logs',     asyncHandler(getLogs))
router.get('/logs/:id', asyncHandler(getLog))

export default router
