import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { useChat } from '@/hooks/useChat'
import { RotateCcw } from 'lucide-react'

export function ChatWidget() {
  const { messages, isLoading, error, send, reset } = useChat()

  return (
    <div
      className="flex flex-col h-full w-full"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3">
          {/* status dot */}
          <span
            className="inline-block"
            style={{
              width: 6,
              height: 6,
              background: 'var(--accent)',
              boxShadow: '0 0 6px var(--accent)',
              borderRadius: '50%',
            }}
          />
          <span
            className="font-medium tracking-widest uppercase"
            style={{ fontSize: 10, color: 'var(--text-soft)', letterSpacing: '0.18em' }}
          >
            Support&nbsp;Agent
          </span>
          <span
            style={{
              fontSize: 10,
              color: 'var(--accent)',
              letterSpacing: '0.1em',
              opacity: 0.8,
            }}
          >
            [online]
          </span>
        </div>

        <button
          onClick={reset}
          title="New conversation"
          aria-label="New conversation"
          className="flex items-center justify-center transition-colors"
          style={{
            width: 24,
            height: 24,
            color: 'var(--text-muted)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <RotateCcw size={12} strokeWidth={2} />
        </button>
      </div>

      {/* Messages */}
      <MessageList messages={messages} isLoading={isLoading} />

      {/* Error */}
      {error && (
        <div
          className="px-5 py-2 text-[11px] shrink-0"
          style={{
            color: 'var(--error)',
            borderTop: '1px solid rgba(255,68,68,0.2)',
            background: 'rgba(255,68,68,0.04)',
          }}
        >
          {`// error: ${error}`}
        </div>
      )}

      {/* Input */}
      <ChatInput onSend={send} disabled={isLoading} />
    </div>
  )
}
