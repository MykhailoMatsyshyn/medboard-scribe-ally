---
name: supabase-backend
description: Stand up a Supabase backend for a per-user app — schema as SQL migrations, Row Level Security scoped to auth.uid() on every table, a private per-user Storage bucket, and Deno Edge Functions deployed via the CLI with server-side secrets. Use when you need a multi-tenant data layer where each user only ever sees their own rows, defined reproducibly (not hand-clicked).
---

# Supabase backend: migrations, RLS, Storage, Edge Functions

## Step 0 — Project + CLI

1. Create a Supabase project; note its **project ref** (e.g. `abcd...`).
2. Install + authenticate the CLI:
   ```bash
   brew install supabase/tap/supabase
   supabase login                       # opens browser
   # If keychain prompts and you skip it, pass the token inline instead:
   # SUPABASE_ACCESS_TOKEN=sbp_xxx supabase <cmd> --project-ref <ref>
   ```
3. Generate a Personal Access Token at `supabase.com/dashboard/account/tokens` for CI / inline use.

## Step 1 — Schema as migrations (never hand-clicked)

Migrations live in `supabase/migrations/<timestamp>_<name>.sql` and are the source of truth.
Pattern for a per-user table:

```sql
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
```

## Step 2 — RLS scoped to `auth.uid()` on every table

One policy per operation, each scoped to the owner:

```sql
CREATE POLICY "Users view own conversations"   ON public.conversations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own conversations" ON public.conversations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own conversations" ON public.conversations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own conversations" ON public.conversations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
```

`auth.uid()` is the authenticated user's id from their JWT. With RLS on, the anon key is
safe in the browser — Postgres enforces row ownership on every read/write.

## Step 3 — Private, per-user Storage bucket

Raw files go to Storage; parsed text/metadata to Postgres. Scope objects to a per-user folder
(`<uid>/<file>`):

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('rag-files', 'rag-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users read own files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'rag-files' AND auth.uid()::text = (storage.foldername(name))[1]);
-- repeat for INSERT (WITH CHECK) and DELETE (USING)
```

## Step 4 — Use the right client

- **Browser / user context:** anon (publishable) key — RLS-enforced. Never ship the service-role key.
- **Edge Function, user context:** create the client with the caller's `Authorization` header so
  `auth.uid()` and RLS apply:
  ```ts
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get("Authorization")! } },
  });
  ```
- **Edge Function, privileged work only:** service-role client (`SUPABASE_SERVICE_ROLE_KEY`),
  server-side, used deliberately (e.g. a `SECURITY DEFINER` RPC or cross-user admin task).

## Step 5 — Deploy Edge Functions + secrets

Functions are **not** auto-deployed on git push — deploy them explicitly:

```bash
supabase functions deploy chat --project-ref <ref>
supabase functions deploy ingest-rag-file --project-ref <ref>

# Secrets the functions read via Deno.env.get(...):
supabase secrets set OPENROUTER_API_KEY=sk-or-... OPENROUTER_MODEL=openai/gpt-4o-mini --project-ref <ref>
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected automatically —
do **not** set them yourself.

## Gotchas

- **Make migrations idempotent.** If a Supabase GitHub integration re-runs migrations, plain
  `CREATE TABLE`/`CREATE TRIGGER` fail on "already exists". Use `CREATE TABLE IF NOT EXISTS`,
  `CREATE INDEX IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, and guard policies/triggers
  (`DROP ... IF EXISTS` first, or a `DO $$ ... IF NOT EXISTS ... $$` block).
- **Duplicate trigger** (`on_auth_user_created already exists`) — a classic from two migrations
  both creating the signup trigger. Keep it in exactly one migration.
- **Edge Functions ≠ migrations for deploy.** Pushing to GitHub may apply migrations (via the
  integration) but never deploys functions. Always `supabase functions deploy` after editing them.
- **Service-role key is server-only.** It bypasses RLS — never expose it to the browser or a
  `VITE_`/`NEXT_PUBLIC_` var.
- **Manual SQL drift.** If you paste migration SQL into the dashboard by hand, the remote
  migration history won't record it; `supabase db push` may then try to re-run everything.
  Prefer letting the integration / `db push` own application, and keep migrations idempotent.
