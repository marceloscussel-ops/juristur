-- ============================================================
-- Indicadores comissionados (partners)
-- Idempotente: pode rodar mais de uma vez sem erro.
--
-- Um indicador é uma relação COMERCIAL (ex.: UNAV), com percentual e
-- repasse — diferente de `agencies.origem`, que é canal de marketing e
-- existe só para medir aquisição. Os dois convivem: uma agência pode ter
-- vindo de um evento E ter sido indicada.
--
-- Por que não reaproveitar `origem_campanha`: aquela etiqueta é a REGRA da
-- promoção de evento (ver src/lib/promo.ts — 'unav-2026' concede 14 meses).
-- Usá-la para comissão daria desconto a quem não deveria ter, e o slug está
-- impresso em QR code: não se corrige depois.
-- ============================================================

CREATE TABLE IF NOT EXISTS partners (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Aparece no link de indicação: turisguard.com/i/<slug>
  slug           TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  -- Percentual sobre o valor RECEBIDO (10 = 10%). Nasce em 0 de propósito:
  -- o número é combinação comercial, não padrão de sistema.
  commission_pct NUMERIC NOT NULL DEFAULT 0,
  -- true  = comissiona toda renovação enquanto a agência pagar
  -- false = comissiona apenas a primeira venda
  recurring      BOOLEAN NOT NULL DEFAULT true,
  active         BOOLEAN NOT NULL DEFAULT true,
  contact_name   TEXT,
  contact_email  TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Atribuição da agência ao indicador. Gravada UMA VEZ, no cadastro: sem isso,
-- uma visita posterior pelo link de outro indicador roubaria uma conta já
-- atribuída — e o erro só apareceria na hora de pagar a comissão.
-- ON DELETE SET NULL: apagar um indicador não apaga a agência dele.
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id) ON DELETE SET NULL;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS partner_attributed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS agencies_partner_idx ON agencies(partner_id);

-- Só o service role lê/escreve: partners é dado comercial, não de agência.
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Extrato de comissões
--
-- A fonte do dinheiro é `billing_events` — ela JÁ é o livro-caixa, gravada
-- pelo webhook do Asaas. Base CAIXA, não base contrato: o anual em 12x gera
-- 12 PAYMENT_CONFIRMED e a comissão pinga mês a mês, acompanhando o que
-- entrou de verdade. Estorno entra com sinal negativo e se abate sozinho.
--
-- CHECKOUT_PAID não aparece aqui porque não traz `value` (o evento não tem
-- objeto `payment`); o pagamento de verdade chega logo depois.
-- ============================================================
CREATE OR REPLACE VIEW partner_commissions AS
SELECT
  be.id                                      AS event_id,
  be.created_at,
  be.event,
  be.billing_type,
  p.id                                       AS partner_id,
  p.name                                     AS partner_name,
  p.slug                                     AS partner_slug,
  p.commission_pct,
  p.recurring,
  a.id                                       AS agency_id,
  a.name                                     AS agency_name,
  a.plan,
  a.billing_cycle,
  a.subscription_status,
  CASE WHEN be.event = 'PAYMENT_REFUNDED' THEN -be.value ELSE be.value END AS value,
  ROUND(
    (CASE WHEN be.event = 'PAYMENT_REFUNDED' THEN -be.value ELSE be.value END)
    * p.commission_pct / 100,
    2
  )                                          AS commission
FROM billing_events be
JOIN agencies a ON a.id = be.agency_id
JOIN partners  p ON p.id = a.partner_id
WHERE be.event IN ('PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'PAYMENT_REFUNDED')
  AND be.value IS NOT NULL;

-- A view lê `agencies` por cima do RLS (views não são security_invoker por
-- padrão). Fechada para o cliente: quem a consulta é o painel, pelo service role.
REVOKE ALL ON partner_commissions FROM anon, authenticated;
GRANT SELECT ON partner_commissions TO service_role;

-- Primeiro indicador: 10% sobre o que as agências indicadas pagarem, em toda
-- renovação enquanto pagarem (não só na primeira venda).
--
-- ON CONFLICT DO NOTHING: num banco que já tem a linha, rodar isto de novo não
-- desfaz um percentual renegociado depois.
INSERT INTO partners (slug, name, commission_pct, recurring)
VALUES ('unav', 'UNAV', 10, true)
ON CONFLICT (slug) DO NOTHING;
