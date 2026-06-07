import { Request, Response, NextFunction } from 'express'
import { ZodTypeAny } from 'zod'
import { AppError } from '../types'

export function validate(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const messages = result.error.issues.map((e: { message: string }) => e.message).join(', ')
      return next(new AppError(400, messages))
    }
    req.body = result.data
    next()
  }
}
