/**
 * Wraps an async route handler and forwards any thrown error to Express's
 * next() — eliminating try/catch boilerplate in every controller.
 *
 * Usage:
 *   router.get('/foo', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

export default asyncHandler
