import { useEffect, useRef } from 'react'
import { useChatStore } from '../store/chat.store'
import { sendMessage, fetchConversation } from '../lib/api'

export function useChat() {
  const store = useChatStore()
  const initialized = useRef(false)

  // Restore session on mount
  useEffect(() => {
    if (initialized.current || !store.sessionId) return
    initialized.current = true

    fetchConversation(store.sessionId)
      .then((conv) => store.setMessages(conv.messages))
      .catch(() => store.reset())
  }, [])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || store.isLoading) return

    const optimistic = {
      id: `temp-${Date.now()}`,
      sender: 'user' as const,
      text: trimmed,
      createdAt: new Date().toISOString(),
    }

    store.addMessage(optimistic)
    store.setLoading(true)
    store.setError(null)

    try {
      const result = await sendMessage(trimmed, store.sessionId)
      if (!store.sessionId) store.setSessionId(result.sessionId)

      store.addMessage({
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: result.reply,
        createdAt: new Date().toISOString(),
      })
    } catch (err) {
      store.setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      store.setLoading(false)
    }
  }

  return { messages: store.messages, isLoading: store.isLoading, error: store.error, send, reset: store.reset }
}
