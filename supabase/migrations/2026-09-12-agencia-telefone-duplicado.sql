-- ============================================================
-- Conta autenticada sem linha em `agencies`
-- ============================================================
-- `agencies.phone` é UNIQUE (o webhook do WhatsApp acha a agência pelo número).
-- Quando alguém se cadastrava com um WhatsApp já usado por outra conta, o
-- INSERT do trigger violava essa UNIQUE e o `ON CONFLICT DO NOTHING` engolia a
-- falha: o usuário do Auth nascia sem agência, entrava na plataforma
-- normalmente e só descobria no primeiro caso, quando o insert em `cases`
-- batia na foreign key `cases_agency_id_fkey` (23503) e a tela mostrava apenas
-- "Erro ao criar caso".
--
-- Agora o trigger detecta o número já em uso e grava a agência SEM telefone —
-- ficar sem o canal de aviso é recuperável no /perfil, ficar sem agência não.
-- O `ON CONFLICT (id)` passa a ser explícito para que qualquer outra violação
-- apareça em vez de ser descartada em silêncio.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_phone TEXT := NEW.raw_user_meta_data->>'phone';
BEGIN
  -- Telefone já pertence a outra agência: entra NULL (UNIQUE aceita vários NULL).
  IF v_phone IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.agencies a WHERE a.phone = v_phone AND a.id <> NEW.id
  ) THEN
    v_phone := NULL;
  END IF;

  -- Novos cadastros: 7 dias de acesso gratuito. Agências do piloto (30 dias)
  -- mantêm o trial_ends_at já gravado na criação.
  INSERT INTO public.agencies (id, name, cnpj, email, phone, subscription_status, trial_ends_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name',  'Agência sem nome'),
    COALESCE(NEW.raw_user_meta_data->>'cnpj',  '00.000.000/0000-00'),
    NEW.email,
    v_phone,
    'trial',
    now() + INTERVAL '7 days'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
