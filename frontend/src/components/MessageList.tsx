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

  // While streaming, the last message is the AI bubble being filled in.
  // Show TypingIndicator only until the first token arrives (text is still empty).
  const lastMsg = messages[messages.length - 1]
  const awaitingFirstToken = isLoading && lastMsg?.sender === 'ai' && lastMsg.text === ''

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 py-3 min-h-0"
    >
      {messages.length === 0 && !isLoading && (
        <p className="text-center text-sm text-muted-foreground mt-8">
          Ask anything about shipping, returns, or your order.
        </p>
      )}
      {messages.map((msg) => (
        // Skip the empty streaming placeholder — TypingIndicator shows instead
        (!awaitingFirstToken || msg.id !== lastMsg?.id) && (
          <MessageBubble key={msg.id} message={msg} isStreaming={isLoading && msg.id === lastMsg?.id} />
        )
      ))}
      {awaitingFirstToken && <TypingIndicator />}
    </div>
  )
}
