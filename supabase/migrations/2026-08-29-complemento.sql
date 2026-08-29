-- ============================================================
-- Complemento (ressalva) de caso já aprovado
-- Idempotente: pode rodar mais de uma vez sem erro.
--
-- Regra de produto: a agência pode acrescentar UM complemento ao relato
-- original de um caso JÁ APROVADO. O texto original é preservado; o
-- complemento dispara uma reanálise da IA que volta para aprovação do
-- advogado (respeitando auto_approve).
-- ============================================================

-- Texto do complemento e quando foi adicionado.
-- complemented_at IS NOT NULL => já existe complemento (trava de "apenas um").
ALTER TABLE cases ADD COLUMN IF NOT EXISTS complement      TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS complemented_at TIMESTAMPTZ;

-- Marca a análise atual como reanálise disparada por um complemento,
-- para o painel do advogado deixar claro que é um caso pré-aprovado.
ALTER TABLE case_analyses ADD COLUMN IF NOT EXISTS from_complement BOOLEAN NOT NULL DEFAULT false;
