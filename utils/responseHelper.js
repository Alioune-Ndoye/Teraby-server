/**
 * Standardised JSON response helpers.
 * Every controller uses these so the frontend always sees a consistent shape:
 *   { success, message, data?, meta? }
 */

export const success = (res, data = null, message = 'OK', statusCode = 200, meta = null) => {
  const body = { success: true, message }
  if (data !== null) body.data = data
  if (meta !== null) body.meta = meta
  return res.status(statusCode).json(body)
}

export const created = (res, data = null, message = 'Created') =>
  success(res, data, message, 201)

export const error = (res, message = 'Error', statusCode = 400, errors = null) => {
  const body = { success: false, message }
  if (errors) body.errors = errors
  return res.status(statusCode).json(body)
}

export const paginate = (res, data, total, page, limit, message = 'OK') =>
  success(res, data, message, 200, {
    total,
    page:       Number(page),
    limit:      Number(limit),
    totalPages: Math.ceil(total / limit),
  })
