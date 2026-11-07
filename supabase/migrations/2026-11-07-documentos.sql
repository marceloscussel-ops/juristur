-- ============================================================
-- Documentos gerados (contratos e outros)
--
-- A plataforma passa a ter quatro ações: dúvida jurídica (cases),
-- gerar contrato, gerar outros documentos e solicitar defesa.
-- Contrato e "outros documentos" vivem aqui, numa tabela própria:
-- não têm análise, severidade nem revisão por advogado, então
-- reaproveitar `cases` jogaria lixo na fila do advogado.
--
-- O painel da agência lista `cases` e `documents` juntos, ordenados
-- por data — a separação é só de persistência.
--
-- Idempotente: pode rodar mais de uma vez.
-- ============================================================

CREATE TABLE IF NOT EXISTS documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,

  -- 'contrato' parte de um modelo base; 'outro' nasce em branco.
  kind        TEXT NOT NULL DEFAULT 'contrato'
                CHECK (kind IN ('contrato', 'outro')),

  -- Para kind='contrato': id do modelo base usado (ver src/lib/templates).
  -- Para kind='outro': rótulo livre do tipo (e-mail, termo de ciência...).
  template_id TEXT,
  doc_type    TEXT,

  title       TEXT,
  -- Instruções/dados que a agência digitou (prompt).
  prompt      TEXT,
  -- Dados do consumidor extraídos dos documentos anexados + prompt.
  client_data JSONB NOT NULL DEFAULT '{}',
  -- Documento gerado, em markdown. NULL enquanto a geração não terminou.
  content     TEXT,

  status      TEXT NOT NULL DEFAULT 'rascunho'
                CHECK (status IN ('rascunho', 'confirmado', 'arquivado')),

  tokens_used INT,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Arquivos enviados como fonte de dados do documento (RG, CPF, voucher...).
CREATE TABLE IF NOT EXISTS document_files (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id    UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  file_url       TEXT NOT NULL,
  file_name      TEXT NOT NULL,
  file_type      TEXT NOT NULL,
  extracted_text TEXT,
  created_at     TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS documents_agency_id_idx     ON documents(agency_id);
CREATE INDEX IF NOT EXISTS documents_created_at_idx    ON documents(agency_id, created_at DESC);
CREATE INDEX IF NOT EXISTS document_files_doc_id_idx   ON document_files(document_id);

-- ─── RLS ─────────────────────────────────────────────────────
ALTER TABLE documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_own" ON documents;
CREATE POLICY "documents_own" ON documents
  FOR ALL USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "document_files_own" ON document_files;
CREATE POLICY "document_files_own" ON document_files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_files.document_id
        AND documents.agency_id = auth.uid()
    )
  );

-- ─── Storage ─────────────────────────────────────────────────
-- Mesmo bucket dos casos: os anexos são da mesma natureza e já
-- existem policies de upload/leitura para usuários autenticados.
