import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { useChat } from '@/hooks/useChat'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'

export function ChatWidget() {
  const { messages, isLoading, error, send, reset } = useChat()

  return (
    <div className="flex flex-col h-full w-full max-w-2xl mx-auto border border-border rounded-2xl shadow-lg overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="font-semibold text-sm">Support Agent</span>
          <Badge variant="secondary" className="text-xs">Online</Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={reset} title="New conversation" aria-label="New conversation">
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <MessageList messages={messages} isLoading={isLoading} />

      {/* Error */}
      {error && (
        <p className="text-xs text-destructive text-center px-4 pb-1">{error}</p>
      )}

      {/* Input */}
      <ChatInput onSend={send} disabled={isLoading} />
    </div>
  )
}
