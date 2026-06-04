-- Switch RAG retrieval from vector embeddings to Postgres full-text search.
-- Embeddings ran on the Edge Function's CPU and tripped CPU-time limits on the free tier
-- even for small documents. Full-text search runs entirely in Postgres with no per-request
-- compute, so ingest/chat never hit worker resource limits.

-- Indexed text column (generated from content) + GIN index for fast full-text queries.
ALTER TABLE public.rag_chunks
  ADD COLUMN IF NOT EXISTS content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX IF NOT EXISTS rag_chunks_tsv_idx
  ON public.rag_chunks USING gin (content_tsv);

-- Drop the now-unused vector machinery.
DROP INDEX IF EXISTS public.rag_chunks_embedding_idx;
ALTER TABLE public.rag_chunks DROP COLUMN IF EXISTS embedding;

-- Replace the matcher: query by text instead of a query vector.
DROP FUNCTION IF EXISTS public.match_rag_chunks(vector, uuid, int);

CREATE OR REPLACE FUNCTION public.match_rag_chunks(
  query_text text,
  match_user_id uuid,
  match_count int DEFAULT 6
)
RETURNS TABLE (
  id uuid,
  file_id uuid,
  content text,
  rank float
)
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
