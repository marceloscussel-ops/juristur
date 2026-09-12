-- ============================================================
-- Idempotência do webhook do WhatsApp
-- Idempotente: pode rodar mais de uma vez sem erro.
--
-- A Z-API reenvia o webhook quando não recebe resposta a tempo. Como o
-- handler só devolve 200 depois de transcrever o áudio, chamar o Claude e
-- enviar as mensagens, uma pergunta por áudio passava dos 10s e era
-- reentregue — resultado: a mesma pergunta transcrita, respondida e
-- gravada duas vezes no caso, gastando duas das cinco perguntas do limite.
--
-- Esta tabela é o porteiro: o id da mensagem é CHAVE PRIMÁRIA, então o
-- INSERT da segunda execução falha por violação de unicidade e ela para
-- ali. A atomicidade é o ponto — um SELECT antes do INSERT não resolveria,
-- porque as duas execuções podem consultar antes de qualquer uma gravar.
--
-- Só o service role escreve aqui (o webhook não é autenticado), por isso
-- RLS fica ligado sem nenhuma policy: ninguém mais enxerga a tabela.
--
-- Crescimento: uma linha por mensagem recebida. Pode ser podada à vontade,
-- as linhas só importam por alguns segundos:
--   DELETE FROM whatsapp_processed_messages WHERE created_at < now() - interval '7 days';
-- ============================================================

CREATE TABLE IF NOT EXISTS whatsapp_processed_messages (
  message_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Para a poda periódica das linhas antigas.
CREATE INDEX IF NOT EXISTS whatsapp_processed_messages_created_at_idx
  ON whatsapp_processed_messages(created_at);

ALTER TABLE whatsapp_processed_messages ENABLE ROW LEVEL SECURITY;
