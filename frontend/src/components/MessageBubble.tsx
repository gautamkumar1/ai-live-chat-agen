import ReactMarkdown from 'react-markdown'
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
        className="flex-1 pt-0.5 prose-ai"
        style={{
          color: 'var(--text)',
          borderLeft: '1px solid var(--accent)',
          paddingLeft: '12px',
        }}
      >
        <ReactMarkdown
          components={{
            p: ({ children }) => (
              <p style={{ margin: '0 0 0.5em', fontSize: 13, lineHeight: 1.65 }}>{children}</p>
            ),
            ul: ({ children }) => (
              <ul style={{ margin: '0.25em 0 0.5em', paddingLeft: '1.2em', listStyleType: 'disc' }}>{children}</ul>
            ),
            ol: ({ children }) => (
              <ol style={{ margin: '0.25em 0 0.5em', paddingLeft: '1.2em' }}>{children}</ol>
            ),
            li: ({ children }) => (
              <li style={{ fontSize: 13, lineHeight: 1.65, marginBottom: '0.15em' }}>{children}</li>
            ),
            strong: ({ children }) => (
              <strong style={{ color: 'var(--accent)', fontWeight: 600 }}>{children}</strong>
            ),
            em: ({ children }) => (
              <em style={{ color: 'var(--text-soft)', fontStyle: 'italic' }}>{children}</em>
            ),
            code: ({ children }) => (
              <code
                style={{
                  background: 'var(--bg-raise)',
                  color: 'var(--accent)',
                  padding: '0.1em 0.35em',
                  fontSize: 12,
                  border: '1px solid var(--border-mid)',
                }}
              >
                {children}
              </code>
            ),
            pre: ({ children }) => (
              <pre
                style={{
                  background: 'var(--bg-raise)',
                  border: '1px solid var(--border-mid)',
                  padding: '0.6em 0.8em',
                  overflowX: 'auto',
                  fontSize: 12,
                  margin: '0.4em 0',
                }}
              >
                {children}
              </pre>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent)', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
              >
                {children}
              </a>
            ),
          }}
        >
          {message.text}
        </ReactMarkdown>
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
