import { Router } from 'express'
import asyncHandler from '../middleware/asyncHandler.js'
import { getDay, getWeek, getMonth, getAvailability } from '../controllers/scheduleController.js'

const router = Router()

router.get('/day',          asyncHandler(getDay))
router.get('/week',         asyncHandler(getWeek))
router.get('/month',        asyncHandler(getMonth))
router.get('/availability', asyncHandler(getAvailability))

export default router
