-- ============================================================
-- Feedback rápido (👍 / 👎) nas análises e nos documentos
--
-- A agência vota logo abaixo da resposta da IA (caso) ou do documento
-- gerado. O voto é gravado no clique; motivos e comentário são opcionais
-- e chegam depois, na mesma linha (upsert).
--
-- Um feedback por usuário e por item: votar de novo troca o voto em vez
-- de empilhar linhas.
--
-- `analysis_id`: o caso pode ganhar uma nova análise (complemento). Guardar
-- qual versão foi avaliada evita que um 👎 antigo pareça ser sobre a nova.
-- Sem foreign key de propósito, para a análise poder ser trocada sem
-- arrastar o feedback junto.
--
-- Idempotente: pode rodar mais de uma vez.
-- ============================================================

CREATE TABLE IF NOT EXISTS feedback (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id    UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  -- Sem FK para auth.users: mesma regra de `cases.created_by`.
  user_id      UUID NOT NULL,
  target_type  TEXT NOT NULL CHECK (target_type IN ('case', 'document')),
  target_id    UUID NOT NULL,
  analysis_id  UUID,
  rating       SMALLINT NOT NULL CHECK (rating IN (-1, 1)),
  reasons      TEXT[] NOT NULL DEFAULT '{}',
  comment      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS feedback_created_idx ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_target_idx  ON feedback(target_type, target_id);

-- Sem policies: leitura e escrita passam por /api/feedback e pelo painel
-- admin, ambos com service role. A rota confere que o caso/documento é da
-- agência do usuário antes de gravar.
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
