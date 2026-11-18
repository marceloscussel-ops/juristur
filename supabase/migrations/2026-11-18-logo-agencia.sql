-- ============================================================
-- Logomarca da agência
--
-- A agência envia a sua logo no Perfil e ela sai no cabeçalho dos
-- contratos e documentos gerados (PDF e DOCX).
--
-- Bucket PRÓPRIO e PRIVADO, e não o `case-files` (público): a logo não é
-- anexo de caso, e num bucket privado só quem é da agência a enxerga. A
-- leitura passa pela rota /api/profile/logo, que usa a sessão do usuário.
--
-- Caminho do arquivo: `<agency_id>/logo-<timestamp>.<ext>`. A primeira
-- pasta é a agência — é nela que as policies abaixo se apoiam.
--
-- Só PNG e JPEG ficam guardados: são os formatos que o PDF (pdf-lib) e o
-- Word embutem. WebP e SVG são aceitos na tela e convertidos para PNG no
-- navegador antes do envio.
--
-- Idempotente: pode rodar mais de uma vez.
-- ============================================================

-- Caminho no bucket, não URL: o bucket é privado, então URL pública não
-- existe. NULL = agência sem logo (documentos saem no layout de sempre).
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS logo_path TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('agency-logos', 'agency-logos', false, 2097152, ARRAY['image/png', 'image/jpeg'])
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Leitura: qualquer usuário ativo da agência (o membro também gera
-- documentos, e o documento dele sai com a logo).
DROP POLICY IF EXISTS "agency_logos_read" ON storage.objects;
CREATE POLICY "agency_logos_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'agency-logos'
    AND (storage.foldername(name))[1] = public.agency_do_usuario()::text
  );

-- Escrita: só o titular, e só dentro da pasta da própria agência. Mesma
-- regra de `agencies_update` — membro não mexe em dado cadastral.
DROP POLICY IF EXISTS "agency_logos_insert" ON storage.objects;
CREATE POLICY "agency_logos_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'agency-logos'
    AND (storage.foldername(name))[1] = public.agency_do_usuario()::text
    AND public.e_titular_da_agencia()
  );

DROP POLICY IF EXISTS "agency_logos_update" ON storage.objects;
CREATE POLICY "agency_logos_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'agency-logos'
    AND (storage.foldername(name))[1] = public.agency_do_usuario()::text
    AND public.e_titular_da_agencia()
  );

DROP POLICY IF EXISTS "agency_logos_delete" ON storage.objects;
CREATE POLICY "agency_logos_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'agency-logos'
    AND (storage.foldername(name))[1] = public.agency_do_usuario()::text
    AND public.e_titular_da_agencia()
  );
