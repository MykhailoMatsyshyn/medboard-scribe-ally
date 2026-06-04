-- Enable pgvector
create extension if not exists vector;

-- rag_files table
CREATE TABLE public.rag_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  storage_path text not null,
  status text not null default 'pending', -- pending | ready | error
  error_message text,
  chunk_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rag_files TO authenticated;
GRANT ALL ON public.rag_files TO service_role;

ALTER TABLE public.rag_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own rag files" ON public.rag_files
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own rag files" ON public.rag_files
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own rag files" ON public.rag_files
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own rag files" ON public.rag_files
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_rag_files_updated_at
BEFORE UPDATE ON public.rag_files
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- rag_chunks table (768-dim to fit pgvector HNSW limits)
CREATE TABLE public.rag_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  file_id uuid not null references public.rag_files(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding vector(768),
  created_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rag_chunks TO authenticated;
GRANT ALL ON public.rag_chunks TO service_role;

ALTER TABLE public.rag_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own rag chunks" ON public.rag_chunks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own rag chunks" ON public.rag_chunks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own rag chunks" ON public.rag_chunks
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX rag_chunks_embedding_idx
  ON public.rag_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX rag_chunks_user_idx ON public.rag_chunks(user_id);
CREATE INDEX rag_chunks_file_idx ON public.rag_chunks(file_id);

-- Match function (security definer; filters by user_id arg, but caller's RLS still applies on read)
CREATE OR REPLACE FUNCTION public.match_rag_chunks(
  query_embedding vector(768),
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

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('rag-files', 'rag-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can manage their own folder (path = userId/...)
CREATE POLICY "Users read own rag files storage" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'rag-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own rag files storage" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'rag-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own rag files storage" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'rag-files' AND auth.uid()::text = (storage.foldername(name))[1]);