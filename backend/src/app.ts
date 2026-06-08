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
  app.set('trust proxy', 1)

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      hsts: { maxAge: 31536000, includeSubDomains: true },
      noSniff: true,
    }),
  )
  app.use(
    cors({
      origin: env.FRONTEND_URL.replace(/\/$/, ''),
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Accept'],
      credentials: false,
    }),
  )
  app.use(pinoHttp({ logger }))
  app.use(express.json({ limit: '8kb' }))
  app.use(express.urlencoded({ extended: false, limit: '8kb' }))

  app.get('/health', (_req, res) => res.json({ status: 'ok' }))
  app.use('/chat', chatRouter)

  app.use(errorHandler)

  return app
}
