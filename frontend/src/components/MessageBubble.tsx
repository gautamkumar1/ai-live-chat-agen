import { cn } from '@/lib/utils'
import type { Message } from '@/lib/api'
import { AiAvatar } from './AiAvatar'

interface Props {
  message: Message
  isStreaming?: boolean
}

export function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.sender === 'user'

  if (isUser) {
    return (
      <div className="msg-in flex justify-end mb-4">
        <div
          className="max-w-[72%] px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap"
          style={{
            background: 'var(--user-bg)',
            color: 'var(--text)',
            border: '1px solid var(--border-mid)',
          }}
        >
          {message.text}
        </div>
      </div>
    )
  }

  return (
    <div className="msg-in flex gap-3 mb-5">
      <AiAvatar />
      <div
        className="flex-1 text-[13px] leading-relaxed whitespace-pre-wrap pt-0.5"
        style={{
          color: 'var(--text)',
          borderLeft: '1px solid var(--accent)',
          paddingLeft: '12px',
        }}
      >
        {message.text}
        {isStreaming && (
          <span
            className="cursor-blink inline-block ml-0.5 align-middle"
            style={{
              width: 1.5,
              height: '0.85em',
              background: 'var(--accent)',
              verticalAlign: 'middle',
              display: 'inline-block',
            }}
          />
        )}
      </div>
    </div>
  )
}
