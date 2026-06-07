import { prisma } from '../db/client'

export async function getKnowledgeContext(): Promise<string> {
  const entries = await prisma.knowledgeEntry.findMany({
    orderBy: { category: 'asc' },
  })

  if (entries.length === 0) return ''

  const grouped = entries.reduce<Record<string, string[]>>((acc, e) => {
    acc[e.category] = acc[e.category] ?? []
    acc[e.category].push(`Q: ${e.question}\nA: ${e.answer}`)
    return acc
  }, {})

  const sections = Object.entries(grouped)
    .map(([cat, items]) => `## ${cat.toUpperCase()}\n${items.join('\n\n')}`)
    .join('\n\n')

  return `STORE KNOWLEDGE BASE:\n\n${sections}`
}
