import { Request, Response, NextFunction } from 'express'
import { AppError } from '../types'
import { logger } from '../app'

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message })
  }

  logger.error({ err, path: req.path }, 'Unhandled error')
  res.status(500).json({ error: 'An unexpected error occurred. Please try again.' })
}
