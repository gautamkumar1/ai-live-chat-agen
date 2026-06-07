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

export async function sendMessageStream(
  message: string,
  sessionId: string | undefined,
  onToken: (token: string) => void,
): Promise<{ sessionId: string }> {
  const res = await fetch(`${BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error ?? 'Failed to start stream.')
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let resolvedSessionId = sessionId ?? ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const payload = JSON.parse(line.slice(6)) as {
        token?: string
        done?: boolean
        sessionId?: string
        error?: string
      }
      if (payload.error) throw new Error(payload.error)
      if (payload.token) {
        onToken(payload.token)
        // yield to the microtask queue so React can paint each token
        await Promise.resolve()
      }
      if (payload.done && payload.sessionId) resolvedSessionId = payload.sessionId
    }
  }

  return { sessionId: resolvedSessionId }
}

export async function fetchConversation(sessionId: string): Promise<ConversationResponse> {
  const res = await fetch(`${BASE}/chat/${sessionId}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Failed to load conversation.')
  return data
}
