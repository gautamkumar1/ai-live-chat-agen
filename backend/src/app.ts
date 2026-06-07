import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import pino from 'pino'
import pinoHttp from 'pino-http'
import { env } from './config/env'
import { chatRouter } from './routes/chat.router'
import { errorHandler } from './middleware/error-handler'

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
})

export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type'],
      credentials: false,
    }),
  )
  app.use(pinoHttp({ logger }))
  app.use(express.json({ limit: '16kb' }))

  app.get('/health', (_req, res) => res.json({ status: 'ok' }))
  app.use('/chat', chatRouter)

  app.use(errorHandler)

  return app
}
