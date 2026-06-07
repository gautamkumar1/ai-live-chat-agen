import { cn } from '@/lib/utils'
import type { Message } from '@/lib/api'

interface Props {
  message: Message
}

export function MessageBubble({ message }: Props) {
  const isUser = message.sender === 'user'

  return (
    <div className={cn('flex gap-2 mb-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold shrink-0">
          AI
        </div>
      )}
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted text-foreground rounded-bl-sm',
        )}
      >
        {message.text}
      </div>
    </div>
  )
}
