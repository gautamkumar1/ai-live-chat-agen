import { useEffect, useRef } from 'react'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import type { Message } from '@/lib/api'

interface Props {
  messages: Message[]
  isLoading: boolean
  onSend: (text: string) => void
}

const PROMPT_CHIPS = [
  "Where's my order?",
  "How do I return an item?",
  "What are your shipping options?",
  "What payment methods do you accept?",
]

export function MessageList({ messages, isLoading, onSend }: Props) {
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
        <div className="h-full flex flex-col items-center justify-center gap-4 select-none">
          <span style={{ color: 'var(--text-muted)', fontSize: 11, letterSpacing: '0.12em' }}>
            SUPPORT_AGENT v1.0
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
            ask about shipping, returns, or your order
          </span>
          <div className="flex flex-wrap gap-2 justify-center mt-1">
            {PROMPT_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => onSend(chip)}
                style={{
                  fontSize: 11,
                  color: 'var(--accent)',
                  border: '1px solid var(--accent)',
                  background: 'transparent',
                  padding: '3px 10px',
                  cursor: 'pointer',
                  letterSpacing: '0.05em',
                  opacity: 0.75,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.75')}
              >
                {chip}
              </button>
            ))}
          </div>
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
