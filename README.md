# Health Companion

An AI health assistant with a personal, document-grounded knowledge base. Users sign in,
upload documents (PDF / DOCX / TXT / MD / CSV / JSON), and chat with an assistant that
answers in rendered Markdown — grounding its replies on the user's own documents via
retrieval-augmented generation (RAG).

Built as a **Vite + React + TypeScript** single-page app on a **Supabase** backend
(Postgres + pgvector, Auth, Storage, Edge Functions), with all LLM access routed through
**OpenRouter** using a forced tool-calling pattern for typed output.

**Live demo:** https://medboard-scribe-ally.vercel.app

Sign in with the throwaway test account to try it end to end:

| Email            | Password   |
| ---------------- | ---------- |
| `test@email.com` | `password` |

---

## How it works

```
Browser (Vite SPA)
   │  Supabase Auth — email/password, session in localStorage, client-side route guards
   │
   ├─ Upload doc ─► Edge Function: ingest-rag-file
   │                   chunk text → store in Postgres (rag_chunks, full-text indexed)
   │
   └─ Ask question ─► Edge Function: chat
                         full-text search (match_rag_chunks, ts_rank, scoped to user)
                         → fold top matches into the system prompt
                         → ONE OpenRouter call, tool_choice forces the `answer` tool
                         → read typed JSON from tool_calls[0].function.arguments
                         → persist messages, return Markdown reply
```

Every table is protected by Row Level Security scoped to `auth.uid()`, so a user can only
ever read or write their own conversations, messages, and documents.

---

## Tech stack

- **Frontend:** Vite, React, TypeScript, shadcn/ui, Tailwind CSS
- **Backend:** Supabase — Postgres + pgvector, Auth, Storage, Edge Functions (Deno/TypeScript)
- **AI:** OpenRouter (chat-completions, forced tool-calling)
- **Retrieval:** Postgres full-text search (`tsvector` + `ts_rank`) — no embeddings, runs entirely in Postgres

---

## Requirements coverage

| Requirement (spec)                                                                   | Where it lives                                                                               |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Chat in rendered Markdown (incl. tables), loading state, messages persist            | `src/pages/ChatView.tsx`, `src/components/chat/MarkdownMessage.tsx`; persisted to `messages` |
| Conversations sidebar — create / switch / delete / per-user                          | `src/components/chat/ChatHistorySidebar.tsx`, `conversations` table                          |
| Knowledge base — upload, list, remove; answers grounded on docs                      | `src/components/settings/KnowledgeBaseManager.tsx`, `supabase/functions/ingest-rag-file`     |
| Settings — email, edit display name, change password, reset email                    | `src/pages/SettingsPage.tsx`                                                                 |
| Auth — sign in / up / forgot-password / reset / sign out; protected routes           | `src/pages/AuthPage.tsx`, `ResetPassword.tsx`, `src/hooks/useAuth.tsx`                       |
| Chat backend via OpenRouter, **forced tool-calling**, swappable model, retry/backoff | `supabase/functions/chat/index.ts`                                                           |
| Schema as migrations; **RLS on every table** scoped to `auth.uid()`                  | `supabase/migrations/`                                                                       |
| Raw files in a private, per-user Storage bucket; parsed text in Postgres             | bucket `rag-files`, tables `rag_files` / `rag_chunks`                                        |
| Vercel deploy via Git, env vars in the project                                       | `vercel.json`, Vercel project settings                                                       |
| Reproduction skills                                                                  | [`skills/`](./skills)                                                                        |

---

## Design decisions & trade-offs

- **Forced tool-calling for typed output.** The chat function makes a single OpenRouter call
  with `tool_choice` forcing one `answer` tool, then reads the reply from
  `tool_calls[0].function.arguments` — validated JSON instead of free text to parse. The model
  id is a single swappable env var (`OPENROUTER_MODEL`, default `openai/gpt-4o-mini`).
- **Retrieval via Postgres full-text search.** OpenRouter has no embeddings endpoint, and
  computing embeddings inside the Edge Function (e.g. `gte-small`) tripped CPU-time limits on the
  free tier even for small files. Full-text search (`tsvector` + `ts_rank`) runs entirely in
  Postgres — reliable, no per-request compute, no extra provider — and is an allowed retrieval
  method. _Trade-off:_ keyword matching rather than semantic similarity, which suits documents
  full of concrete terms (names, codes, metrics).
- **RLS is the security boundary.** Every table (`conversations`, `messages`, `rag_files`,
  `rag_chunks`, `profiles`) has policies scoped to `auth.uid()`. The browser uses the
  anon/publishable key; the service-role key stays server-side and is used only inside Edge
  Functions for the retrieval RPC.
- **SPA instead of SSR.** The starter is a Vite SPA with no server runtime, so `@supabase/ssr`
  and Next.js-style middleware don't apply. Sessions are persisted client-side and routes are
  guarded with `useAuth` + redirects; data access is still enforced server-side by RLS.

---

## Running locally

### Prerequisites

- Node.js
- A Supabase project (with the Supabase CLI for migrations + functions)
- An OpenRouter API key

### Steps

```bash
# 1. Clone
git clone <YOUR_GIT_URL>
cd medboard-scribe-ally

# 2. Install
npm install

# 3. Env (frontend) — copy the template and fill in your values
cp .env.example .env.local

# 4. Run
npm run dev
```

### Environment variables

**Frontend** (`.env.local`, and the same in Vercel) — only `VITE_`-prefixed vars reach the browser:

| Variable                        | Description                                         |
| ------------------------------- | --------------------------------------------------- |
| `VITE_SUPABASE_URL`             | Supabase project URL                                |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key (safe in the browser) |
| `VITE_SUPABASE_PROJECT_ID`      | Supabase project ref                                |

**Server-side** — set as **Supabase Edge Function secrets**, never exposed to the browser:

| Secret               | Description                                                          |
| -------------------- | -------------------------------------------------------------------- |
| `OPENROUTER_API_KEY` | OpenRouter API key                                                   |
| `OPENROUTER_MODEL`   | Model slug (default `openai/gpt-4o-mini`; must support tool-calling) |

(`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected into Edge
Functions automatically — no need to set them.)

### Supabase setup

```bash
supabase link --project-ref <your-ref>

# Apply schema (or let the Supabase GitHub integration apply migrations on push)
supabase db push

# Deploy the Edge Functions (NOT auto-deployed on git push)
supabase functions deploy chat
supabase functions deploy ingest-rag-file

# Set the OpenRouter secrets
supabase secrets set OPENROUTER_API_KEY=sk-or-... OPENROUTER_MODEL=openai/gpt-4o-mini
```

In the Supabase dashboard, add your local and Vercel URLs to **Authentication → URL
Configuration → Redirect URLs** so the password-reset links resolve.

---

## Project structure

```
src/
  components/    # UI (chat, settings, layout, shadcn/ui primitives)
  pages/         # Routes: chat, auth, reset-password, settings, knowledge-base
  hooks/         # useAuth and friends
  integrations/  # Supabase client
  lib/           # Shared utilities (text extraction, etc.)
supabase/
  migrations/    # SQL migrations — source of truth for the schema + RLS
  functions/     # Edge Functions (Deno): chat, ingest-rag-file
skills/          # Reproduction skills (one SKILL.md per skill)
vercel.json      # SPA rewrites so deep links don't 404 on reload
```

---

## Reproduction skills

Runnable, model-agnostic playbooks an AI agent (Codex or Claude) can follow to reproduce this
setup on a fresh project. Each is a `SKILL.md` with exact commands, copy-paste code, and the
gotchas hit while building this app — see the [index](./skills/README.md).

- [`remix-and-deploy`](./skills/remix-and-deploy/SKILL.md) — remix the Lovable starter, connect GitHub, push-to-deploy on Vercel, SPA routing
- [`supabase-backend`](./skills/supabase-backend/SKILL.md) — migrations, RLS, per-user Storage, Edge Function deploy + secrets
- [`supabase-auth`](./skills/supabase-auth/SKILL.md) — email/password auth for a Vite SPA + route protection
- [`rag-full-text-search`](./skills/rag-full-text-search/SKILL.md) — Postgres full-text retrieval (no embeddings)
- [`openrouter-forced-tool-calling`](./skills/openrouter-forced-tool-calling/SKILL.md) — the typed-output chat backend

---

## Notes

- **Time spent:** about 5 hours in one sitting. The screens came together quickly on top of the
  Lovable + shadcn scaffold — where my time actually went was the backend and making it behave on
  Supabase's free tier: wiring the OpenRouter forced-tool-calling chat function, the per-user RLS,
  and especially retrieval. I first tried embeddings inside the Edge Function, hit CPU-time limits,
  and moved to Postgres full-text search, which turned out simpler and reliable. The rest went into
  the Supabase ↔ Vercel env/deploy wiring and writing up the reproduction skills.
