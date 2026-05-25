-- ============================================================
-- JurisTur MVP1 — Schema SQL para Supabase
-- Execute este arquivo no SQL Editor do Supabase
-- Idempotente: pode ser rodado mais de uma vez sem erros
-- ============================================================

-- Tabela de agências (vinculada ao Auth)
CREATE TABLE IF NOT EXISTS agencies (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabela de casos
CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'em_analise'
    CHECK (status IN ('em_analise', 'concluido', 'arquivado')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabela de arquivos do caso
CREATE TABLE IF NOT EXISTS case_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabela de análises da IA
CREATE TABLE IF NOT EXISTS case_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  ai_response TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS cases_agency_id_idx ON cases(agency_id);
CREATE INDEX IF NOT EXISTS case_files_case_id_idx ON case_files(case_id);
CREATE INDEX IF NOT EXISTS case_analyses_case_id_idx ON case_analyses(case_id);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_analyses ENABLE ROW LEVEL SECURITY;

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
      SELECT 1 FROM cases WHERE cases.id = case_files.case_id AND cases.agency_id = auth.uid()
    )
  );

-- Policies: case_analyses
DROP POLICY IF EXISTS "case_analyses_own" ON case_analyses;
CREATE POLICY "case_analyses_own" ON case_analyses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cases WHERE cases.id = case_analyses.case_id AND cases.agency_id = auth.uid()
    )
  );

-- ============================================================
-- Trigger: criar registro em agencies automaticamente ao cadastrar
-- Garante que nenhum usuário fique "orphan" (auth sem agencies)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.agencies (id, name, cnpj, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Agência sem nome'),
    COALESCE(NEW.raw_user_meta_data->>'cnpj', '00.000.000/0000-00'),
    NEW.email
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

-- Policies de storage
DROP POLICY IF EXISTS "case_files_upload" ON storage.objects;
CREATE POLICY "case_files_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'case-files' AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "case_files_public_read" ON storage.objects;
CREATE POLICY "case_files_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'case-files');
