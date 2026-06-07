import { ChatWidget } from './components/ChatWidget'

export default function App() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl h-[680px]">
        <ChatWidget />
      </div>
    </main>
  )
}
