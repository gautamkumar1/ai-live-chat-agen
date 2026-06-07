import { useState, useRef, KeyboardEvent } from 'react'
import { Send } from 'lucide-react'

interface Props {
  onSend: (text: string) => void
  disabled: boolean
}

export function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSend() {
    if (!value.trim() || disabled) return
    onSend(value.trim())
    setValue('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const nearLimit = value.length > 1800
  const atLimit = value.length >= 2000

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

        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="type a message…"
          disabled={disabled}
          maxLength={2000}
          aria-label="Chat message input"
          className="flex-1 bg-transparent outline-none border-none"
          style={{
            color: 'var(--text)',
            fontFamily: 'inherit',
            fontSize: 13,
            lineHeight: 1.6,
            caretColor: 'var(--accent)',
          }}
        />

        {/* char counter — only visible when approaching limit */}
        {value.length > 0 && (
          <span
            className="shrink-0 text-[11px] tabular-nums transition-colors"
            style={{ color: atLimit ? 'var(--error)' : nearLimit ? '#ff9933' : 'var(--text-muted)' }}
          >
            {value.length}/2000
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
