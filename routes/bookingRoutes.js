import { Router } from 'express'
import { body, param } from 'express-validator'
import asyncHandler from '../middleware/asyncHandler.js'
import validate from '../middleware/validate.js'
import {
  createBooking,
  getBookings,
  getBooking,
  updateStatus,
  updateBooking,
  deleteBooking,
} from '../controllers/bookingController.js'

const router = Router()

// Shared validators
const bookingId = param('id').isMongoId().withMessage('Invalid booking ID')

const bookingBody = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('serviceType').isIn(['residential', 'deep', 'move', 'commercial']).withMessage('Invalid service type'),
  body('date').isISO8601().withMessage('Valid date required'),
  body('time').trim().notEmpty().withMessage('Time is required'),
  body('address').trim().notEmpty().withMessage('Address is required'),
]

router.post(   '/',              bookingBody, validate, asyncHandler(createBooking))
router.get(    '/',                                     asyncHandler(getBookings))
router.get(    '/:id',           [bookingId], validate, asyncHandler(getBooking))
router.patch(  '/:id/status',    [bookingId,
  body('status').isIn(['accepted', 'declined', 'completed']).withMessage('Invalid status'),
], validate, asyncHandler(updateStatus))
router.put(    '/:id',           [bookingId], validate, asyncHandler(updateBooking))
router.delete( '/:id',           [bookingId], validate, asyncHandler(deleteBooking))

export default router
