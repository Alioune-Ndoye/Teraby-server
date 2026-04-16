import { Router } from 'express'
import asyncHandler from '../middleware/asyncHandler.js'
import { teamUpload } from '../config/cloudinary.js'
import {
  createMember, getMembers, getMember, updateMember, deleteMember,
} from '../controllers/teamController.js'

const router = Router()

router.post(   '/',    teamUpload.single('photo'), asyncHandler(createMember))
router.get(    '/',                                asyncHandler(getMembers))
router.get(    '/:id',                             asyncHandler(getMember))
router.put(    '/:id', teamUpload.single('photo'), asyncHandler(updateMember))
router.delete( '/:id',                             asyncHandler(deleteMember))

export default router
