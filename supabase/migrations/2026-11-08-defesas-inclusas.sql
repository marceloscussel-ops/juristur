-- ============================================================
-- Defesas inclusas no plano (Professional = 1/ano, Enterprise = 3/ano)
--
-- Regra de produto (espelha a Cláusula Terceira do contrato):
--   · Essential      → nenhuma defesa inclusa (pode escalonar, com custo)
--   · Professional   → 1 defesa por ano de assinatura
--   · Enterprise     → 3 defesas por ano de assinatura
--   · Período gratuito → 2 solicitações (TRIAL_ESCALATIONS, em plans.ts)
--   · Carência de 60 dias a partir da ativação do plano: antes disso a
--     defesa inclusa ainda não pode ser usada.
--
-- Quem decide que uma defesa foi REALMENTE utilizada é o advogado, no
-- painel /lawyer/defesas: a agência cria a solicitação (status
-- 'solicitada') e só o advogado a marca como 'utilizada'. Por isso a
-- contagem da cota vive nesta tabela e não em `cases.escalated_at` —
-- pedir defesa não é o mesmo que consumir a defesa do plano.
--
-- `consumes_quota` separa a defesa inclusa da defesa cobrada à parte
-- (escalonamento adicional, previsto no Parágrafo Terceiro da cláusula):
-- as duas ficam registradas, mas só a primeira desconta da cota.
--
-- Idempotente: pode rodar mais de uma vez.
-- ============================================================

-- ─── Data de ativação do plano pago ──────────────────────────────────────────
-- Âncora do "ano de assinatura" (janela da cota) e da carência de 60 dias.
-- Gravada pelo webhook de cobrança na PRIMEIRA ativação e nunca sobrescrita:
-- a renovação continua no mesmo aniversário.
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMPTZ;

-- Backfill: para quem já é assinante, a ativação é o primeiro evento de
-- pagamento confirmado; sem evento, cai no cadastro (nunca deixa NULL em
-- agência ativa, senão a cota não teria de onde contar).
UPDATE agencies a
   SET plan_started_at = COALESCE(
     (SELECT MIN(be.created_at) FROM billing_events be
       WHERE be.agency_id = a.id
         AND be.event IN ('CHECKOUT_PAID', 'PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED')),
     a.created_at
   )
 WHERE a.plan_started_at IS NULL
   AND (a.subscription_status IN ('active', 'canceled') OR a.access_until IS NOT NULL);

-- ─── Solicitações de defesa ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS defense_requests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id  UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,

  -- Defesa pode nascer de um caso já aberto ou de um pedido solto
  -- (botão "Solicitar defesa" sem caso). ON DELETE SET NULL: apagar o
  -- caso não pode apagar o histórico de consumo da cota.
  case_id    UUID REFERENCES cases(id) ON DELETE SET NULL,

  -- De onde partiu o pedido. 'advogado' = lançado pelo próprio advogado,
  -- para a defesa que chegou fora da plataforma (WhatsApp, telefone).
  origin     TEXT NOT NULL DEFAULT 'web'
               CHECK (origin IN ('web', 'whatsapp', 'advogado')),

  -- Natureza do escalonamento (Parágrafo Primeiro da Cláusula Terceira).
  kind       TEXT NOT NULL DEFAULT 'defesa'
               CHECK (kind IN ('contrato', 'defesa', 'audiencia', 'peca', 'outro')),

  -- 'solicitada' → na fila do advogado; 'utilizada' → confirmada por ele;
  -- 'descartada' → não houve atendimento (não consome cota).
  status     TEXT NOT NULL DEFAULT 'solicitada'
               CHECK (status IN ('solicitada', 'utilizada', 'descartada')),

  -- false = defesa atendida mas cobrada à parte: registra sem descontar.
  consumes_quota BOOLEAN NOT NULL DEFAULT true,

  -- O que a agência pediu (texto curto) e a anotação do advogado.
  subject      TEXT,
  lawyer_notes TEXT,

  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Quando o advogado marcou como utilizada. É a data que define em qual
  -- ano de assinatura a defesa foi consumida.
  used_at      TIMESTAMPTZ,
  decided_at   TIMESTAMPTZ,
  decided_by   UUID,                  -- auth.users.id do advogado
  -- Plano vigente no momento da marcação, congelado para auditoria.
  plan_at_use  TEXT,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contagem da cota: por agência, utilizadas no ano vigente.
CREATE INDEX IF NOT EXISTS defense_requests_agency_idx
  ON defense_requests(agency_id, status, used_at DESC);
-- Fila do advogado.
CREATE INDEX IF NOT EXISTS defense_requests_status_idx
  ON defense_requests(status, requested_at DESC);
CREATE INDEX IF NOT EXISTS defense_requests_case_idx
  ON defense_requests(case_id);

-- Um caso só gera uma solicitação de defesa (o botão é idempotente).
CREATE UNIQUE INDEX IF NOT EXISTS defense_requests_case_unique_idx
  ON defense_requests(case_id) WHERE case_id IS NOT NULL;

ALTER TABLE defense_requests ENABLE ROW LEVEL SECURITY;

-- A agência LÊ as próprias solicitações (a tela de defesa mostra o saldo).
-- Escrita só pelo service role: quem marca "utilizada" é o advogado, pelas
-- rotas de API. Por isso SELECT e não FOR ALL — uma agência que pudesse
-- escrever aqui zeraria a própria cota marcando `consumes_quota = false`.
--
-- Quem é "a agência" depende da migration do multiusuário: com
-- `agency_do_usuario()` no banco, qualquer usuário ativo da agência lê;
-- sem ela, vale o modelo antigo (agência = usuário). O bloco guardado deixa
-- esta migration rodar em qualquer ordem em relação àquela — aplicada a
-- outra depois, basta rodá-la de novo (ela também é idempotente).
DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "defense_requests_read_own" ON defense_requests';
  EXECUTE 'DROP POLICY IF EXISTS "defense_requests_agencia" ON defense_requests';
  IF to_regproc('public.agency_do_usuario') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY "defense_requests_agencia" ON defense_requests
               FOR SELECT USING (agency_id = public.agency_do_usuario())';
  ELSE
    EXECUTE 'CREATE POLICY "defense_requests_agencia" ON defense_requests
               FOR SELECT USING (auth.uid() = agency_id)';
  END IF;
END $$;
