---
name: rag-pgvector-gte-small
description: Add document-grounded retrieval (RAG) to a Supabase app using pgvector for storage/search and the Edge runtime's built-in gte-small model for embeddings — no external embeddings API or key. Use when you want the chat to answer from a user's uploaded documents, scoped per user, with everything running inside Supabase.
---

# RAG with pgvector + Supabase gte-small embeddings

Embeddings run **locally** in the Edge Function via `Supabase.ai.Session("gte-small")` — no
external embeddings API. (OpenRouter has no `/embeddings` endpoint, so chat and embeddings use
different providers.) `gte-small` outputs **384-dim** vectors; the schema must match.

## Step 1 — pgvector schema (migration)

```sql
create extension if not exists vector;

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
  embedding vector(384)               -- gte-small dimension
);

CREATE INDEX IF NOT EXISTS rag_chunks_embedding_idx
  ON public.rag_chunks USING hnsw (embedding vector_cosine_ops);
```

Enable RLS + per-user policies on both tables (see `supabase-backend`).

## Step 2 — match function (cosine similarity, per user)

```sql
CREATE OR REPLACE FUNCTION public.match_rag_chunks(
  query_embedding vector(384),
  match_user_id uuid,
  match_count int DEFAULT 6
)
RETURNS TABLE (id uuid, file_id uuid, content text, similarity float)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.file_id, c.content, 1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.rag_chunks c
  WHERE c.user_id = match_user_id AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;
```

## Step 3 — ingest: chunk → embed locally → store

```ts
// Edge runtime provides Supabase.ai globally (no import, no key).
declare const Supabase: {
  ai: {
    Session: new (m: string) => {
      run: (
        i: string,
        o: { mean_pool: boolean; normalize: boolean },
      ) => Promise<number[]>;
    };
  };
};
const session = new Supabase.ai.Session("gte-small");

function chunkText(text: string, size = 1200, overlap = 150): string[] {
  /* sliding window */
}

const chunks = chunkText(extractedText).slice(0, MAX_CHUNKS); // see gotcha below
for (const content of chunks) {
  const embedding = await session.run(content, {
    mean_pool: true,
    normalize: true,
  }); // 384 floats
  // insert { user_id, file_id, chunk_index, content, embedding } into rag_chunks
}
```

Text extraction (PDF/DOCX/TXT → string) happens client-side; the function receives the text.

## Step 4 — retrieve at chat time and ground the answer

```ts
const qvec = await session.run(userQuestion, {
  mean_pool: true,
  normalize: true,
});
const { data: matches } = await admin.rpc("match_rag_chunks", {
  query_embedding: qvec,
  match_user_id: user.id,
  match_count: 6,
});
const context = (matches ?? [])
  .map((m, i) => `[Source ${i + 1}]\n${m.content}`)
  .join("\n\n---\n\n");
// Fold `context` into the system prompt, then make the OpenRouter call (see openrouter-forced-tool-calling).
```

That prompt assembly is all RAG adds to the model call.

## Gotchas

- **Dimensions must line up.** `gte-small` = 384. The column `vector(384)`, the index, and the
  function's `query_embedding vector(384)` must all match. Switching embedding models means a
  migration to the new dimension **and re-ingesting** (old vectors are incompatible).
- **`WORKER_RESOURCE_LIMIT` on ingest.** Embeddings run on the function's own CPU; embedding
  hundreds of chunks in one invocation exceeds the worker budget (especially on the free tier).
  Cap chunks per upload (we used a small `MAX_CHUNKS`, e.g. 8 on free tier) — or batch across
  multiple invocations for full coverage. A single small file (1 chunk) succeeding while a large
  file fails is the signature of this limit, not "gte-small doesn't work".
- **No OpenRouter embeddings.** Don't try to embed through OpenRouter — it only does
  chat-completions. gte-small (local) keeps you off external embedding keys entirely.
- **Input length.** gte-small handles ~512 tokens; very long chunks get truncated. Keep chunks
  modest (~1–1.5k chars).
- **Grounding silently empty?** If retrieval returns nothing, the model answers from general
  knowledge. Verify the file reached `ready` and that `rag_chunks` actually has rows for it.
