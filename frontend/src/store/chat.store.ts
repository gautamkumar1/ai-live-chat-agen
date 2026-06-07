import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Message } from '../lib/api'

interface ChatState {
  sessionId: string | undefined
  messages: Message[]
  isLoading: boolean
  error: string | null
  setSessionId: (id: string) => void
  addMessage: (msg: Message) => void
  setMessages: (msgs: Message[]) => void
  removeMessage: (id: string) => void
  setLoading: (v: boolean) => void
  setError: (e: string | null) => void
  reset: () => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      sessionId: undefined,
      messages: [],
      isLoading: false,
      error: null,
      setSessionId: (id) => set({ sessionId: id }),
      addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
      setMessages: (msgs) => set({ messages: msgs }),
      removeMessage: (id) => set((s) => ({ messages: s.messages.filter((m) => m.id !== id) })),
      setLoading: (v) => set({ isLoading: v }),
      setError: (e) => set({ error: e }),
      reset: () => set({ sessionId: undefined, messages: [], error: null, isLoading: false }),
    }),
    {
      name: 'chat-session',
      partialize: (s) => ({ sessionId: s.sessionId }),
    },
  ),
)
