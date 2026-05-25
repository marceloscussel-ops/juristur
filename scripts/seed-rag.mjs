/**
 * seed-rag.mjs
 *
 * Popula a base de conhecimento RAG com casos jurídicos de exemplo.
 * Execução: npm run seed:rag
 *
 * Requer no .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   OPENAI_API_KEY
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// ─── Carregar .env.local ──────────────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dir, '..', '.env.local')
const envLines = readFileSync(envPath, 'utf-8').split('\n')
for (const line of envLines) {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
}

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_API_KEY   = process.env.OPENAI_API_KEY

if (!SUPABASE_URL || !SERVICE_KEY || !OPENAI_API_KEY) {
  console.error('❌ Variáveis faltando: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const openai   = new OpenAI({ apiKey: OPENAI_API_KEY })

// ─── Casos de exemplo ─────────────────────────────────────────────────────────
const CASES = [
  {
    category: 'Cancelamento de pacote pelo cliente',
    problem_description:
      'Cliente solicitou cancelamento de pacote de viagem internacional 20 dias antes do embarque alegando motivos pessoais (doença familiar). A agência cobrou multa de 100% do valor pago conforme contrato.',
    applicable_laws: [
      'CDC Art. 49 (arrependimento em 7 dias)',
      'CDC Art. 51 (cláusulas abusivas)',
      'Lei 11.771/2008 Art. 33',
    ],
    analysis:
      'O cancelamento fora do prazo de arrependimento (7 dias úteis para contratos fora do estabelecimento) permite cobrança de multa, mas ela deve ser proporcional ao prejuízo real da agência. Multa de 100% sem comprovação de prejuízo efetivo pode ser considerada abusiva pelo CDC.',
    recommended_resolution:
      'Verificar custos já incorridos (passagens, hotéis não reembolsáveis) e cobrar apenas o valor efetivamente perdido. Oferecer crédito para uso futuro como alternativa. Documentar todos os gastos para justificar a retenção.',
    actual_outcome:
      'Retenção de 30% referente a custos comprovados; restante devolvido em 30 dias.',
  },

  {
    category: 'Cancelamento de pacote pelo fornecedor',
    problem_description:
      'Operadora cancelou pacote de cruzeiro 10 dias antes da partida por "motivos operacionais". A agência já recebeu pagamento integral do cliente e repassou à operadora. Cliente exige reembolso integral imediato.',
    applicable_laws: [
      'CDC Art. 35 (execução forçada, substituição ou rescisão com restituição)',
      'CDC Art. 20 (responsabilidade do fornecedor)',
      'Lei 11.771/2008 Art. 33 §2',
      'CC Art. 392 (responsabilidade por inadimplemento)',
    ],
    analysis:
      'O cancelamento pelo fornecedor sem causa de força maior gera obrigação de reembolso integral. A agência responde solidariamente perante o consumidor (CDC Art. 7º parágrafo único) mesmo que a culpa seja da operadora. O cliente tem direito a reembolso imediato ou substituição por produto equivalente.',
    recommended_resolution:
      'Restituir o cliente imediatamente e acionar a operadora regressivamente. Exigir comprovante de causa de força maior. Documentar toda a comunicação. Notificar a operadora por escrito com prazo de 48h para reembolso.',
    actual_outcome:
      'Reembolso integral ao cliente em 5 dias úteis; operadora ressarciu a agência após notificação extrajudicial.',
  },

  {
    category: 'Overbooking (hotel ou aéreo)',
    problem_description:
      'Hotel confirmado no pacote informou overbooking na chegada do cliente e ofereceu acomodação em hotel de categoria inferior (3 estrelas vs 5 estrelas contratado) na mesma cidade. Cliente recusa e exige o contratado ou indenização.',
    applicable_laws: [
      'CDC Art. 35 (direito à execução forçada)',
      'CDC Art. 14 (responsabilidade pelo defeito do serviço)',
      'RESP 1.321.999/SP (STJ — dano moral in re ipsa em overbooking)',
      'Lei 11.771/2008 Art. 22',
    ],
    analysis:
      'O overbooking hoteleiro caracteriza falha na prestação do serviço. O STJ entende que o transtorno causado pelo rebaixamento de categoria gera dano moral in re ipsa (presumido), sem necessidade de prova do abalo. A agência responde solidariamente pelo fornecedor.',
    recommended_resolution:
      'Buscar acomodação equivalente ou superior imediatamente. Se impossível, oferecer reembolso integral + custeio de nova acomodação. Registrar tudo por escrito. Negociar indenização por dano moral com o hotel (valores típicos: R$ 3.000 a R$ 8.000 por STJ).',
    actual_outcome:
      'Hotel arcou com upgrade em estabelecimento de categoria superior e pagou indenização de R$ 4.000 por danos morais.',
  },

  {
    category: 'Acidente ou incidente durante o serviço',
    problem_description:
      'Turista sofreu queda em passeio de rafting contratado como atividade adicional do pacote. A agência alega que o passeio era prestado por terceiro e que o contrato previa isenção de responsabilidade para atividades de aventura.',
    applicable_laws: [
      'CDC Art. 14 (responsabilidade objetiva do fornecedor)',
      'CDC Art. 25 (nulidade de cláusula de exoneração de responsabilidade)',
      'Lei 11.771/2008 Art. 21 e 22',
      'CC Art. 932 (responsabilidade por terceiros)',
      'Portaria MTur 254/2011 (turismo de aventura)',
    ],
    analysis:
      'Cláusulas contratuais que excluem responsabilidade por danos ao consumidor são nulas de pleno direito (CDC Art. 51, I). A agência que intermedeia atividade de terceiro responde solidariamente por qualquer dano. A Portaria 254/2011 exige que prestadores de turismo de aventura possuam seguro específico.',
    recommended_resolution:
      'Verificar se o prestador do rafting possuía seguro e certificação ABNT NBR 15505. Acionar o seguro. Documentar o acidente com fotos e testemunhos. Contatar advogado para avaliar extensão dos danos. Não assinar nenhum documento de quitação sem orientação jurídica.',
    actual_outcome:
      'Agência e prestador condenados solidariamente em R$ 15.000 por danos morais e materiais (tratamento médico).',
  },

  {
    category: 'Disputa com operadora',
    problem_description:
      'Operadora não repassou à agência a comissão acordada em contrato (12%) referente a 8 pacotes vendidos no último trimestre, alegando que os valores serão compensados com uma dívida que a agência teria com ela de um cancelamento anterior.',
    applicable_laws: [
      'CC Art. 368 a 380 (compensação de créditos)',
      'CC Art. 389 (inadimplemento e perdas e danos)',
      'Lei 11.788/2008 (não aplicável diretamente, mas referência para contratos)',
      'CDC Art. 51 (se relação de consumo)',
    ],
    analysis:
      'A compensação unilateral só é válida se as dívidas forem líquidas, certas e vencidas (CC Art. 369). A operadora deve comprovar a dívida anterior formalmente. Se não houver reconhecimento da dívida pela agência, a compensação é indevida. A agência pode exigir o pagamento integral das comissões.',
    recommended_resolution:
      'Enviar notificação extrajudicial exigindo detalhamento do débito compensado e pagamento das comissões em 10 dias. Se não houver resposta, ajuizar ação de cobrança no Juizado Especial Cível (até 40 salários mínimos). Reunir contratos, notas de comissão e comprovantes de vendas.',
    actual_outcome:
      'Operadora pagou as comissões após notificação extrajudicial; dívida anterior não era líquida e certa.',
  },

  {
    category: 'Reclamação de cliente (Procon / Reclame Aqui)',
    problem_description:
      'Cliente registrou reclamação no Procon alegando que o hotel do pacote não tinha as características anunciadas no site da agência (sem piscina, diferente do descrito). A agência recebeu notificação do Procon para responder em 10 dias.',
    applicable_laws: [
      'CDC Art. 30 (vinculação da oferta)',
      'CDC Art. 35 (descumprimento da oferta)',
      'CDC Art. 66 (propaganda enganosa)',
      'Decreto 2.181/1997 (organização do Procon)',
    ],
    analysis:
      'A oferta vincula o fornecedor: as informações do site da agência são juridicamente vinculantes (CDC Art. 30). Se o hotel apresentado não correspondia à descrição, há descumprimento de oferta, independente da culpa ser do hotel. A agência responde perante o consumidor pela fidelidade das informações divulgadas.',
    recommended_resolution:
      'Responder ao Procon dentro do prazo com: printscreen/evidências do anúncio na época da venda; contrato com o hotel; comunicação com o hotel sobre as características. Oferecer compensação ao cliente (desconto em próxima viagem ou crédito). Atualizar imediatamente as informações do site.',
    actual_outcome:
      'Agência ofereceu crédito de R$ 500 e o caso foi encerrado; Procon arquivou após acordo.',
  },

  {
    category: 'Questão trabalhista',
    problem_description:
      'Ex-funcionário que atuava como guia de turismo CLT ajuizou reclamação trabalhista exigindo horas extras referentes a viagens internacionais onde trabalhava 12h/dia durante 15 dias consecutivos sem folga compensatória.',
    applicable_laws: [
      'CLT Art. 58 e 59 (jornada e horas extras)',
      'CLT Art. 71 (intervalos para descanso)',
      'CLT Art. 235-C (motoristas — referência analógica a jornadas especiais)',
      'Súmula 340 TST (horas extras em regime de tempo parcial)',
      'Lei 11.771/2008 Art. 21 §3 (guias de turismo)',
    ],
    analysis:
      'Guias de turismo CLT têm direito à jornada normal de 8h com adicional de 50% para horas extras e 100% nos feriados/domingos. A natureza especial do trabalho em viagem não exclui o direito às horas extras. O banco de horas deve ser formalmente documentado e compensado em até 6 meses.',
    recommended_resolution:
      'Reunir registros de ponto, roteiros de viagem e escalas. Calcular o passivo de horas extras com especialista trabalhista. Verificar se há acordo coletivo da categoria que regule a jornada em viagem. Avaliar acordo na fase de conciliação (audiência prévia no CEJUSC).',
    actual_outcome:
      'Acordo em audiência com pagamento de R$ 22.000 referente a 18 meses de horas extras não pagas.',
  },

  {
    category: 'Contrato com fornecedor',
    problem_description:
      'Hotel fornecedor descumpriu contrato de allotment (20 apartamentos reservados por temporada) na alta temporada, liberando os quartos para o mercado a preços maiores. A agência ficou sem acomodação para 15 grupos confirmados.',
    applicable_laws: [
      'CC Art. 389 (inadimplemento contratual)',
      'CC Art. 402 (perdas e danos)',
      'CC Art. 475 (rescisão por inadimplemento)',
      'CDC Art. 34 (solidariedade)',
    ],
    analysis:
      'O contrato de allotment é vinculante e o descumprimento gera direito a perdas e danos. A agência pode exigir: cumprimento forçado do contrato, rescisão com indenização, ou ambos. Os danos incluem lucros cessantes (margem que deixou de receber) e custos para encontrar alternativa.',
    recommended_resolution:
      'Notificar o hotel por escrito e e-mail documentado exigindo cumprimento imediato ou alternativa equivalente. Calcular prejuízo (diferença de custo com hotel substituto + lucros cessantes). Acionar seguro de responsabilidade civil se houver. Preservar todos os contratos com os grupos afetados para ação regressiva.',
    actual_outcome:
      'Hotel indenizou a agência em R$ 38.000 (diferença de acomodação + danos morais coletivos) após ação judicial.',
  },

  {
    category: 'Cancelamento de pacote pelo fornecedor',
    problem_description:
      'Companhia aérea cancelou voo de conexão por greve de funcionários, deixando grupo de 22 turistas parados no aeroporto por 18 horas. A agência intermediou o pacote e os clientes exigem reembolso de gastos emergenciais e indenização por danos morais.',
    applicable_laws: [
      'Resolução ANAC 400/2016 Art. 21 e 27 (assistência material em atrasos)',
      'CDC Art. 14 e 20 (responsabilidade do fornecedor)',
      'CC Art. 393 (força maior)',
      'RESP 1.303.004/RS (STJ — responsabilidade em caso de greve aérea)',
    ],
    analysis:
      'A ANAC 400 obriga a companhia a oferecer assistência material (alimentação, comunicação, acomodação) após 1h, 2h e 4h de atraso. Greve não é causa de força maior suficiente para excluir responsabilidade segundo jurisprudência do STJ. A agência que vendeu o pacote incluso pode ser acionada solidariamente.',
    recommended_resolution:
      'Exigir da aérea os comprovantes de assistência material prestada. Coletar notas fiscais de gastos emergenciais do grupo. Orientar os clientes a registrar queixa na ANAC e no Procon. A agência deve acionar a aérea regressivamente pelos custos. Indenização por dano moral por passageiro: R$ 3.000 a R$ 8.000 (média STJ).',
    actual_outcome:
      'Companhia aérea pagou reembolso integral dos gastos emergenciais e R$ 4.000 por passageiro a título de danos morais após acordo pré-judicial.',
  },

  {
    category: 'Outro',
    problem_description:
      'Agência de turismo emitiu passagem aérea com nome errado do passageiro (troca de prenome) por erro de digitação. A companhia aérea cobra taxa de R$ 350 para correção. O cliente se recusa a pagar e exige que a agência assuma o custo.',
    applicable_laws: [
      'CDC Art. 14 (responsabilidade pelo defeito do serviço)',
      'CDC Art. 18 (vício do serviço)',
      'Resolução ANAC 400/2016 Art. 11 (alteração de dados)',
      'CC Art. 186 (ato ilícito por culpa)',
    ],
    analysis:
      'O erro de digitação é vício do serviço imputável à agência (CC Art. 186 — culpa in faciendo). A agência deve arcar com o custo da correção. A ANAC 400 permite alteração gratuita de nome pela aérea apenas quando o erro é da própria companhia; erro da agência gera cobrança legítima.',
    recommended_resolution:
      'A agência deve arcar com a taxa de correção imediatamente para não prejudicar o cliente. Internamente, identificar o funcionário responsável e aplicar medidas de treinamento. Implementar checklist de conferência de dados antes de emissão. Avaliar seguro de responsabilidade civil para cobrir esse tipo de sinistro.',
    actual_outcome:
      'Agência pagou a taxa de correção, emitiu novo bilhete e implementou protocolo duplo de conferência de dados.',
  },
]

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀 Iniciando seed de ${CASES.length} casos RAG...\n`)

  let success = 0
  let failed  = 0

  for (const [i, c] of CASES.entries()) {
    process.stdout.write(`  [${i + 1}/${CASES.length}] ${c.category.slice(0, 45).padEnd(45)} `)

    try {
      // Gerar embedding
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: `${c.category}: ${c.problem_description}`.slice(0, 8000),
      })
      const embedding = response.data[0].embedding

      // Inserir no banco
      const { error } = await supabase.from('rag_cases').insert({
        category:               c.category,
        problem_description:    c.problem_description,
        applicable_laws:        c.applicable_laws,
        analysis:               c.analysis,
        recommended_resolution: c.recommended_resolution,
        actual_outcome:         c.actual_outcome ?? null,
        embedding,
      })

      if (error) throw new Error(error.message)

      console.log('✅')
      success++
    } catch (err) {
      console.log(`❌ ${err.message}`)
      failed++
    }

    // Pequena pausa para não exceder rate limit da OpenAI
    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`\n✨ Concluído: ${success} inseridos, ${failed} falhas.\n`)
}

main().catch(err => {
  console.error('Erro fatal:', err)
  process.exit(1)
})
