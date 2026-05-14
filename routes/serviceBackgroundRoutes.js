import { Router } from 'express'
import asyncHandler from '../middleware/asyncHandler.js'
import { serviceBackgroundUpload } from '../config/cloudinary.js'
import {
  getBackgrounds,
  getBackground,
  upsertBackground,
  deleteBackground,
} from '../controllers/serviceBackgroundController.js'

const router = Router()

router.get(    '/',              asyncHandler(getBackgrounds))
router.get(    '/:serviceType',  asyncHandler(getBackground))
router.put(    '/:serviceType',  serviceBackgroundUpload.single('image'), asyncHandler(upsertBackground))
router.delete( '/:serviceType',  asyncHandler(deleteBackground))

export default router
