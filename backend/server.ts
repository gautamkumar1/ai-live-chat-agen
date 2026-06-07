import 'dotenv/config'
import { createApp, logger } from './src/app'
import { env } from './src/config/env'
import { prisma } from './src/db/client'

async function main() {
  const app = createApp()

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'Server started')
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
