import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

afterAll(async () => {
  try {
    await prisma.$disconnect()
  } catch {
    // ignore
  }
})

describe('Knowledge base seed', () => {
  it('has exactly 8 entries', async () => {
    const count = await prisma.knowledgeEntry.count()
    expect(count).toBe(8)
  })

  it('covers 5 categories: shipping, returns, support, orders, payments', async () => {
    const categories = await prisma.knowledgeEntry.findMany({
      select: { category: true },
      distinct: ['category'],
    })
    const catNames = categories.map((c) => c.category).sort()
    expect(catNames).toEqual(['orders', 'payments', 'returns', 'shipping', 'support'])
  })

  it('has 2 shipping entries', async () => {
    const count = await prisma.knowledgeEntry.count({ where: { category: 'shipping' } })
    expect(count).toBe(2)
  })

  it('has 2 returns entries', async () => {
    const count = await prisma.knowledgeEntry.count({ where: { category: 'returns' } })
    expect(count).toBe(2)
  })

  it('every entry has non-empty question and answer', async () => {
    const entries = await prisma.knowledgeEntry.findMany()
    for (const entry of entries) {
      expect(entry.question.length).toBeGreaterThan(0)
      expect(entry.answer.length).toBeGreaterThan(0)
    }
  })

  it('seed is idempotent: running deleteMany+createMany twice keeps count at 8', async () => {
    // Simulate what seed.ts does
    await prisma.knowledgeEntry.deleteMany()
    // After delete, count should be 0
    const emptyCount = await prisma.knowledgeEntry.count()
    expect(emptyCount).toBe(0)
    // Re-run the seed
    await import('child_process').then(({ execSync }) =>
      execSync('npx tsx prisma/seed.ts', {
        cwd: '/Users/mac/Desktop/coding/ai-live-chat-agent/backend',
        stdio: 'inherit',
      })
    )
    const finalCount = await prisma.knowledgeEntry.count()
    expect(finalCount).toBe(8)
  })
})
