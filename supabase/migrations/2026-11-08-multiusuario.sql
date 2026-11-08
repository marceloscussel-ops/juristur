-- ============================================================
-- Múltiplos usuários por agência
--
-- Até aqui agência e usuário eram a MESMA entidade: `agencies.id` é o
-- `auth.users.id` e toda policy dizia `auth.uid() = agency_id`. Os planos
-- Professional e Enterprise prometem 3 e 5 usuários, então a identidade
-- precisa de um nível a mais — sem mexer em quem é dono dos dados.
--
-- O desenho:
--   · `agencies.id` continua sendo o id do TITULAR (quem criou a conta e
--     assina). Nenhuma coluna de dono muda, nenhum caso é migrado.
--   · `agency_members` liga cada usuário do Auth a uma agência. O titular
--     tem a linha com `user_id = agency_id`.
--   · A RLS deixa de comparar `auth.uid()` com `agency_id` e passa a
--     resolver a agência do usuário por uma função SECURITY DEFINER.
--
-- Idempotente: pode ser rodado mais de uma vez.
-- ============================================================

-- ============================================================
-- 1. Tabela de vínculo usuário → agência
-- ============================================================
CREATE TABLE IF NOT EXISTS agency_members (
  -- PK no usuário: um usuário do Auth pertence a UMA agência. Isso é o que
  -- torna `agency_do_usuario()` determinística (e a RLS, barata).
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

-- Telefone é único GLOBAL: o webhook do WhatsApp identifica quem está
-- falando só pelo número, então dois usuários com o mesmo WhatsApp fariam a
-- mensagem de um cair na agência do outro. Índice parcial porque telefone é
-- opcional (membro pode usar só a web).
CREATE UNIQUE INDEX IF NOT EXISTS agency_members_telefone_idx
  ON agency_members(telefone) WHERE telefone IS NOT NULL;

-- Um titular por agência. É dele que saem cobrança, plano e gestão de
-- usuários — duas linhas 'titular' tornariam essas decisões ambíguas.
CREATE UNIQUE INDEX IF NOT EXISTS agency_members_titular_idx
  ON agency_members(agency_id) WHERE papel = 'titular';

-- Backfill: toda agência que já existe ganha o seu titular ativo. Sem isto
-- `agency_do_usuario()` devolveria NULL e a RLS trancaria todo mundo fora.
INSERT INTO agency_members (user_id, agency_id, papel, nome, telefone, email, status, aceito_em, created_at)
SELECT a.id, a.id, 'titular', a.name, a.phone, a.email, 'ativo', a.created_at, a.created_at
FROM agencies a
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- 2. Autoria (created_by) em casos e documentos
--
-- Guarda QUEM da agência registrou o item. Sem foreign key para
-- auth.users de propósito: com FK, remover um usuário da equipe
-- cascatearia (ou travaria) nos casos da agência — e o histórico
-- jurídico da empresa não pode depender de quem continua na conta.
-- Linhas antigas ficam NULL (não há como adivinhar o autor).
-- ============================================================
ALTER TABLE cases     ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS created_by UUID;

-- ============================================================
-- 3. Resolução da agência do usuário (base de toda a RLS)
--
-- SECURITY DEFINER é OBRIGATÓRIO: uma policy de `cases` que consultasse
-- `agency_members` diretamente acionaria a RLS de `agency_members`, que
-- por sua vez chama esta resolução — recursão infinita (42P17). Rodando
-- como dona da função, a consulta interna não passa por RLS e a recursão
-- desaparece.
--
-- Não é um buraco de segurança: a função não aceita parâmetro. Ela só
-- responde "qual é a agência de quem está chamando", usando auth.uid().
-- Sem sessão, auth.uid() é NULL, nenhuma linha casa e o retorno é NULL —
-- e `agency_id = NULL` nunca é verdadeiro, então a policy nega.
-- ============================================================
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

-- Titular da agência: quem pode mexer em cobrança, plano e nos dados da
-- agência. Mesmo motivo para SECURITY DEFINER.
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

GRANT EXECUTE ON FUNCTION public.agency_do_usuario()     TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.e_titular_da_agencia()  TO authenticated, anon, service_role;

-- ============================================================
-- 4. Policies
--
-- Leitura de cada expressão abaixo para um usuário de OUTRA agência:
-- `agency_do_usuario()` devolve a agência DELE, que é diferente do
-- `agency_id` da linha, logo a comparação é falsa e a linha não aparece.
-- Para quem não tem sessão o retorno é NULL e a comparação também não é
-- verdadeira. Em nenhum caminho a função aceita um id de fora.
-- ============================================================
ALTER TABLE agency_members ENABLE ROW LEVEL SECURITY;

-- A equipe inteira se enxerga (a tela de equipe mostra papel e status de
-- todos). Escrita NÃO tem policy: convidar, suspender e remover passam
-- pelas rotas de API com service role, que validam que quem chama é o
-- titular e que há assento no plano. Assim nada disso pode ser forjado
-- direto do navegador.
DROP POLICY IF EXISTS "agency_members_read" ON agency_members;
CREATE POLICY "agency_members_read" ON agency_members
  FOR SELECT USING (agency_id = public.agency_do_usuario());

-- Agência: membro lê, só o titular atualiza. INSERT/DELETE ficam sem
-- policy — criar e excluir conta é trabalho das rotas com service role.
DROP POLICY IF EXISTS "agencies_own"    ON agencies;
DROP POLICY IF EXISTS "agencies_read"   ON agencies;
DROP POLICY IF EXISTS "agencies_update" ON agencies;

CREATE POLICY "agencies_read" ON agencies
  FOR SELECT USING (id = public.agency_do_usuario());

CREATE POLICY "agencies_update" ON agencies
  FOR UPDATE
  USING      (id = public.agency_do_usuario() AND public.e_titular_da_agencia())
  WITH CHECK (id = public.agency_do_usuario() AND public.e_titular_da_agencia());

-- Casos e documentos: todo membro ativo vê e cria. É o histórico jurídico
-- da empresa, não de uma pessoa.
DROP POLICY IF EXISTS "cases_own" ON cases;
CREATE POLICY "cases_own" ON cases
  FOR ALL USING (agency_id = public.agency_do_usuario());

DROP POLICY IF EXISTS "documents_own" ON documents;
CREATE POLICY "documents_own" ON documents
  FOR ALL USING (agency_id = public.agency_do_usuario());

DROP POLICY IF EXISTS "whatsapp_sessions_own" ON whatsapp_sessions;
CREATE POLICY "whatsapp_sessions_own" ON whatsapp_sessions
  FOR ALL USING (agency_id = public.agency_do_usuario());

-- Filhos: o dono é o pai. O EXISTS continua igual, só a comparação final
-- deixa de ser `auth.uid()`.
DROP POLICY IF EXISTS "case_files_own" ON case_files;
CREATE POLICY "case_files_own" ON case_files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_files.case_id
        AND cases.agency_id = public.agency_do_usuario()
    )
  );

DROP POLICY IF EXISTS "case_analyses_own" ON case_analyses;
CREATE POLICY "case_analyses_own" ON case_analyses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_analyses.case_id
        AND cases.agency_id = public.agency_do_usuario()
    )
  );

DROP POLICY IF EXISTS "case_messages_own" ON case_messages;
CREATE POLICY "case_messages_own" ON case_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_messages.case_id
        AND cases.agency_id = public.agency_do_usuario()
    )
  );

DROP POLICY IF EXISTS "document_files_own" ON document_files;
CREATE POLICY "document_files_own" ON document_files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_files.document_id
        AND documents.agency_id = public.agency_do_usuario()
    )
  );

-- Aceites do contrato: leitura no nível da agência (escrita continua só
-- pelo service role, para o registro do ato não poder ser forjado).
DROP POLICY IF EXISTS "contract_acceptances_read_own" ON contract_acceptances;
CREATE POLICY "contract_acceptances_read_own" ON contract_acceptances
  FOR SELECT USING (agency_id = public.agency_do_usuario());

-- ------------------------------------------------------------
-- defense_requests (defesas inclusas por plano)
--
-- Essa tabela nasce em OUTRA migration, feita em paralelo a esta, e pode
-- não existir ainda no banco onde este arquivo está rodando. O bloco
-- guardado deixa a policy correta sem derrubar a migration inteira com
-- "relation does not exist" — e, quando a tabela já existir, ela entra
-- junto no modelo novo.
--
-- A policy original (`auth.uid() = agency_id`) não é derrubada de
-- propósito: policies permissivas se somam (OR), então se as duas
-- migrations rodarem em qualquer ordem o resultado é o mesmo — acesso no
-- nível da agência. Rodar esta migration de novo depois da outra é o que
-- fecha o caso em que a outra foi aplicada por último.
-- ------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.defense_requests') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "defense_requests_read_own" ON defense_requests';
    EXECUTE 'DROP POLICY IF EXISTS "defense_requests_agencia" ON defense_requests';
    -- SELECT, nunca FOR ALL: a escrita em defense_requests é do service
    -- role (o advogado é quem marca o que foi utilizado). Com FOR ALL a
    -- agência poderia zerar a própria cota marcando consumes_quota = false.
    EXECUTE 'CREATE POLICY "defense_requests_agencia" ON defense_requests
               FOR SELECT USING (agency_id = public.agency_do_usuario())';
  END IF;
END $$;

-- ============================================================
-- 5. Trigger de novo usuário
--
-- O nó do convite: o trigger antigo criava uma agência para TODO usuário
-- novo do Auth. Um membro convidado entrava pelo mesmo caminho e virava
-- uma agência vazia em vez de entrar na agência do titular.
--
-- Agora o `agency_id` no metadata do convite decide: se existe, o usuário
-- só ganha a linha em `agency_members`; se não, é um cadastro comum e o
-- fluxo antigo (agência + titular) vale igual.
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
  -- Telefone é chave de busca do WhatsApp nas DUAS tabelas: se o número já
  -- é de outra conta, grava NULL em vez de deixar a violação de UNIQUE
  -- derrubar o insert. Ficar sem o canal de aviso é recuperável pelo
  -- /perfil; ficar sem vínculo com a agência não.
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
    COALESCE(NEW.raw_user_meta_data->>'cnpj', '00.000.000/0000-00'),
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
-- 6. Trigger de convite aceito
--
-- O convidado entra em `agency_members` como 'convidado' e só passa a
-- 'ativo' quando prova que é dono do e-mail — o que o Auth registra em
-- `email_confirmed_at` ao abrir o link do convite. Enquanto for
-- 'convidado', `agency_do_usuario()` devolve NULL e ele não lê nada.
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
