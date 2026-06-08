import 'dotenv/config'
import { createApp, logger } from './src/app'
import { env } from './src/config/env'
import { prisma } from './src/db/client'

function startSelfPing() {
  if (env.NODE_ENV !== 'production') return
  if (!env.RENDER_EXTERNAL_URL) return
  const url = `${env.RENDER_EXTERNAL_URL}/health`
  setInterval(async () => {
    try {
      await fetch(url)
    } catch {
      // ignore — server may be restarting
    }
  }, 14 * 60 * 1000) // every 14 minutes
}

async function main() {
  const app = createApp()

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'Server started')
    startSelfPing()
  })

  async function shutdown() {
    logger.info('Shutting down...')
    server.close(async () => {
      await prisma.$disconnect()
      logger.info('Shutdown complete')
      process.exit(0)
    })
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

main().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
