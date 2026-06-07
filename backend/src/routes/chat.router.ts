import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../middleware/validate'
import { chatRateLimiter } from '../middleware/rate-limiter'
import { generateReply, generateReplyStream, getConversationHistory } from '../services/chat.service'
import { env } from '../config/env'
import { AppError } from '../types'

export const chatRouter = Router()

const sendMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty.')
    .max(env.MAX_MESSAGE_LENGTH, `Message cannot exceed ${env.MAX_MESSAGE_LENGTH} characters.`),
  sessionId: z.string().cuid().optional(),
})

chatRouter.post(
  '/message',
  chatRateLimiter,
  validate(sendMessageSchema),
  async (req, res, next) => {
    try {
      const { message, sessionId } = req.body as z.infer<typeof sendMessageSchema>
      const result = await generateReply(sessionId, message)
      res.json(result)
    } catch (err) {
      next(err)
    }
  },
)

// POST /chat/stream — SSE streaming endpoint
chatRouter.post(
  '/stream',
  chatRateLimiter,
  validate(sendMessageSchema),
  async (req, res, next) => {
    const { message, sessionId } = req.body as z.infer<typeof sendMessageSchema>

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    try {
      const result = await generateReplyStream(sessionId, message, (token) => {
        res.write(`data: ${JSON.stringify({ token })}\n\n`)
      })
      res.write(`data: ${JSON.stringify({ done: true, sessionId: result.sessionId })}\n\n`)
    } catch (err) {
      if (err instanceof Error) {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
      }
    } finally {
      res.end()
    }
  },
)

const sessionIdSchema = z.object({ sessionId: z.string().cuid() })

chatRouter.get('/:sessionId', chatRateLimiter, async (req, res, next) => {
  try {
    const parsed = sessionIdSchema.safeParse(req.params)
    if (!parsed.success) return next(new AppError(400, 'Invalid session ID format.'))
    const conversation = await getConversationHistory(parsed.data.sessionId)
    res.json(conversation)
  } catch (err) {
    next(err)
  }
})
