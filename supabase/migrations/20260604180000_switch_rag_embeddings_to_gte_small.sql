-- Switch RAG embeddings from 768-dim (external Lovable gateway) to 384-dim,
-- produced locally by Supabase's built-in gte-small model in the Edge Functions.
-- This removes the external embeddings dependency (keeps LLM routing OpenRouter-only)
-- and makes grounding work without a separate API key.
--
-- Old 768-dim vectors are incompatible with the new model, so existing RAG data is
-- cleared and must be re-uploaded. Deleting rag_files cascades to rag_chunks.

DELETE FROM public.rag_chunks;
DELETE FROM public.rag_files;

-- Resize the embedding column to gte-small's 384 dimensions.
DROP INDEX IF EXISTS public.rag_chunks_embedding_idx;

ALTER TABLE public.rag_chunks
  ALTER COLUMN embedding TYPE vector(384);

CREATE INDEX IF NOT EXISTS rag_chunks_embedding_idx
  ON public.rag_chunks USING hnsw (embedding vector_cosine_ops);

-- Recreate the matcher with a 384-dim query vector (signature otherwise unchanged).
CREATE OR REPLACE FUNCTION public.match_rag_chunks(
  query_embedding vector(384),
  match_user_id uuid,
  match_count int DEFAULT 6
)
RETURNS TABLE (
  id uuid,
  file_id uuid,
  content text,
  similarity float
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.file_id, c.content,
         1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.rag_chunks c
  WHERE c.user_id = match_user_id AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;
