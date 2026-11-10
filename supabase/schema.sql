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
  plan      TEXT NOT NULL DEFAULT 'free',
  subscription_status TEXT NOT NULL DEFAULT 'trial',
  trial_ends_at       TIMESTAMPTZ,     -- fim do acesso gratuito (piloto: created_at + 30 dias)
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Colunas novas em agencies (idempotente para bancos já existentes)
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS plan  TEXT NOT NULL DEFAULT 'free';
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trial';
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Constraints de plano e status (recriadas de forma idempotente)
UPDATE agencies SET plan = 'free'
  WHERE plan NOT IN ('free', 'essencial', 'profissional', 'enterprise');
ALTER TABLE agencies DROP CONSTRAINT IF EXISTS agencies_plan_check;
ALTER TABLE agencies ADD  CONSTRAINT agencies_plan_check
  CHECK (plan IN ('free', 'essencial', 'profissional', 'enterprise'));

ALTER TABLE agencies DROP CONSTRAINT IF EXISTS agencies_subscription_status_check;
ALTER TABLE agencies ADD  CONSTRAINT agencies_subscription_status_check
  CHECK (subscription_status IN ('trial', 'active', 'expired', 'canceled'));

-- Backfill: agências existentes ganham 30 dias de piloto a partir do cadastro
UPDATE agencies
  SET trial_ends_at = created_at + INTERVAL '30 days'
  WHERE trial_ends_at IS NULL;

-- Cobrança Asaas (idempotente para bancos já existentes)
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS asaas_customer_id     TEXT;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS asaas_checkout_id     TEXT;  -- sessão de checkout (Asaas Checkout)
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT;  -- plano mensal (assinatura)
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS asaas_payment_id      TEXT;  -- plano anual (cobrança avulsa)
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS billing_cycle         TEXT;  -- 'mensal' | 'anual'
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS access_until          TIMESTAMPTZ; -- fim do acesso pago

-- Endereço (para pré-carregar o checkout do Asaas — evita o cliente redigitar)
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS cep              TEXT;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS endereco         TEXT;  -- logradouro
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS endereco_numero  TEXT;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS bairro           TEXT;  -- province no Asaas
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS cidade           TEXT;

-- ============================================================
-- Múltiplos usuários por agência
--
-- `agencies.id` é o id do TITULAR (quem criou a conta e assina). Para os
-- planos com 3 e 5 usuários, `agency_members` liga cada usuário do Auth a
-- uma agência — a linha do titular é a que tem `user_id = agency_id`.
-- Nenhuma coluna de dono mudou: `cases.agency_id` e `documents.agency_id`
-- continuam apontando para a agência.
--
-- Vem antes das policies de propósito: elas chamam as funções definidas
-- aqui, e uma policy que referencia função inexistente não é criada.
-- ============================================================
CREATE TABLE IF NOT EXISTS agency_members (
  -- PK no usuário: um usuário pertence a UMA agência. É o que torna
  -- `agency_do_usuario()` determinística (e a RLS, barata).
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id    UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  papel        TEXT NOT NULL DEFAULT 'membro'
                 CHECK (papel IN ('titular', 'membro')),
  nome         TEXT,
  telefone     TEXT,                  -- WhatsApp do usuário (formato Z-API, 12 dígitos)
  email        TEXT,
  status       TEXT NOT NULL DEFAULT 'convidado'
                 CHECK (status IN ('convidado', 'ativo', 'suspenso')),
  convidado_em TIMESTAMPTZ,
  aceito_em    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS agency_members_agency_idx ON agency_members(agency_id);

-- Telefone é único GLOBAL: o webhook do WhatsApp identifica quem está falando
-- só pelo número, então dois usuários com o mesmo WhatsApp fariam a mensagem
-- de um cair na agência do outro.
CREATE UNIQUE INDEX IF NOT EXISTS agency_members_telefone_idx
  ON agency_members(telefone) WHERE telefone IS NOT NULL;

-- Um titular por agência: é dele que saem cobrança, plano e gestão de usuários.
CREATE UNIQUE INDEX IF NOT EXISTS agency_members_titular_idx
  ON agency_members(agency_id) WHERE papel = 'titular';

-- Backfill: toda agência existente ganha o seu titular ativo. Sem isto
-- `agency_do_usuario()` devolveria NULL e a RLS trancaria todo mundo fora.
INSERT INTO agency_members (user_id, agency_id, papel, nome, telefone, email, status, aceito_em, created_at)
SELECT a.id, a.id, 'titular', a.name, a.phone, a.email, 'ativo', a.created_at, a.created_at
FROM agencies a
ON CONFLICT (user_id) DO NOTHING;

-- Resolução da agência de quem está chamando — base de toda a RLS.
--
-- SECURITY DEFINER é OBRIGATÓRIO: uma policy de `cases` que consultasse
-- `agency_members` diretamente acionaria a RLS de `agency_members`, que chama
-- esta resolução — recursão infinita (42P17). Rodando como dona da função, a
-- consulta interna não passa por RLS.
--
-- Não é buraco de segurança: a função não aceita parâmetro, só responde "qual
-- é a agência de quem está chamando". Sem sessão, auth.uid() é NULL, nenhuma
-- linha casa, o retorno é NULL — e `agency_id = NULL` nunca é verdadeiro.
CREATE OR REPLACE FUNCTION public.agency_do_usuario()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.agency_id
  FROM public.agency_members m
  WHERE m.user_id = auth.uid()
    AND m.status  = 'ativo'
  LIMIT 1;
$$;

-- Titular: quem pode mexer em cobrança, plano, dados da agência e equipe.
CREATE OR REPLACE FUNCTION public.e_titular_da_agencia()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agency_members m
    WHERE m.user_id = auth.uid()
      AND m.status  = 'ativo'
      AND m.papel   = 'titular'
  );
$$;

GRANT EXECUTE ON FUNCTION public.agency_do_usuario()    TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.e_titular_da_agencia() TO authenticated, anon, service_role;

ALTER TABLE agency_members ENABLE ROW LEVEL SECURITY;

-- A equipe inteira se enxerga (a tela de equipe mostra papel e status de
-- todos). Escrita não tem policy: convidar, suspender e remover passam pelas
-- rotas de API com service role, que validam o titular e o assento do plano.
DROP POLICY IF EXISTS "agency_members_read" ON agency_members;
CREATE POLICY "agency_members_read" ON agency_members
  FOR SELECT USING (agency_id = public.agency_do_usuario());

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
ALTER TABLE cases ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;  -- quando o caso foi escalado a um advogado
-- Complemento (ressalva) da agência a um caso já aprovado. O relato original
-- (description) é preservado; complemented_at != NULL trava para um único complemento.
ALTER TABLE cases ADD COLUMN IF NOT EXISTS complement      TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS complemented_at TIMESTAMPTZ;
-- Autoria: qual usuário da agência registrou o caso. Sem foreign key para
-- auth.users de propósito — com FK, remover alguém da equipe cascatearia (ou
-- travaria) nos casos da agência, e o histórico jurídico da empresa não pode
-- depender de quem continua na conta. Linhas antigas ficam NULL.
ALTER TABLE cases ADD COLUMN IF NOT EXISTS created_by UUID;
-- Índice parcial para contar escaladas por agência (cota de escaladas gratuitas)
CREATE INDEX IF NOT EXISTS cases_escalated_idx ON cases(agency_id) WHERE escalated_at IS NOT NULL;

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
ALTER TABLE case_analyses ADD COLUMN IF NOT EXISTS severity TEXT;  -- leve | medio | elevado | elevadissimo
-- Marca que a análise atual foi regerada por um complemento da agência (flag p/ o advogado).
ALTER TABLE case_analyses ADD COLUMN IF NOT EXISTS from_complement BOOLEAN NOT NULL DEFAULT false;

-- Mensagens de acompanhamento (follow-up após análise inicial)
CREATE TABLE IF NOT EXISTS case_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id    UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

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
-- Eventos de cobrança Asaas (auditoria + idempotência do webhook)
-- ============================================================
CREATE TABLE IF NOT EXISTS billing_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id             UUID REFERENCES agencies(id) ON DELETE SET NULL,
  event                 TEXT NOT NULL,          -- PAYMENT_CONFIRMED, PAYMENT_RECEIVED, ...
  asaas_payment_id      TEXT,
  asaas_subscription_id TEXT,
  billing_type          TEXT,
  value                 NUMERIC,
  status                TEXT,
  raw                   JSONB NOT NULL,
  created_at            TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Dedupe: o Asaas reenvia eventos até receber 2xx. Um mesmo (evento + cobrança)
-- só pode ser processado uma vez. COALESCE evita colisão quando payment_id é NULL.
CREATE UNIQUE INDEX IF NOT EXISTS billing_events_dedupe_idx
  ON billing_events(event, COALESCE(asaas_payment_id, ''));

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
CREATE INDEX IF NOT EXISTS case_messages_case_id_idx    ON case_messages(case_id);
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
ALTER TABLE case_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events     ENABLE ROW LEVEL SECURITY;
-- rag_cases: sem RLS (leitura pública + escrita via service role)
-- billing_events: sem policy — apenas o service role (webhook) lê/escreve

-- Policies: agencies
-- `agency_do_usuario()` (definida na seção "Múltiplos usuários por agência")
-- é a resolução da agência do usuário. Membro lê, só o titular atualiza;
-- INSERT/DELETE ficam sem policy — são trabalho das rotas com service role.
DROP POLICY IF EXISTS "agencies_own"    ON agencies;
DROP POLICY IF EXISTS "agencies_read"   ON agencies;
DROP POLICY IF EXISTS "agencies_update" ON agencies;

CREATE POLICY "agencies_read" ON agencies
  FOR SELECT USING (id = public.agency_do_usuario());

CREATE POLICY "agencies_update" ON agencies
  FOR UPDATE
  USING      (id = public.agency_do_usuario() AND public.e_titular_da_agencia())
  WITH CHECK (id = public.agency_do_usuario() AND public.e_titular_da_agencia());

-- Policies: cases
DROP POLICY IF EXISTS "cases_own" ON cases;
CREATE POLICY "cases_own" ON cases
  FOR ALL USING (agency_id = public.agency_do_usuario());

-- Policies: case_files
DROP POLICY IF EXISTS "case_files_own" ON case_files;
CREATE POLICY "case_files_own" ON case_files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_files.case_id
        AND cases.agency_id = public.agency_do_usuario()
    )
  );

-- Policies: case_analyses
DROP POLICY IF EXISTS "case_analyses_own" ON case_analyses;
CREATE POLICY "case_analyses_own" ON case_analyses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_analyses.case_id
        AND cases.agency_id = public.agency_do_usuario()
    )
  );

-- Policies: case_messages
DROP POLICY IF EXISTS "case_messages_own" ON case_messages;
CREATE POLICY "case_messages_own" ON case_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_messages.case_id
        AND cases.agency_id = public.agency_do_usuario()
    )
  );

-- Policies: whatsapp_sessions (acesso via service role no webhook)
DROP POLICY IF EXISTS "whatsapp_sessions_own" ON whatsapp_sessions;
CREATE POLICY "whatsapp_sessions_own" ON whatsapp_sessions
  FOR ALL USING (agency_id = public.agency_do_usuario());

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
--
-- Também é o ponto que resolve o convite: antes, TODO usuário novo do Auth
-- ganhava uma agência — um membro convidado entrava pelo mesmo caminho e
-- virava uma agência vazia em vez de entrar na agência do titular. Agora o
-- `agency_id` no metadata do convite decide qual dos dois caminhos vale.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_phone     TEXT := NEW.raw_user_meta_data->>'phone';
  v_agency_id UUID := NULLIF(NEW.raw_user_meta_data->>'agency_id', '')::UUID;
  v_nome      TEXT := NEW.raw_user_meta_data->>'name';
BEGIN
  -- Telefone é chave de busca do WhatsApp nas DUAS tabelas: se o número já é
  -- de outra conta, grava NULL em vez de deixar a violação de UNIQUE derrubar
  -- o insert. Ficar sem o canal de aviso é recuperável pelo /perfil; ficar sem
  -- vínculo com a agência não (todo caso quebraria na foreign key).
  IF v_phone IS NOT NULL AND (
       EXISTS (SELECT 1 FROM public.agencies a
                WHERE a.phone = v_phone AND a.id <> NEW.id)
    OR EXISTS (SELECT 1 FROM public.agency_members m
                WHERE m.telefone = v_phone AND m.user_id <> NEW.id)
  ) THEN
    v_phone := NULL;
  END IF;

  -- ── Convidado: entra numa agência que já existe ──
  IF v_agency_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.agencies WHERE id = v_agency_id) THEN
    -- `papel` é fixo em 'membro': o metadata vem de fora do banco, e deixá-lo
    -- escolher o papel transformaria um convite em promoção a titular.
    INSERT INTO public.agency_members
      (user_id, agency_id, papel, nome, telefone, email, status, convidado_em)
    VALUES (
      NEW.id, v_agency_id, 'membro',
      COALESCE(v_nome, split_part(NEW.email, '@', 1)),
      v_phone, NEW.email, 'convidado', now()
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;  -- nenhuma agência é criada para ele
  END IF;

  -- ── Cadastro comum: nasce a agência e o seu titular ──
  -- Novos cadastros: 7 dias de acesso gratuito. Agências do piloto (30 dias)
  -- mantêm o trial_ends_at já gravado na criação.
  INSERT INTO public.agencies (id, name, cnpj, email, phone, subscription_status, trial_ends_at)
  VALUES (
    NEW.id,
    COALESCE(v_nome, 'Agência sem nome'),
    COALESCE(NEW.raw_user_meta_data->>'cnpj',  '00.000.000/0000-00'),
    NEW.email,
    v_phone,
    'trial',
    now() + INTERVAL '7 days'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.agency_members
    (user_id, agency_id, papel, nome, telefone, email, status, aceito_em)
  VALUES (
    NEW.id, NEW.id, 'titular',
    COALESCE(v_nome, 'Agência sem nome'),
    v_phone, NEW.email, 'ativo', now()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- Trigger: convite aceito
--
-- O convidado entra em `agency_members` como 'convidado' e só passa a 'ativo'
-- quando prova que é dono do e-mail — o que o Auth registra em
-- `email_confirmed_at` ao abrir o link do convite. Enquanto for 'convidado',
-- `agency_do_usuario()` devolve NULL e ele não lê nada da agência.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_user_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.agency_members
      SET status = 'ativo', aceito_em = COALESCE(aceito_em, now())
      WHERE user_id = NEW.id
        AND status  = 'convidado';  -- nunca reativa quem o titular suspendeu
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_user_confirmed();

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

-- ============================================================
-- Documentos gerados (contratos e outros documentos)
--
-- Tabela própria, e não uma linha em `cases`: documentos não têm
-- análise, severidade nem revisão por advogado — reaproveitar
-- `cases` jogaria lixo na fila do advogado. O painel da agência
-- lista `cases` e `documents` juntos, ordenados por data; a
-- separação é só de persistência.
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL DEFAULT 'contrato'
                CHECK (kind IN ('contrato', 'outro')),
  template_id TEXT,                           -- modelo base (kind='contrato')
  doc_type    TEXT,                           -- rótulo do tipo (kind='outro')
  title       TEXT,
  prompt      TEXT,                           -- instruções/dados digitados
  client_data JSONB NOT NULL DEFAULT '{}',    -- dados do consumidor extraídos
  content     TEXT,                           -- documento gerado (markdown)
  status      TEXT NOT NULL DEFAULT 'rascunho'
                CHECK (status IN ('rascunho', 'confirmado', 'arquivado')),
  tokens_used INT,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Arquivos enviados como fonte de dados do documento (RG, CPF, voucher...)
CREATE TABLE IF NOT EXISTS document_files (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id    UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  file_url       TEXT NOT NULL,
  file_name      TEXT NOT NULL,
  file_type      TEXT NOT NULL,
  extracted_text TEXT,
  created_at     TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Autoria do documento. Mesmo desenho de `cases.created_by`: sem foreign key
-- para auth.users, para remover alguém da equipe não mexer no histórico.
ALTER TABLE documents ADD COLUMN IF NOT EXISTS created_by UUID;

CREATE INDEX IF NOT EXISTS documents_agency_id_idx   ON documents(agency_id);
CREATE INDEX IF NOT EXISTS documents_created_at_idx  ON documents(agency_id, created_at DESC);
CREATE INDEX IF NOT EXISTS document_files_doc_id_idx ON document_files(document_id);

ALTER TABLE documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_own" ON documents;
CREATE POLICY "documents_own" ON documents
  FOR ALL USING (agency_id = public.agency_do_usuario());

DROP POLICY IF EXISTS "document_files_own" ON document_files;
CREATE POLICY "document_files_own" ON document_files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_files.document_id
        AND documents.agency_id = public.agency_do_usuario()
    )
  );

-- ============================================================
-- Aceite do contrato de licença de uso
--
-- Aceito em dois momentos: no cadastro e ao assinar/renovar um
-- plano. Cada aceite é uma linha nova — o que vale é o registro
-- do ato (data, conta, IP, versão do texto e Anexo I com os dados
-- da agência e do plano daquele instante). `contract_text` guarda
-- o markdown completo para o PDF continuar reproduzível depois de
-- o corpo do contrato mudar de versão.
-- ============================================================
CREATE TABLE IF NOT EXISTS contract_acceptances (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id     UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  version       TEXT NOT NULL,
  event         TEXT NOT NULL
                  CHECK (event IN ('cadastro', 'assinatura', 'renovacao')),
  anexo         JSONB NOT NULL DEFAULT '{}',
  contract_text TEXT,
  ip            TEXT,
  user_agent    TEXT,
  accepted_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS contract_acceptances_agency_idx
  ON contract_acceptances(agency_id, accepted_at DESC);

ALTER TABLE contract_acceptances ENABLE ROW LEVEL SECURITY;

-- Leitura dos próprios aceites; escrita apenas pelo service role (rotas de
-- cadastro e de checkout), para o registro não poder ser forjado no navegador.
DROP POLICY IF EXISTS "contract_acceptances_read_own" ON contract_acceptances;
CREATE POLICY "contract_acceptances_read_own" ON contract_acceptances
  FOR SELECT USING (agency_id = public.agency_do_usuario());

-- ============================================================
-- Defesas inclusas no plano
--
-- Professional inclui 1 defesa por ano de assinatura e Enterprise 3;
-- Essential não inclui nenhuma (pode escalonar, com custo). As
-- quantidades vivem em src/lib/plans.ts — aqui ficam só os dados.
--
-- Quem decide que uma defesa foi REALMENTE utilizada é o advogado,
-- em /lawyer/defesas: a agência cria a solicitação ('solicitada') e
-- só a marcação do advogado ('utilizada') desconta da cota. Pedir
-- não é consumir — a maior parte dos pedidos morre numa orientação
-- por WhatsApp.
--
-- `consumes_quota` separa a defesa inclusa da defesa atendida mas
-- cobrada à parte (Cláusula Terceira, Parágrafo Terceiro).
-- ============================================================

-- Âncora do ano de assinatura (janela da cota) e da carência de 60 dias.
-- Gravada pelo webhook de cobrança na PRIMEIRA ativação; a renovação não
-- a sobrescreve, para o aniversário da cota não andar.
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS defense_requests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id  UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  -- Defesa pode nascer de um caso aberto ou de um pedido solto.
  -- SET NULL: apagar o caso não apaga o histórico de consumo da cota.
  case_id    UUID REFERENCES cases(id) ON DELETE SET NULL,
  origin     TEXT NOT NULL DEFAULT 'web'
               CHECK (origin IN ('web', 'whatsapp', 'advogado')),
  kind       TEXT NOT NULL DEFAULT 'defesa'
               CHECK (kind IN ('contrato', 'defesa', 'audiencia', 'peca', 'outro')),
  status     TEXT NOT NULL DEFAULT 'solicitada'
               CHECK (status IN ('solicitada', 'utilizada', 'descartada')),
  consumes_quota BOOLEAN NOT NULL DEFAULT true,
  subject      TEXT,
  lawyer_notes TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at      TIMESTAMPTZ,   -- define em qual ano de assinatura a defesa entra
  decided_at   TIMESTAMPTZ,
  decided_by   UUID,          -- auth.users.id do advogado
  plan_at_use  TEXT,          -- plano vigente na marcação (auditoria)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS defense_requests_agency_idx
  ON defense_requests(agency_id, status, used_at DESC);
CREATE INDEX IF NOT EXISTS defense_requests_status_idx
  ON defense_requests(status, requested_at DESC);
CREATE INDEX IF NOT EXISTS defense_requests_case_idx
  ON defense_requests(case_id);

-- Um caso gera uma única solicitação (o botão é idempotente).
CREATE UNIQUE INDEX IF NOT EXISTS defense_requests_case_unique_idx
  ON defense_requests(case_id) WHERE case_id IS NOT NULL;

ALTER TABLE defense_requests ENABLE ROW LEVEL SECURITY;

-- A agência LÊ as próprias solicitações (a tela de defesa mostra o saldo).
-- Escrita só pelo service role: quem marca "utilizada" é o advogado, pelas
-- rotas de API. Por isso SELECT e não FOR ALL — uma agência que pudesse
-- escrever aqui zeraria a própria cota marcando `consumes_quota = false`
-- ou apagando a linha da defesa já utilizada.
DROP POLICY IF EXISTS "defense_requests_read_own" ON defense_requests;
DROP POLICY IF EXISTS "defense_requests_agencia" ON defense_requests;
CREATE POLICY "defense_requests_agencia" ON defense_requests
  FOR SELECT USING (agency_id = public.agency_do_usuario());

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

-- Primeiro indicador. O percentual fica em 0 até a combinação comercial
-- existir — o painel já funciona, só mostra comissão zerada.
INSERT INTO partners (slug, name, commission_pct, recurring)
VALUES ('unav', 'UNAV', 0, true)
ON CONFLICT (slug) DO NOTHING;
