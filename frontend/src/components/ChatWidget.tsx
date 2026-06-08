import { useState, useEffect } from 'react'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { useChat } from '@/hooks/useChat'
import { RotateCcw } from 'lucide-react'

const BASE = import.meta.env.VITE_API_URL ?? ''

function friendlyError(raw: string): string {
  if (raw.toLowerCase().includes('busy') || raw.toLowerCase().includes('rate limit')) {
    return 'AI service is busy. Please wait a moment and try again.'
  }
  if (raw.toLowerCase().includes('timed out') || raw.toLowerCase().includes('timeout')) {
    return 'Request timed out. Please check your connection and try again.'
  }
  if (raw.toLowerCase().includes('streaming not supported')) {
    return 'Your browser does not support streaming. Please try a different browser.'
  }
  return 'Something went wrong. Please try again.'
}

export function ChatWidget() {
  const { messages, isLoading, error, send, reset } = useChat()
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const res = await fetch(`${BASE}/health`)
        if (!cancelled) setIsOnline(res.ok)
      } catch {
        if (!cancelled) setIsOnline(false)
      }
    }
    check()
    const id = setInterval(check, 30_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

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
              color: isOnline ? 'var(--accent)' : 'var(--error)',
              letterSpacing: '0.1em',
              opacity: 0.8,
            }}
          >
            {isOnline ? '[online]' : '[offline]'}
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
      <MessageList messages={messages} isLoading={isLoading} onSend={send} />

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
          {`// ${friendlyError(error)}`}
        </div>
      )}

      {/* Input */}
      <ChatInput onSend={send} disabled={isLoading} />
    </div>
  )
}
