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
  async (req, res) => {
    const { message, sessionId } = req.body as z.infer<typeof sendMessageSchema>

    const controller = new AbortController()
    req.on('close', () => controller.abort())

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    // Disable Nagle algorithm so each write flushes immediately
    const socket = req.socket
    socket.setNoDelay(true)

    function send(payload: object) {
      res.write(`data: ${JSON.stringify(payload)}\n\n`)
    }

    try {
      const result = await generateReplyStream(sessionId, message, (token) => {
        send({ token })
      }, controller.signal)
      send({ done: true, sessionId: result.sessionId })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // client disconnected — nothing to send
      } else {
        send({ error: err instanceof Error ? err.message : 'Stream failed.' })
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
