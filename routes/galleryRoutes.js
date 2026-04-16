import { Router } from 'express'
import asyncHandler from '../middleware/asyncHandler.js'
import { galleryUpload } from '../config/cloudinary.js'
import {
  createItem, getItems, getItem, updateItem, deleteItem,
} from '../controllers/galleryController.js'

const router = Router()

// Accept two image fields: beforeImage + afterImage
const uploadFields = galleryUpload.fields([
  { name: 'beforeImage', maxCount: 1 },
  { name: 'afterImage',  maxCount: 1 },
])

router.post(   '/',    uploadFields, asyncHandler(createItem))
router.get(    '/',                  asyncHandler(getItems))
router.get(    '/:id',               asyncHandler(getItem))
router.patch(  '/:id',               asyncHandler(updateItem))
router.delete( '/:id',               asyncHandler(deleteItem))

export default router
