import { useEffect, useRef } from 'react'
import { useChatStore } from '../store/chat.store'
import { sendMessageStream, fetchConversation } from '../lib/api'

export function useChat() {
  const store = useChatStore()
  const abortRef = useRef<AbortController | null>(null)

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

    const userMsgId = crypto.randomUUID()
    const aiMsgId = crypto.randomUUID()

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

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const result = await sendMessageStream(trimmed, useChatStore.getState().sessionId, (token) => {
        useChatStore.getState().appendToMessage(aiMsgId, token)
      }, controller.signal)
      if (!useChatStore.getState().sessionId) store.setSessionId(result.sessionId)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return  // user reset — don't show error
      store.removeMessage(userMsgId)
      store.removeMessage(aiMsgId)
      store.setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      store.setLoading(false)
      abortRef.current = null
    }
  }

  function reset() {
    abortRef.current?.abort()
    abortRef.current = null
    store.reset()
  }

  return { messages: store.messages, isLoading: store.isLoading, error: store.error, send, reset }
}
