import { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'
import { AppError } from '../types'

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const messages = result.error.errors.map((e) => e.message).join(', ')
      return next(new AppError(400, messages))
    }
    req.body = result.data
    next()
  }
}
