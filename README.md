<p align="center">
  <img src="frontend/public/favicon.svg" alt="" width="48" height="46" />
</p>

# AI Live Chat Agent


A customer support chat widget backed by GPT-4o-mini. Users talk to the agent in a React UI; the backend stores every message in Neon PostgreSQL and pulls FAQ answers from the database into each prompt.

<p align="center">
  <img src="./docs/images/demo-screenshot.png" alt="Chat widget answering a return policy question" width="720" />
</p>

Watch a full walkthrough: [demo video on Google Drive](https://drive.google.com/file/d/1RRdeg7LDpawfBY_yzCNoTY2YQZ9H6lnM/view?usp=sharing)

[Overview](#overview) · [Quick start](#quick-start) · [Architecture](#architecture) · [LLM notes](#llm-notes) · [API](#api) · [Configuration](#configuration) · [Trade-offs](#trade-offs--if-i-had-more-time) · [Limitations](#limitations)

## Overview

This repo is a small monorepo: an Express API in `backend/` and a Vite + React chat UI in `frontend/`. The agent answers questions about a fictional e-commerce store ("ourstore.com") using eight seeded FAQ entries covering shipping, returns, orders, payments, and support.

Conversations persist in Postgres. Reload the page and your thread comes back via a session ID stored in `localStorage`. Replies stream token-by-token over Server-Sent Events.

| Layer | Stack |
|---|---|
| Backend | Node.js 20, TypeScript, Express 5, OpenAI API, Prisma 7, Neon PostgreSQL |
| Security | Helmet (CSP + HSTS), express-rate-limit, Zod validation, pino logging |
| Frontend | React 19, Vite 6, Tailwind CSS v4, shadcn/ui, Zustand |

## Quick start

### Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) database (free tier is fine)
- An [OpenAI API key](https://platform.openai.com/api-keys)

### 1. Install dependencies

```bash
git clone https://github.com/gautamkumar1/ai-live-chat-agen.git && cd ai-live-chat-agen
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure the backend

```bash
cd backend
cp .env.example .env
```

Set at least these two values in `.env`:

```env
DATABASE_URL="postgresql://..."   # Neon dashboard → Connection string
OPENAI_API_KEY="sk-..."
```

Full list of backend env vars is in the [Configuration](#configuration) table below.

### 3. Configure the frontend

```bash
cd frontend
cp .env.example .env
```

The only required value is:

```env
VITE_API_URL=http://localhost:3001
```

`VITE_MAX_MESSAGE_LENGTH` defaults to `2000` — leave it unless you changed `MAX_MESSAGE_LENGTH` on the backend.

### 4. Set up the database

```bash
cd backend
npm run db:migrate   # runs Prisma migrations, creates all tables
npm run db:seed      # loads 8 FAQ entries across 5 categories
```

> [!TIP]
> Run `npm run db:studio` in `backend/` to browse conversations and knowledge entries in Prisma Studio.

### 5. Run both servers

Use two terminals:

```bash
# Terminal 1 — backend on :3001
cd backend && npm run dev

# Terminal 2 — frontend on :5173
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

> [!NOTE]
> The backend validates all environment variables at startup with Zod. If something is missing or malformed, it exits immediately. Check the console output when the server refuses to start.

## Architecture

### Folder structure

```
ai-live-chat-agent/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Conversation, Message, KnowledgeEntry models
│   │   ├── migrations/          # SQL migration history
│   │   └── seed.ts              # 8 FAQ entries
│   └── src/
│       ├── config/env.ts        # Zod-validated env schema — server exits if invalid
│       ├── db/client.ts         # Prisma singleton with PrismaPg driver adapter
│       ├── services/
│       │   ├── llm-provider.ts       # LLMProvider interface + OpenAIProvider implementation
│       │   ├── chat.service.ts       # orchestration: context resolution, DB writes, error mapping
│       │   └── knowledge.service.ts  # FAQ → prompt context (5-min module-level cache)
│       ├── routes/chat.router.ts     # POST /chat/message · POST /chat/stream · GET /chat/:sessionId
│       └── middleware/          # Zod request validation · rate limiter · error handler
└── frontend/
    └── src/
        ├── components/          # ChatWidget, MessageList, MessageBubble, ChatInput, TypingIndicator
        ├── store/chat.store.ts  # Zustand; only sessionId persisted to localStorage
        ├── hooks/useChat.ts     # streaming, optimistic updates, abort, session restore
        └── lib/api.ts           # typed fetch wrapper with SSE parser
```

### Backend layers

The backend follows a strict three-layer pattern:

| Layer | Files | Responsibility |
|---|---|---|
| Transport | `chat.router.ts`, `middleware/` | HTTP boundary — Zod validation, rate limiting, SSE framing, error serialisation |
| Orchestration | `chat.service.ts` | Business logic — session resolution, history fetch, atomic DB writes, error classification |
| Infrastructure | `llm-provider.ts`, `knowledge.service.ts`, `db/client.ts` | External I/O — OpenAI SDK, FAQ cache, Prisma client |

`chat.service.ts` depends on the `LLMProvider` interface, not the concrete `OpenAIProvider`. Swapping the model provider means implementing two methods (`complete` and `stream`) and changing one line.

### Key design decisions

**Atomic message writes.** The user message and AI reply are saved together in a single `prisma.$transaction` after the LLM responds. If OpenAI fails, nothing is written — no orphaned user turns that would corrupt future context windows.

**History fetched before the current message is saved.** `resolveContext` fetches the last `MAX_HISTORY_MESSAGES` turns (newest-first, then reversed to chronological) before persisting the current user turn. This prevents the just-sent message from appearing twice in the OpenAI context.

**SSE with full abort chain.** The frontend creates an `AbortController` per send. Its signal flows into `fetch()`, into the ReadableStream reader cancel, and through `req.on('close')` on the server into the OpenAI stream call. Resetting mid-stream cancels work at every layer with no dangling connections.

**Knowledge cache.** `knowledge.service.ts` caches the formatted FAQ context for 5 minutes in module scope, eliminating a DB round-trip on every message.

**Send a message (full path):** `ChatInput` → `useChat.send()` → `POST /chat/stream` → `resolveContext()` fetches history and builds the prompt → `llmProvider.stream()` streams tokens from OpenAI → tokens arrive via SSE → on completion, user + AI messages saved atomically → `{ done, sessionId }` sent to client.

**Reload the page:** `useChat` waits for Zustand's persist rehydration, reads `sessionId` from localStorage, calls `GET /chat/:sessionId`, and restores the message list.

The non-streaming `POST /chat/message` endpoint still exists if you want a single JSON response instead of SSE.

## LLM notes

**Provider:** OpenAI `gpt-4o-mini`. Chosen for cost efficiency, fast time-to-first-token (improves perceived streaming quality), and strong factual grounding on short Q&A tasks.

**Prompting strategy:** Two-part system prompt:

1. **Base instructions** — role definition, tone guide ("friendly but professional"), hallucination guard ("never make up information not provided to you"), and escalation path (`support@ourstore.com`).
2. **Knowledge context** — all FAQ entries from `knowledge_entries` appended at runtime, grouped by category and formatted as `Q: ... / A: ...` blocks. This grounds answers in verified store policies without fine-tuning.

**Context window:** The last `MAX_HISTORY_MESSAGES` (default 20) turns are included in each request — most recent turns only, in chronological order. The current user turn is appended explicitly and is never fetched from the DB.

**Parameters:**
- `temperature: 0.4` — lower than default to keep factual answers consistent and reduce hallucination risk
- `max_tokens: 1024` — enough for detailed multi-part answers without wasting tokens
- `timeout: 30s` — enforced via `AbortController`; prevents hung SSE connections

**Error mapping:** OpenAI errors are caught in `mapLlmError` and translated to safe HTTP codes (401→502, 429→429, timeout→504). Raw SDK error text never reaches the client.

## API

| Method | Path | Body / params | Response |
|---|---|---|---|
| `POST` | `/chat/message` | `{ message, sessionId? }` | `{ reply, sessionId }` |
| `POST` | `/chat/stream` | `{ message, sessionId? }` | SSE: `{ token }` chunks, then `{ done, sessionId }` |
| `GET` | `/chat/:sessionId` | — | `{ id, createdAt, messages[] }` |
| `GET` | `/health` | — | `{ status: "ok" }` |

`/chat/stream` uses `text/event-stream`. Each event is a JSON object: `{ token: string }` while generating, then `{ done: true, sessionId: string }` when finished. On error: `{ error: string }`.

All non-SSE errors return `{ error: string }`. Raw OpenAI error text never reaches the client.

Example:

```bash
curl -X POST http://localhost:3001/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "What is your return policy?"}'
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | Neon PostgreSQL connection string |
| `OPENAI_API_KEY` | — | OpenAI secret key |
| `PORT` | `3001` | HTTP port |
| `NODE_ENV` | `development` | `development` or `production` |
| `FRONTEND_URL` | `http://localhost:5173` | CORS allowed origin |
| `RATE_LIMIT_MAX` | `30` | Max requests per window per IP |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window (ms) |
| `MAX_MESSAGE_LENGTH` | `2000` | Character cap (enforced on backend and frontend) |
| `MAX_HISTORY_MESSAGES` | `20` | Conversation turns sent to OpenAI per request |
| `RENDER_EXTERNAL_URL` | — | Set automatically by Render; used for the self-ping keepalive |

### Frontend env vars (`frontend/.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3001` | Backend base URL |
| `VITE_MAX_MESSAGE_LENGTH` | `2000` | Character cap shown in the UI — keep in sync with backend `MAX_MESSAGE_LENGTH` |

## Trade-offs & If I had more time

### Trade-offs made

**Full-prompt FAQ injection over retrieval.** Every message injects all 8 FAQ entries into the system prompt. This is simple and works well at demo scale, but doesn't scale to a real knowledge base. The right solution is pgvector embeddings with similarity search — the `KnowledgeEntry` table is already structured to support this with minimal schema changes.

**No authentication.** Sessions are anonymous CUIDs in `localStorage`. Production would require user auth (Clerk, Auth0, or session tokens) scoped to the organisation's customer accounts.

**In-process rate limiting.** `express-rate-limit` uses an in-memory store. A second backend instance (horizontal scale, blue/green deploy) would have independent counters. Redis-backed rate limiting would be the production fix.

**Non-streaming endpoint kept.** `POST /chat/message` provides a plain JSON response path. It's currently unreachable from the frontend but is useful for API consumers and testing. In production it would need the same 30s timeout as the stream path.

### If I had more time

- **Tests for the service layer** — integration tests for `chat.service.ts` using a real test DB (Neon branching makes this cheap) and unit tests with a mock `LLMProvider`.
- **Knowledge base admin UI** — a simple CRUD interface for FAQ entries so non-engineers can update the support content without a DB migration or seed script.
- **Semantic search** — replace the full-prompt injection with pgvector similarity search so the knowledge base can grow to thousands of entries without bloating every prompt.
- **Message timestamps in the UI** — `createdAt` is already in the response; surfacing it on hover would make conversation history more readable.
- **Retry UX** — a transient network error currently removes both message bubbles. A "retry" button on the error banner would let users re-send without retyping.
- **`/health` DB check** — the health endpoint currently returns `{ status: "ok" }` unconditionally. A `SELECT 1` probe would make it a genuine readiness check for load balancers.

## Limitations

These are deliberate choices for a demo, not oversights.

**No authentication.** Sessions are a CUID in `localStorage`. Anyone with the ID can read the conversation. Production would need real auth.

**In-memory rate limiting.** `express-rate-limit` keeps counters in process memory. Multiple backend instances need a shared store (Redis, for example).

**Full-prompt FAQ injection.** Eight entries fit easily in the system prompt. A larger knowledge base would need retrieval (pgvector or similar) instead of dumping everything in.

**Prisma 7 driver adapter.** The client must go through the singleton at `backend/src/db/client.ts` using `PrismaPg`. The schema `datasource` block has no `url` field; the connection string lives in `prisma.config.ts`.

## Troubleshooting

**Backend exits on startup**
Check that `DATABASE_URL` and `OPENAI_API_KEY` are set and valid. The Zod schema in `backend/src/config/env.ts` prints which field failed.

**"Conversation not found" after reload**
The session ID in localStorage may point to a deleted row, or the database was reset without clearing browser storage. Hit the reset button in the chat header or clear site data for localhost.

**Stream stalls or shows no tokens**
Confirm the backend is running on port 3001 and the Vite proxy is active. SSE responses disable buffering (`X-Accel-Buffering: no`); reverse proxies in front of the API need the same setting.

**OpenAI 502 / 429 / 504**
The API key may be invalid or expired (502), you may have hit OpenAI rate limits (429), or the upstream call timed out (504). Check backend logs via pino for the underlying cause.
