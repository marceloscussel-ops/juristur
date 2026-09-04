-- ============================================================
-- Origem de aquisição da agência
-- Idempotente: pode rodar mais de uma vez sem erro.
--
-- Permite saber de onde veio cada cadastro (ex.: QR code distribuído em
-- evento) e medir a conversão de cada ação no painel gerencial.
--   origem          → canal: 'evento', 'organico', ...
--   origem_campanha → qual ação daquele canal (utm_campaign), p. ex. o
--                     nome do evento — separa um evento do outro.
-- ============================================================

ALTER TABLE agencies ADD COLUMN IF NOT EXISTS origem          TEXT;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS origem_campanha TEXT;

-- Consultas do painel filtram/agrupam por origem.
CREATE INDEX IF NOT EXISTS agencies_origem_idx ON agencies(origem);
