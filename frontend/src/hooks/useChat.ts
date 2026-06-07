import { useEffect } from 'react'
import { useChatStore } from '../store/chat.store'
import { sendMessage, fetchConversation } from '../lib/api'

export function useChat() {
  const store = useChatStore()

  // Restore session after persist middleware finishes rehydrating from localStorage
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const unsub = useChatStore.persist.onFinishHydration(() => {
      const { sessionId } = useChatStore.getState()
      if (!sessionId) return
      fetchConversation(sessionId)
        .then((conv) => useChatStore.getState().setMessages(conv.messages))
        .catch(() => useChatStore.getState().reset())
    })
    return unsub
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
      store.removeMessage(optimistic.id)
      store.setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      store.setLoading(false)
    }
  }

  return { messages: store.messages, isLoading: store.isLoading, error: store.error, send, reset: store.reset }
}
