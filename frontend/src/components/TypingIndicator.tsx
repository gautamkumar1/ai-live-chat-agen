import { AiAvatar } from './AiAvatar'

export function TypingIndicator() {
  return (
    <div className="flex gap-3 mb-5">
      <AiAvatar />
      <div
        className="flex items-center gap-[3px] pt-1"
        style={{ borderLeft: '1px solid var(--accent)', paddingLeft: 12 }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block"
            style={{
              width: 2,
              height: 12,
              background: 'var(--accent)',
              animation: 'bar-pulse 1.1s ease-in-out infinite',
              animationDelay: `${i * 160}ms`,
              transformOrigin: 'bottom',
            }}
          />
        ))}
      </div>
    </div>
  )
}
