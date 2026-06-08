import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { Send } from 'lucide-react'

interface Props {
  onSend: (text: string) => void
  disabled: boolean
}

export function ChatInput({ onSend, disabled }: Props) {
  const MAX_LENGTH = Number(import.meta.env.VITE_MAX_MESSAGE_LENGTH ?? 2000)
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-grow textarea up to ~5 lines, then scroll
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [value])

  function handleSend() {
    if (!value.trim() || disabled) return
    onSend(value.trim())
    setValue('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const nearLimit = value.length > Math.round(MAX_LENGTH * 0.9)
  const atLimit = value.length >= MAX_LENGTH

  return (
    <div
      style={{
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-input)',
      }}
    >
      <div className="flex items-center gap-2 px-4 py-3">
        {/* terminal prompt */}
        <span
          className="shrink-0 select-none font-semibold"
          style={{ color: 'var(--accent)', fontSize: 13 }}
        >
          &gt;
        </span>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="type a message…"
          disabled={disabled}
          maxLength={MAX_LENGTH}
          aria-label="Chat message input"
          rows={1}
          className="flex-1 bg-transparent outline-none border-none"
          style={{
            color: 'var(--text)',
            fontFamily: 'inherit',
            fontSize: 13,
            lineHeight: 1.6,
            caretColor: 'var(--accent)',
            resize: 'none',
            overflow: 'auto',
          }}
        />

        {/* char counter — only visible when approaching limit */}
        {value.length > 0 && (
          <span
            className="shrink-0 text-[11px] tabular-nums transition-colors"
            style={{ color: atLimit ? 'var(--error)' : nearLimit ? '#ff9933' : 'var(--text-muted)' }}
          >
            {value.length}/{MAX_LENGTH}
          </span>
        )}

        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          className="shrink-0 flex items-center justify-center transition-opacity"
          style={{
            width: 28,
            height: 28,
            background: disabled || !value.trim() ? 'transparent' : 'var(--accent)',
            color: disabled || !value.trim() ? 'var(--text-muted)' : '#000',
            border: disabled || !value.trim() ? '1px solid var(--border-mid)' : 'none',
            cursor: disabled || !value.trim() ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.4 : 1,
          }}
        >
          <Send size={12} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
