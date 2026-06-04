---
name: rag-full-text-search
description: Add per-user document-grounded retrieval (RAG) to a Supabase app using Postgres full-text search — a generated tsvector column, a GIN index, and a ts_rank query — with no embeddings and no model inference. Use when you want reliable grounding that runs entirely in Postgres, especially on tiers where in-function embedding hits CPU/resource limits.
---

# RAG with Postgres full-text search

Retrieval runs **entirely in Postgres** — no embedding model, no per-request compute in the
Edge Function. Chunk text is indexed as a `tsvector`; queries rank chunks with `ts_rank`.

> Why not vector embeddings? Computing embeddings inside an Edge Function (e.g. the built-in
> `gte-small`) runs on the function's CPU and trips CPU-time / `WORKER_RESOURCE_LIMIT` errors on
> the free tier — even for small documents. Full-text search has zero per-request compute cost
> and is explicitly an allowed retrieval method. Trade-off: it matches on keywords/terms, not
> semantic similarity — a good fit for documents full of concrete terms (names, codes, metrics).

## Step 1 — schema (migration)

```sql
CREATE TABLE IF NOT EXISTS public.rag_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending',  -- pending | ready | error
  chunk_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rag_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  file_id uuid NOT NULL REFERENCES public.rag_files(id) ON DELETE CASCADE,
  chunk_index int NOT NULL,
  content text NOT NULL,
  -- Generated full-text index column; auto-populates for existing rows when added.
  content_tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED
);

CREATE INDEX IF NOT EXISTS rag_chunks_tsv_idx
  ON public.rag_chunks USING gin (content_tsv);
```

Enable RLS + per-user policies on both tables (see `supabase-backend`).

## Step 2 — match function (full-text, per user)

```sql
CREATE OR REPLACE FUNCTION public.match_rag_chunks(
  query_text text,
  match_user_id uuid,
  match_count int DEFAULT 6
)
RETURNS TABLE (id uuid, file_id uuid, content text, rank float)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.file_id, c.content,
         ts_rank(c.content_tsv, websearch_to_tsquery('english', query_text)) AS rank
  FROM public.rag_chunks c
  WHERE c.user_id = match_user_id
    AND c.content_tsv @@ websearch_to_tsquery('english', query_text)
  ORDER BY rank DESC
  LIMIT match_count;
$$;
```

`websearch_to_tsquery` accepts raw user input safely (handles quotes, operators, stop words).

## Step 3 — ingest: chunk → store text (no model)

```ts
function chunkText(text: string, size = 1200, overlap = 150): string[] { /* sliding window */ }

const rows = chunkText(extractedText).slice(0, MAX_CHUNKS).map((content, idx) => ({
  user_id: user.id, file_id, chunk_index: idx, content,
}));
await admin.from("rag_chunks").delete().eq("file_id", file_id); // re-ingest case
await admin.from("rag_chunks").insert(rows);
```

No embeddings, so there's no CPU-bound work — `MAX_CHUNKS` can be generous. Text extraction
(PDF/DOCX/TXT → string) happens client-side; the function receives the text.

## Step 4 — retrieve at chat time and ground the answer

```ts
const { data: matches } = await admin.rpc("match_rag_chunks", {
  query_text: String(userQuestion).slice(0, 1000),
  match_user_id: user.id,
  match_count: 6,
});
const context = (matches ?? []).map((m, i) => `[Source ${i + 1}]\n${m.content}`).join("\n\n---\n\n");
// Fold `context` into the system prompt, then make the OpenRouter call (see openrouter-forced-tool-calling).
```

## Gotchas

- **In-function embeddings can blow the worker budget.** `Supabase.ai.Session("gte-small")` runs
  on the Edge Function CPU; a handful of chunks can exceed the free-tier CPU-time limit even for a
  ~13 KB file. Full-text search avoids this entirely. If you need semantic search, move embedding
  to a background job / batches rather than embedding inline on upload.
- **Keyword, not semantic.** FTS won't match paraphrases/synonyms. Keep chunks reasonably sized
  and rely on the documents containing the query's terms.
- **Generated column backfills automatically.** Adding `content_tsv GENERATED ALWAYS ... STORED`
  to an existing table populates it for current rows — no re-ingest needed for already-stored text.
- **Language config matters.** `to_tsvector('english', ...)` and `websearch_to_tsquery('english', ...)`
  must use the same config. Switch the language if your documents aren't English.
- **Empty query → no matches.** A query of only stop words yields an empty `tsquery`; the chat
  then answers from general knowledge. That's the intended graceful fallback.

## Maps to the spec
- §3.3 answers grounded on the user's documents; retrieval method is the implementer's choice
  (full-text is explicitly allowed).
- §3.4 RAG tables defined as migrations, RLS-scoped per user.
- §2 LLM stays OpenRouter-only; retrieval needs no third-party provider at all.
