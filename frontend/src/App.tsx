import { ChatWidget } from './components/ChatWidget'

export default function App() {
  return (
    <main
      style={{ background: 'var(--bg)' }}
      className="h-full w-full flex items-center justify-center p-4"
    >
      <div className="w-full max-w-xl" style={{ height: 'min(680px, 100dvh - 2rem)' }}>
        <ChatWidget />
      </div>
    </main>
  )
}
