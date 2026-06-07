import { useEffect, useRef } from 'react'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import type { Message } from '@/lib/api'

interface Props {
  messages: Message[]
  isLoading: boolean
}

export function MessageList({ messages, isLoading }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const lastMsg = messages[messages.length - 1]
  const awaitingFirstToken = isLoading && lastMsg?.sender === 'ai' && lastMsg.text === ''

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 px-5 py-5">
      {messages.length === 0 && !isLoading && (
        <div className="h-full flex flex-col items-center justify-center gap-2 select-none">
          <span style={{ color: 'var(--text-muted)', fontSize: 11, letterSpacing: '0.12em' }}>
            SUPPORT_AGENT v1.0
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
            ask about shipping, returns, or your order
          </span>
        </div>
      )}
      {messages.map((msg) =>
        (!awaitingFirstToken || msg.id !== lastMsg?.id) ? (
          <MessageBubble
            key={msg.id}
            message={msg}
            isStreaming={isLoading && msg.id === lastMsg?.id}
          />
        ) : null
      )}
      {awaitingFirstToken && <TypingIndicator />}
    </div>
  )
}
