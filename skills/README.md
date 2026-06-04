# Reproduction skills

Runnable playbooks an AI agent (Codex or Claude) can follow to reproduce this setup on a new
project. Each lives in its own folder as a `SKILL.md` — model-agnostic, self-contained, with
exact commands, copy-paste code, and the gotchas hit while building this app.

| Skill | What it reproduces |
|-------|--------------------|
| [`remix-and-deploy`](./remix-and-deploy/SKILL.md) | Remix the Lovable starter, connect GitHub, push-to-deploy on Vercel, and the `vercel.json` SPA-routing config. |
| [`supabase-backend`](./supabase-backend/SKILL.md) | Schema as migrations, Row Level Security scoped to `auth.uid()`, a private per-user Storage bucket, and deploying Edge Functions with server-side secrets. |
| [`supabase-auth`](./supabase-auth/SKILL.md) | Email/password auth in a Vite SPA — sign in/up, forgot-password + reset link, change password, sign out, client-side route protection, and the dashboard config. |
| [`rag-pgvector-gte-small`](./rag-pgvector-gte-small/SKILL.md) | Document-grounded retrieval with pgvector and the Edge runtime's built-in `gte-small` embeddings (no external embeddings key). |
| [`openrouter-forced-tool-calling`](./openrouter-forced-tool-calling/SKILL.md) | The chat backend: one server-side OpenRouter call that forces a tool so the model returns typed JSON, with retry/backoff and a swappable model id. |

Suggested order on a fresh project: **remix-and-deploy → supabase-backend →
openrouter-forced-tool-calling → rag-pgvector-gte-small**.
