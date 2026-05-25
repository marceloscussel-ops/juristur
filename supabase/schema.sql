-- ============================================================
-- JurisTur — Schema SQL completo para Supabase
-- Idempotente: pode ser rodado mais de uma vez sem erros
-- ============================================================

-- ============================================================
-- Extensões
-- ============================================================
CREATE EXTENSION IF NOT EXISTS vector;  -- pgvector (habilitar no dashboard antes)

-- ============================================================
-- Tabelas principais
-- ============================================================

-- Agências (vinculada ao Auth via id = auth.users.id)
CREATE TABLE IF NOT EXISTS agencies (
  id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  cnpj      TEXT NOT NULL,
  email     TEXT NOT NULL UNIQUE,
  phone     TEXT UNIQUE,               -- número WhatsApp com DDI (ex: 5511999999999)
  plan      TEXT NOT NULL DEFAULT 'free'
              CHECK (plan IN ('free', 'basic', 'pro')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Colunas novas em agencies (idempotente para bancos já existentes)
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS plan  TEXT NOT NULL DEFAULT 'free';

-- Casos
CREATE TABLE IF NOT EXISTS cases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  title       TEXT,
  description TEXT NOT NULL,
  category    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'em_analise'
                CHECK (status IN ('em_analise', 'concluido', 'arquivado')),
  origin      TEXT NOT NULL DEFAULT 'web'
                CHECK (origin IN ('web', 'whatsapp')),
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE cases ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'web';
ALTER TABLE cases ALTER COLUMN title DROP NOT NULL;  -- título é opcional (WhatsApp não tem)

-- Arquivos do caso
CREATE TABLE IF NOT EXISTS case_files (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id        UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  file_url       TEXT NOT NULL,
  file_name      TEXT NOT NULL,
  file_type      TEXT NOT NULL,
  extracted_text TEXT,                  -- texto extraído para enviar à IA
  created_at     TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE case_files ADD COLUMN IF NOT EXISTS extracted_text TEXT;

-- Análises da IA
CREATE TABLE IF NOT EXISTS case_analyses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id      UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  ai_response  TEXT NOT NULL,
  tokens_used  INT,                     -- total de tokens consumidos na chamada
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE case_analyses ADD COLUMN IF NOT EXISTS tokens_used INT;

-- ============================================================
-- Sessões WhatsApp
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id     UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  phone         TEXT NOT NULL,
  current_state TEXT NOT NULL,
  -- Estados: awaiting_category | awaiting_description |
  --          awaiting_files | processing | completed
  case_id       UUID REFERENCES cases(id),
  session_data  JSONB NOT NULL DEFAULT '{}',
  updated_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================
-- Base de conhecimento RAG
-- ============================================================
CREATE TABLE IF NOT EXISTS rag_cases (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category               TEXT NOT NULL,
  problem_description    TEXT NOT NULL,
  applicable_laws        TEXT[],
  analysis               TEXT NOT NULL,
  recommended_resolution TEXT NOT NULL,
  actual_outcome         TEXT,
  embedding              vector(1536),   -- gerado pela OpenAI text-embedding-3-small
  created_at             TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================
-- Índices
-- ============================================================
CREATE INDEX IF NOT EXISTS cases_agency_id_idx          ON cases(agency_id);
CREATE INDEX IF NOT EXISTS cases_origin_idx             ON cases(origin);
CREATE INDEX IF NOT EXISTS case_files_case_id_idx       ON case_files(case_id);
CREATE INDEX IF NOT EXISTS case_analyses_case_id_idx    ON case_analyses(case_id);
CREATE INDEX IF NOT EXISTS whatsapp_sessions_phone_idx  ON whatsapp_sessions(phone);
CREATE INDEX IF NOT EXISTS whatsapp_sessions_agency_idx ON whatsapp_sessions(agency_id);

-- Índice vetorial para busca por similaridade (RAG)
CREATE INDEX IF NOT EXISTS rag_cases_embedding_idx
  ON rag_cases
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE agencies           ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases              ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_files         ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_analyses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sessions  ENABLE ROW LEVEL SECURITY;
-- rag_cases: sem RLS (leitura pública + escrita via service role)

-- Policies: agencies
DROP POLICY IF EXISTS "agencies_own" ON agencies;
CREATE POLICY "agencies_own" ON agencies
  FOR ALL USING (auth.uid() = id);

-- Policies: cases
DROP POLICY IF EXISTS "cases_own" ON cases;
CREATE POLICY "cases_own" ON cases
  FOR ALL USING (auth.uid() = agency_id);

-- Policies: case_files
DROP POLICY IF EXISTS "case_files_own" ON case_files;
CREATE POLICY "case_files_own" ON case_files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_files.case_id
        AND cases.agency_id = auth.uid()
    )
  );

-- Policies: case_analyses
DROP POLICY IF EXISTS "case_analyses_own" ON case_analyses;
CREATE POLICY "case_analyses_own" ON case_analyses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_analyses.case_id
        AND cases.agency_id = auth.uid()
    )
  );

-- Policies: whatsapp_sessions (acesso via service role no webhook)
DROP POLICY IF EXISTS "whatsapp_sessions_own" ON whatsapp_sessions;
CREATE POLICY "whatsapp_sessions_own" ON whatsapp_sessions
  FOR ALL USING (auth.uid() = agency_id);

-- ============================================================
-- Função de busca RAG (similarity search)
-- ============================================================
CREATE OR REPLACE FUNCTION match_rag_cases(
  query_embedding vector(1536),
  match_count     int DEFAULT 3,
  match_threshold float DEFAULT 0.5
)
RETURNS TABLE (
  id                     uuid,
  category               text,
  problem_description    text,
  applicable_laws        text[],
  analysis               text,
  recommended_resolution text,
  similarity             float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.category,
    r.problem_description,
    r.applicable_laws,
    r.analysis,
    r.recommended_resolution,
    1 - (r.embedding <=> query_embedding) AS similarity
  FROM rag_cases r
  WHERE 1 - (r.embedding <=> query_embedding) > match_threshold
  ORDER BY r.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================
-- Trigger: criar agencies automaticamente no cadastro
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.agencies (id, name, cnpj, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name',  'Agência sem nome'),
    COALESCE(NEW.raw_user_meta_data->>'cnpj',  '00.000.000/0000-00'),
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- Storage bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('case-files', 'case-files', true)
ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "case_files_upload" ON storage.objects;
CREATE POLICY "case_files_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'case-files' AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "case_files_public_read" ON storage.objects;
CREATE POLICY "case_files_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'case-files');
