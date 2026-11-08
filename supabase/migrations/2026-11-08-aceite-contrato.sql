-- ============================================================
-- Aceite do contrato de licença de uso (TurisGuard)
--
-- O contrato é aceito em dois momentos: ao se cadastrar e ao
-- assinar/renovar um plano. Cada aceite é uma LINHA NOVA — nunca
-- um UPDATE —, porque o que vale juridicamente é o registro do
-- ato: data, hora, conta, IP, versão do texto e o Anexo I com os
-- dados da agência e do plano vigentes naquele instante.
--
-- `contract_text` guarda o markdown completo (corpo genérico +
-- Anexo I) como estava no aceite. Fica redundante com o código em
-- src/lib/contrato/termos.ts de propósito: quando o corpo mudar e
-- a versão subir, o PDF de um aceite antigo continua reproduzível
-- sem precisar manter versões velhas do texto no repositório.
--
-- Idempotente: pode rodar mais de uma vez.
-- ============================================================

CREATE TABLE IF NOT EXISTS contract_acceptances (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id  UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,

  -- Versão do corpo genérico aceita (CONTRATO_VERSAO).
  version    TEXT NOT NULL,

  -- Momento em que o aceite foi colhido.
  event      TEXT NOT NULL
               CHECK (event IN ('cadastro', 'assinatura', 'renovacao')),

  -- Anexo I estruturado (agência, plano, modalidade, valor, pagamento).
  anexo      JSONB NOT NULL DEFAULT '{}',

  -- Contrato completo em markdown, congelado no aceite.
  contract_text TEXT,

  -- Prova do ato: de onde e com qual navegador o aceite foi dado.
  ip         TEXT,
  user_agent TEXT,

  accepted_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS contract_acceptances_agency_idx
  ON contract_acceptances(agency_id, accepted_at DESC);

ALTER TABLE contract_acceptances ENABLE ROW LEVEL SECURITY;

-- A agência LÊ os próprios aceites, mas não os cria nem altera pelo client:
-- a escrita é só pelo service role (rotas de cadastro e de checkout), para o
-- registro não poder ser forjado ou apagado de dentro do navegador.
DROP POLICY IF EXISTS "contract_acceptances_read_own" ON contract_acceptances;
CREATE POLICY "contract_acceptances_read_own" ON contract_acceptances
  FOR SELECT USING (auth.uid() = agency_id);
