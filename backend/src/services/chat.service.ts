import OpenAI from 'openai'
import { env } from '../config/env'
import { prisma } from '../db/client'
import { getKnowledgeContext } from './knowledge.service'
import { AppError, type ChatResult } from '../types'

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

const BASE_SYSTEM_PROMPT = `You are a helpful customer support agent for a small e-commerce store.
Answer questions clearly and concisely. Be friendly but professional.
If you don't know the answer, say so honestly and suggest the customer contact support@ourstore.com.
Never make up information about orders, policies, or pricing not provided to you.`

export async function generateReply(
  sessionId: string | undefined,
  userMessage: string,
): Promise<ChatResult> {
  const truncatedMessage = userMessage.slice(0, env.MAX_MESSAGE_LENGTH)
  const sanitized = truncatedMessage.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim()
  if (!sanitized) throw new AppError(400, 'Message contains no readable content.')
  const finalMessage = sanitized

  // Resolve or create conversation
  let conversation = sessionId
    ? await prisma.conversation.findUnique({ where: { id: sessionId } })
    : null

  if (!conversation) {
    conversation = await prisma.conversation.create({ data: {} })
  }

  // Persist user message
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      sender: 'user',
      text: finalMessage,
    },
  })

  // Fetch recent history (excluding the message we just saved)
  const history = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'asc' },
    take: env.MAX_HISTORY_MESSAGES,
  })

  const knowledgeContext = await getKnowledgeContext()
  const systemPrompt = knowledgeContext
    ? `${BASE_SYSTEM_PROMPT}\n\n${knowledgeContext}`
    : BASE_SYSTEM_PROMPT

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({
      role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.text,
    })),
  ]

  let reply: string
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 512,
      temperature: 0.4,
    })
    reply = completion.choices[0]?.message?.content?.trim() ?? 'Sorry, I could not generate a response. Please try again.'
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('401') || message.includes('Unauthorized')) {
      throw new AppError(502, 'AI service authentication failed. Please contact support.')
    }
    if (message.includes('429') || message.includes('rate limit')) {
      throw new AppError(429, 'AI service is busy. Please try again in a moment.')
    }
    if (message.includes('timeout') || message.includes('ECONNRESET')) {
      throw new AppError(504, 'AI service timed out. Please try again.')
    }
    throw new AppError(502, 'AI service unavailable. Please try again later.')
  }

  // Persist AI reply
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      sender: 'ai',
      text: reply,
    },
  })

  return { reply, sessionId: conversation.id }
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
