import { env } from '../config/env'
import { prisma } from '../db/client'
import { getKnowledgeContext } from './knowledge.service'
import { llmProvider, type LLMMessage } from './llm-provider'
import { AppError, type ChatResult } from '../types'

const BASE_SYSTEM_PROMPT = `You are a helpful customer support agent for a small e-commerce store.
Answer questions clearly and concisely. Be friendly but professional.
If you don't know the answer, say so honestly and suggest the customer contact support@ourstore.com.
Never make up information about orders, policies, or pricing not provided to you.`

async function resolveContext(sessionId: string | undefined, userMessage: string) {
  const truncated = userMessage.slice(0, env.MAX_MESSAGE_LENGTH)
  const sanitized = truncated.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim()
  if (!sanitized) throw new AppError(400, 'Message contains no readable content.')

  // Resolve or create conversation
  let conversation = sessionId
    ? await prisma.conversation.findUnique({ where: { id: sessionId } })
    : null
  if (!conversation) conversation = await prisma.conversation.create({ data: {} })

  // Fetch history BEFORE saving the user message so the current turn is not duplicated
  const history = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'desc' },
    take: env.MAX_HISTORY_MESSAGES,
  })
  history.reverse()

  const knowledgeContext = await getKnowledgeContext()
  const systemPrompt = knowledgeContext
    ? `${BASE_SYSTEM_PROMPT}\n\n${knowledgeContext}`
    : BASE_SYSTEM_PROMPT

  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({
      role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.text,
    })),
    { role: 'user', content: sanitized },
  ]

  return { conversation, sanitized, messages }
}

function mapLlmError(err: unknown): never {
  if (err instanceof Error && err.name === 'AbortError') throw err
  const msg = err instanceof Error ? err.message : String(err)
  if (msg.includes('401') || msg.includes('Unauthorized'))
    throw new AppError(502, 'AI service authentication failed. Please contact support.')
  if (msg.includes('429') || msg.includes('rate limit'))
    throw new AppError(429, 'AI service is busy. Please try again in a moment.')
  if (msg.includes('timeout') || msg.includes('ECONNRESET'))
    throw new AppError(504, 'AI service timed out. Please try again.')
  throw new AppError(502, 'AI service unavailable. Please try again later.')
}

export async function generateReply(
  sessionId: string | undefined,
  userMessage: string,
): Promise<ChatResult> {
  const { conversation, sanitized, messages } = await resolveContext(sessionId, userMessage)

  let reply: string
  try {
    reply = await llmProvider.complete(messages)
    if (!reply) reply = 'Sorry, I could not generate a response. Please try again.'
  } catch (err: unknown) {
    mapLlmError(err)
  }

  await prisma.$transaction([
    prisma.message.create({
      data: { conversationId: conversation.id, sender: 'user', text: sanitized },
    }),
    prisma.message.create({
      data: { conversationId: conversation.id, sender: 'ai', text: reply! },
    }),
  ])

  return { reply: reply!, sessionId: conversation.id }
}

export async function generateReplyStream(
  sessionId: string | undefined,
  userMessage: string,
  onToken: (token: string) => void,
  signal?: AbortSignal,
): Promise<{ sessionId: string }> {
  const { conversation, sanitized, messages } = await resolveContext(sessionId, userMessage)

  let fullReply = ''
  try {
    await llmProvider.stream(messages, (token) => {
      fullReply += token
      onToken(token)
    }, signal)
  } catch (err: unknown) {
    mapLlmError(err)
  }

  if (!fullReply) fullReply = 'Sorry, I could not generate a response. Please try again.'

  await prisma.$transaction([
    prisma.message.create({
      data: { conversationId: conversation.id, sender: 'user', text: sanitized },
    }),
    prisma.message.create({
      data: { conversationId: conversation.id, sender: 'ai', text: fullReply },
    }),
  ])

  return { sessionId: conversation.id }
}

export async function getConversationHistory(sessionId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: sessionId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 100,
      },
    },
  })

  if (!conversation) throw new AppError(404, 'Conversation not found.')
  return conversation
}
