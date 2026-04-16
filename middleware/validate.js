import { validationResult } from 'express-validator'

/**
 * Reads the result of express-validator checks attached to a route and, if
 * there are errors, responds with 422 before the controller runs.
 *
 * Usage:
 *   router.post('/foo', [body('name').notEmpty()], validate, fooController)
 */
const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (errors.isEmpty()) return next()

  return res.status(422).json({
    success: false,
    message: 'Validation failed',
    errors:  errors.array().map((e) => ({ field: e.path, message: e.msg })),
  })
}

export default validate
