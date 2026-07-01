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
| `/api/memory` | GET returns up to 30 memories (sorted pinned-first); DELETE by id; POST saves a memory (requires `Authorization: Bearer <N8N_WEBHOOK_SECRET>` if env var is set, else 401); PATCH toggles `pinned` status. Always returns 200 with `[]` on GET if Supabase not configured. |
| `/api/memory/extract` | POST — fire-and-forget. Uses `claude-haiku-4-5-20251001` to extract business facts from a user+assistant exchange. Saves to `memories` table. Always returns 200 (best-effort). |
| `/api/visual` | Non-streaming. Returns `CarouselData` JSON for the visuals tab. |
| `/api/telegram` | Telegram webhook. Receives updates, calls Claude, replies via Bot API. Stores history in `conversations` table under `telegram_<chat_id>`. |
| `/api/telegram/brief` | POST — sends a daily morning brief to David via Telegram. Triggered by n8n on a schedule. |
| `/api/maps` | POST — wraps Google Places Text Search API. Accepts `{ query, type? }`, returns top 5 results biased to Sydney. Requires `GOOGLE_MAPS_API_KEY`. |
| `/api/drive-sync` | POST — accepts `{ fileId, fileName, content }` from n8n. Chunks large files (1800 chars, 6 chunks max), deduplicates by `[DRIVE:fileId]` prefix, stores to `memories` table. Requires `Authorization: Bearer <N8N_WEBHOOK_SECRET>`. |

All non-Chat tabs (Strategy, Email, Proposal, Visuals, Calendar) share the same persistence pattern: stream completes → `saveConversation()` POST → `extractMemory()` fire-and-forget → `onSave?.()` to refresh History panel. Strategy, Proposal, Calendar, and Email tabs also expose a follow-up `<textarea>` after generation that sends the full `conversationHistory` back to `/api/chat` for iterative refinement.

### Memory loading (`app/api/chat/route.ts`)

Memories are split into two pools before being injected into the system prompt:
- **Conversational** (max 20): anything not prefixed `[DRIVE:` — ordered pinned-first, then newest. These are facts extracted from past conversations.
- **Drive** (max 15): entries prefixed `[DRIVE:fileId]` — synced from Google Drive via n8n. Shown in a separate section headed "DAVID'S GOOGLE DRIVE CONTEXT".

Drive memories use `[DRIVE:fileId]` as a deduplication key. `/api/drive-sync` deletes all existing entries for a fileId before inserting new chunks.

### Supabase (`lib/supabase.ts`)

RLS is enabled on both tables. The client uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS) with `SUPABASE_ANON_KEY` as fallback. Every route that uses it must null-check and degrade gracefully. Never import this in browser components.

**Schema:**
```sql
create table conversations (id text primary key, title text not null default 'Untitled', messages jsonb not null default '[]', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table memories (id uuid primary key default gen_random_uuid(), content text not null, pinned boolean not null default false, created_at timestamptz not null default now());
```

### localStorage (`lib/storage.ts`)

Used only for session-level state: `lm_david_context` (context sidebar notes), `lm_onboarded` (onboarding flag). Conversations and memories are Supabase-only — no localStorage fallback for those.

### Persistence flow (ChatTab)

1. Stream completes → `persist()` writes to localStorage + POST to `/api/conversations`
2. `extractMemory()` fires (no await) → POST to `/api/memory/extract` → Haiku extracts facts → saved to `memories` table
3. On next chat, `/api/chat` fetches memories from Supabase and injects them above the system prompt

### Brand tokens (`app/globals.css`)

Tailwind v4 `@theme` block defines all brand colours as `lm-*` utilities: `lm-bg`, `lm-surface`, `lm-raised`, `lm-bone`, `lm-sand`, `lm-lilac`, `lm-warm`, `lm-muted`, `lm-fire`, `lm-purple`, `lm-espresso`. Always use these — never raw hex values in components.

Three fonts are loaded in `app/layout.tsx`: Geist Sans (body/UI), Geist Mono (code), Playfair Display (editorial). Use `var(--font-geist-sans)` in inline styles (e.g. Visuals slides) where Tailwind classes can't reach.

### System prompt (`lib/prompts.ts`)

`LIKE_MINDS_SYSTEM_PROMPT` is a large string with full company context: team, brand voice, active projects, target audiences, portfolio, content pillars. Edit this file to update what the AI knows about the business. The chat route assembles the final prompt as: memories → davidContext → today's date → LIKE_MINDS_SYSTEM_PROMPT.

### History Panel (`components/HistoryPanel.tsx`)

Conversations are tab-scoped by title prefix: Chat conversations have no prefix; all other tabs prefix their title with `[TabName]` (e.g. `[Strategy] ...`). The History Panel uses this to filter by active tab. When saving a non-Chat conversation, the title must follow this convention.

### Telegram (`app/api/telegram/route.ts`)

Three implementation details to know when modifying: (1) Responses over 4000 chars are split at newline boundaries before sending — Telegram's hard limit. (2) All Markdown is stripped from responses (headers, bold, code blocks, links) since the bot sends plain text. (3) Conversation history is capped at the last 40 messages (20 turns) per chat to keep Supabase rows bounded.

### Visuals tab (`components/VisualsTab.tsx`)

`SlideCard` uses inline styles (not Tailwind) for the 1080×1080 render — this is intentional for `html-to-image` reliability. Hidden full-res slides are scaled 0.3x for preview. PNG export uses `toPng` from `html-to-image`.

## Environment variables

```
ANTHROPIC_API_KEY=              # Required
SUPABASE_URL=                   # Optional — enables cross-device history and memory
SUPABASE_SERVICE_ROLE_KEY=      # Preferred — server-side only, bypasses RLS (get from Supabase → Settings → API)
SUPABASE_ANON_KEY=              # Fallback if service role key not set — requires RLS policies to be permissive
TELEGRAM_BOT_TOKEN=             # Optional — enables Telegram bot (/api/telegram webhook)
TELEGRAM_ALLOWED_CHAT_IDS=      # Optional — comma-separated chat IDs to whitelist (e.g. 123456,789012)
N8N_WEBHOOK_SECRET=             # Optional — enables bearer token auth on POST /api/memory for n8n automation
```

App runs without Supabase — falls back to localStorage only.

## n8n workflows (`n8n/`)

Importable workflow JSON files for n8n. Import via Workflows → Import from file, then map credentials after import.

| File | What it syncs | Runs at |
|---|---|---|
| `gdrive-sync.json` | Google Docs → `/api/drive-sync` (chunks + deduplicates) | 1am |
| `crm-sync.json` | Pipeline Master Sheet → `/api/memory` | 6am |
| `gmail-sync.json` | Unread Gmail threads → `/api/memory` | 5:30am |
| `xero-sync.json` | Outstanding + overdue invoices → `/api/memory` | 6:30am |
| `canva-sync.json` | Canva design metadata → `/api/memory` | 2am |
| `calendar-sync.json` | Upcoming 7-day Google Calendar events → `/api/memory` | 6am |
| `daily-brief.json` | Triggers `/api/telegram/brief` | 5am |

All workflows use the same Bearer Auth credential (`N8N_WEBHOOK_SECRET`) for the HTTP Request nodes hitting the Railway app. For the initial Google Drive backfill, remove the `modifiedTime` filter from `gdrive-sync.json`, run manually once, then restore it.

### Credential scope requirements (set once on Friday session)

| Service | n8n Credential Type | Scope to set | Notes |
|---|---|---|---|
| Gmail | Gmail OAuth2 | default (`https://mail.google.com/`) | Covers read + send already |
| Google Drive | Google Drive OAuth2 | default (`drive`) | Full access by default |
| Google Sheets | Google Sheets OAuth2 | default (`spreadsheets`) | Full access by default |
| Google Calendar | Google Calendar OAuth2 | default (`calendar.events`) | Full access — needed for future booking |
| Xero | Xero OAuth2 | `accounting.transactions` | **Change from default** — drop `.read` suffix to enable write |
| Canva | HTTP Header Auth (API token) | n/a — token has full access | Generate in Canva Developer Portal |

Phase 2 write actions (Gmail send, Calendar booking, Xero invoice creation) will use the same credentials — no re-auth needed if set up with the scopes above.
