import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../middleware/validate'
import { chatRateLimiter } from '../middleware/rate-limiter'
import { generateReply, getConversationHistory } from '../services/chat.service'
import { env } from '../config/env'

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

chatRouter.get('/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params
    const conversation = await getConversationHistory(sessionId)
    res.json(conversation)
  } catch (err) {
    next(err)
  }
})
