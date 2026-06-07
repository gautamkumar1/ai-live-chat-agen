import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
  return new PrismaClient({ adapter })
}

const prisma = createPrismaClient()

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Database schema', () => {
  it('can connect to the database', async () => {
    await expect(prisma.$connect()).resolves.not.toThrow()
  })

  it('conversations table exists and is queryable', async () => {
    const count = await prisma.conversation.count()
    expect(typeof count).toBe('number')
  })

  it('messages table exists and is queryable', async () => {
    const count = await prisma.message.count()
    expect(typeof count).toBe('number')
  })

  it('knowledge_entries table exists and is queryable', async () => {
    const count = await prisma.knowledgeEntry.count()
    expect(typeof count).toBe('number')
  })

  it('can create and delete a conversation with cascaded messages', async () => {
    const conv = await prisma.conversation.create({ data: {} })
    expect(conv.id).toBeTruthy()

    await prisma.message.create({
      data: { conversationId: conv.id, sender: 'user', text: 'hello' },
    })

    // Cascade delete
    await prisma.conversation.delete({ where: { id: conv.id } })
    const msgs = await prisma.message.findMany({ where: { conversationId: conv.id } })
    expect(msgs).toHaveLength(0)
  })
})
