const BASE = import.meta.env.VITE_API_URL ?? ''

export interface Message {
  id: string
  sender: 'user' | 'ai'
  text: string
  createdAt: string
}

export interface SendMessageResponse {
  reply: string
  sessionId: string
}

export interface ConversationResponse {
  id: string
  createdAt: string
  messages: Message[]
}

export async function sendMessage(
  message: string,
  sessionId?: string,
): Promise<SendMessageResponse> {
  const res = await fetch(`${BASE}/chat/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Failed to send message.')
  return data
}

export async function fetchConversation(sessionId: string): Promise<ConversationResponse> {
  const res = await fetch(`${BASE}/chat/${sessionId}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Failed to load conversation.')
  return data
}
