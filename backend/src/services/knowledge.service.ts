import { prisma } from '../db/client'

let cachedContext: string | null = null
let cacheExpiresAt = 0

export async function getKnowledgeContext(): Promise<string> {
  if (cachedContext !== null && Date.now() < cacheExpiresAt) return cachedContext

  const entries = await prisma.knowledgeEntry.findMany({
    orderBy: { category: 'asc' },
  })

  if (entries.length === 0) {
    cachedContext = ''
    cacheExpiresAt = Date.now() + 5 * 60 * 1000
    return ''
  }

  const grouped = entries.reduce<Record<string, string[]>>((acc, e) => {
    acc[e.category] = acc[e.category] ?? []
    acc[e.category].push(`Q: ${e.question}\nA: ${e.answer}`)
    return acc
  }, {})

  const sections = Object.entries(grouped)
    .map(([cat, items]) => `## ${cat.toUpperCase()}\n${items.join('\n\n')}`)
    .join('\n\n')

  cachedContext = `STORE KNOWLEDGE BASE:\n\n${sections}`
  cacheExpiresAt = Date.now() + 5 * 60 * 1000
  return cachedContext
}
