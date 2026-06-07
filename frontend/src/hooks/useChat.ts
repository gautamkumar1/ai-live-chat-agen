import { useEffect } from 'react'
import { useChatStore } from '../store/chat.store'
import { sendMessageStream, fetchConversation } from '../lib/api'

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

    const userMsgId = `user-${Date.now()}`
    const aiMsgId = `ai-${Date.now()}`

    store.addMessage({
      id: userMsgId,
      sender: 'user',
      text: trimmed,
      createdAt: new Date().toISOString(),
    })
    // Add empty AI bubble immediately — tokens stream into it
    store.addMessage({
      id: aiMsgId,
      sender: 'ai',
      text: '',
      createdAt: new Date().toISOString(),
    })
    store.setLoading(true)
    store.setError(null)

    try {
      const result = await sendMessageStream(trimmed, useChatStore.getState().sessionId, (token) => {
        useChatStore.getState().appendToMessage(aiMsgId, token)
      })
      if (!useChatStore.getState().sessionId) store.setSessionId(result.sessionId)
    } catch (err) {
      store.removeMessage(userMsgId)
      store.removeMessage(aiMsgId)
      store.setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      store.setLoading(false)
    }
  }

  return { messages: store.messages, isLoading: store.isLoading, error: store.error, send, reset: store.reset }
}
