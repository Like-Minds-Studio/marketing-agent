# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Important:** This is Next.js 16 with breaking changes vs earlier versions. Read `node_modules/next/dist/docs/` before writing route handlers or middleware. Dynamic route params are now `Promise<{ id: string }>` and must be awaited.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build — run this before every push
npm run lint     # ESLint check
npm run start    # Serve production build locally
```

Always run `npm run build` before committing — Railway deploys from main and will fail on TypeScript or build errors.

## Architecture

Single-page app (`app/page.tsx`) with six tabs rendered conditionally: Chat, Strategy, Email, Proposal, Visuals, Calendar. All tabs receive `davidContext: string` (user's session notes, stored in localStorage under `lm_david_context`). The page manages tab state, history panel, and context sidebar as overlays.

### API routes (`app/api/`)

All AI calls are server-side only. Never import Anthropic SDK in client components.

| Route | Purpose |
|---|---|
| `/api/chat` | Streaming chat — `claude-sonnet-4-6`, 4096 tokens. Fetches memories from Supabase and prepends to system prompt before calling Claude. |
| `/api/conversations` | GET lists 50 conversations by `updated_at DESC`; POST upserts a conversation row. Returns 503 if Supabase not configured. |
| `/api/conversations/[id]` | DELETE a conversation by id. |
| `/api/memory` | GET returns up to 30 memories; DELETE by id. Always returns 200 with `[]` if Supabase not configured. |
| `/api/memory/extract` | POST — fire-and-forget. Uses `claude-haiku-4-5-20251001` to extract business facts from a user+assistant exchange. Saves to `memories` table. Always returns 200 (best-effort). |
| `/api/visual` | Non-streaming. Returns `CarouselData` JSON for the visuals tab. |
| `/api/telegram` | Telegram webhook. Receives updates, calls Claude, replies via Bot API. Stores history in `conversations` table under `telegram_<chat_id>`. |

All non-Chat tabs (Strategy, Email, Proposal, Visuals, Calendar) share the same persistence pattern: stream completes → `saveConversation()` POST → `extractMemory()` fire-and-forget → `onSave?.()` to refresh History panel. Strategy, Proposal, Calendar, and Email tabs also expose a follow-up `<textarea>` after generation that sends the full `conversationHistory` back to `/api/chat` for iterative refinement.

### Supabase (`lib/supabase.ts`)

`supabase` export is `null` when `SUPABASE_URL` / `SUPABASE_ANON_KEY` are not set. Every route that uses it must null-check and degrade gracefully. Never import this in browser components.

**Schema:**
```sql
create table conversations (id text primary key, title text not null default 'Untitled', messages jsonb not null default '[]', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table memories (id uuid primary key default gen_random_uuid(), content text not null, created_at timestamptz not null default now());
```

### localStorage (`lib/storage.ts`)

Used only for session-level state: `lm_david_context` (context sidebar notes), `lm_onboarded` (onboarding flag). Conversations and memories are Supabase-only — no localStorage fallback for those.

### Persistence flow (ChatTab)

1. Stream completes → `persist()` writes to localStorage + POST to `/api/conversations`
2. `extractMemory()` fires (no await) → POST to `/api/memory/extract` → Haiku extracts facts → saved to `memories` table
3. On next chat, `/api/chat` fetches memories from Supabase and injects them above the system prompt

### Brand tokens (`app/globals.css`)

Tailwind v4 `@theme` block defines all brand colours as `lm-*` utilities: `lm-bg`, `lm-surface`, `lm-raised`, `lm-bone`, `lm-sand`, `lm-lilac`, `lm-warm`, `lm-muted`, `lm-fire`. Always use these — never raw hex values in components.

### System prompt (`lib/prompts.ts`)

`LIKE_MINDS_SYSTEM_PROMPT` is a large string with full company context: team, brand voice, active projects, target audiences, portfolio, content pillars. Edit this file to update what the AI knows about the business. The chat route assembles the final prompt as: memories → davidContext → today's date → LIKE_MINDS_SYSTEM_PROMPT.

### Visuals tab (`components/VisualsTab.tsx`)

`SlideCard` uses inline styles (not Tailwind) for the 1080×1080 render — this is intentional for `html-to-image` reliability. Hidden full-res slides are scaled 0.3x for preview. PNG export uses `toPng` from `html-to-image`.

## Environment variables

```
ANTHROPIC_API_KEY=              # Required
SUPABASE_URL=                   # Optional — enables cross-device history and memory
SUPABASE_ANON_KEY=              # Optional — pair with SUPABASE_URL
TELEGRAM_BOT_TOKEN=             # Optional — enables Telegram bot (/api/telegram webhook)
TELEGRAM_ALLOWED_CHAT_IDS=      # Optional — comma-separated chat IDs to whitelist (e.g. 123456,789012)
```

App runs without Supabase — falls back to localStorage only.
