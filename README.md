# AI Live Chat Agent

A customer support chat widget powered by OpenAI GPT-4o-mini. Users chat in a React frontend; the backend persists every conversation in Neon (PostgreSQL) via Prisma and injects a FAQ knowledge base into every prompt.

## Stack

| Layer | Tech |
|---|---|
| **Backend** | Node.js 20, TypeScript, Express 5, OpenAI API, Prisma 7, Neon PostgreSQL |
| **Security** | Helmet (CSP + HSTS), express-rate-limit, Zod validation, pino logging |
| **Frontend** | React 19, Vite 6, Tailwind CSS v4, shadcn/ui, Zustand |

---

## Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) database (free tier works)
- An [OpenAI API key](https://platform.openai.com/api-keys)

---

## Local Setup

### 1. Clone and install

```bash
git clone <repo-url> && cd ai-live-chat-agent
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure the backend

```bash
cd backend
cp .env.example .env
```

Fill in `.env`:

```env
DATABASE_URL="postgresql://..."   # from Neon dashboard → Connection string
OPENAI_API_KEY="sk-..."
```

### 3. Run the database migration and seed

```bash
cd backend
npm run db:migrate   # creates tables
npm run db:seed      # loads 8 FAQ entries across 5 categories
```

### 4. Start both servers

Open two terminals:

```bash
# Terminal 1 — backend on :3001
cd backend && npm run dev

# Terminal 2 — frontend on :5173
cd frontend && npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api` to the backend, so no extra CORS config is needed locally.

> [!NOTE]
> The backend validates all env vars at startup with Zod and exits immediately if any are missing or malformed. Check the console output if the server won't start.

---

## Architecture

```
ai-live-chat-agent/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # conversations, messages, knowledge_entries
│   │   └── seed.ts              # 8 FAQ entries (shipping, returns, orders, payments, support)
│   └── src/
│       ├── config/env.ts        # Zod-validated env — fails fast on misconfiguration
│       ├── db/client.ts         # Prisma singleton (PrismaPg adapter, Prisma 7)
│       ├── services/
│       │   ├── chat.service.ts  # OpenAI call, conversation persistence, error mapping
│       │   └── knowledge.service.ts  # Reads FAQ from DB, formats into prompt context
│       ├── routes/chat.router.ts     # POST /chat/message · GET /chat/:sessionId
│       └── middleware/          # Zod validation · rate limiter · global error handler
└── frontend/
    └── src/
        ├── components/          # ChatWidget · MessageList · MessageBubble · ChatInput · TypingIndicator
        ├── store/chat.store.ts  # Zustand store — persists sessionId to localStorage
        ├── hooks/useChat.ts     # Coordinates store, API calls, optimistic updates
        └── lib/api.ts           # Typed fetch wrapper for the backend
```

**Request flow:** `ChatInput` → `useChat.send()` → `POST /chat/message` → `chat.service.generateReply()` fetches knowledge context from DB, builds messages array with full conversation history, calls OpenAI, persists reply, returns `{ reply, sessionId }`.

On page reload, `useChat` reads `sessionId` from localStorage and calls `GET /chat/:sessionId` to restore the conversation.

---

## API

| Method | Path | Body / Params | Response |
|---|---|---|---|
| `POST` | `/chat/message` | `{ message, sessionId? }` | `{ reply, sessionId }` |
| `GET` | `/chat/:sessionId` | — | `{ id, createdAt, messages[] }` |
| `GET` | `/health` | — | `{ status: "ok" }` |

All error responses follow `{ error: string }`. The backend never forwards raw OpenAI error text to the client.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | Neon (PostgreSQL) connection string |
| `OPENAI_API_KEY` | — | OpenAI secret key |
| `PORT` | `3001` | HTTP port |
| `FRONTEND_URL` | `http://localhost:5173` | CORS allowed origin |
| `RATE_LIMIT_MAX` | `30` | Max requests per window per IP |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window in ms |
| `MAX_MESSAGE_LENGTH` | `2000` | Message character cap (enforced backend + frontend) |
| `MAX_HISTORY_MESSAGES` | `20` | Conversation turns sent to OpenAI per request |

---

## LLM Details

- **Model:** `gpt-4o-mini`
- **System prompt:** base support agent instructions + all FAQ entries from `knowledge_entries` (injected at request time, grouped by category)
- **Context window:** last 20 messages per conversation
- **Parameters:** `max_tokens: 512`, `temperature: 0.4`
- **Error handling:** OpenAI 401 → 502, rate limit → 429, timeout → 504; all surface as user-safe messages

---

## Trade-offs

**No streaming.** Responses appear all at once. Adding `openai.chat.completions.stream()` with SSE would improve perceived latency for longer answers.

**No auth.** Sessions are a CUID stored in localStorage. Sufficient for a demo; production would need real authentication.

**In-memory rate limiting.** `express-rate-limit` stores counters in process memory. A Redis store is required for multi-instance deployments.

**Full-prompt FAQ injection.** The 8 FAQ entries are small enough to inject entirely. A larger knowledge base would need vector search (pgvector) instead.
