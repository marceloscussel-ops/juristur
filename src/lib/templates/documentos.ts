/**
 * documentos.ts — Catálogo dos documentos que a agência gera no dia a dia.
 *
 * Diferente do contrato (lib/templates/contrato-turismo.ts), aqui NÃO existe
 * texto base: a IA redige do zero. O que o catálogo entrega é o que o pedido
 * do usuário não carrega — por tipo de documento, a estrutura esperada, a base
 * legal e a armadilha a evitar.
 *
 * Esse conhecimento mora em `documentos-guias.ts`, importado só pela rota da
 * API: ele é longo, e este arquivo é importado pelo formulário, que roda no
 * navegador. Aqui ficam os campos que a tela precisa.
 *
 * Para acrescentar um tipo: um id em DOCUMENT_TYPE_IDS, o item em
 * DOCUMENT_TYPES e o guia em DOCUMENT_GUIDES — sem o guia não compila.
 */

export type DocumentGroup =
  | 'cliente'
  | 'financeiro'
  | 'encerramento'
  | 'fornecedor'
  | 'conformidade'

export const DOCUMENT_GROUPS: Array<{ id: DocumentGroup; label: string }> = [
  { id: 'cliente',       label: 'Cliente — antes e durante a viagem' },
  { id: 'financeiro',    label: 'Financeiro' },
  { id: 'encerramento',  label: 'Encerramento de contrato' },
  { id: 'fornecedor',    label: 'Fornecedor e terceiros' },
  { id: 'conformidade',  label: 'Conflito e conformidade' },
]

/** Os ids do catálogo. É daqui que sai a obrigação de ter um guia para cada. */
export const DOCUMENT_TYPE_IDS = [
  'email-cliente',
  'termo-ciencia',
  'recusa-seguro',
  'autorizacao-menor',
  'regulamento-excursao',
  'proposta-comercial',
  'formalizacao-financeira',
  'recibo',
  'acordo-reembolso',
  'cobranca-amigavel',
  'termo-renuncia',
  'distrato',
  'notificacao-fornecedor',
  'procuracao-reembolso',
  'resposta-reclamacao',
  'uso-imagem',
  'consentimento-lgpd',
] as const

export type DocumentTypeId = (typeof DOCUMENT_TYPE_IDS)[number]

export interface DocumentType {
  id:    DocumentTypeId
  /** Rótulo que vai para o banco (`documents.doc_type`) e para o painel. */
  label: string
  grupo: DocumentGroup
  /** Uma linha de contexto, logo abaixo do combo. */
  ajuda: string
  /** Placeholder do campo de pedido, específico do tipo. */
  placeholder: string
  /** Texto do "preencher com um exemplo". */
  exemplo: string
  /** Aparece como atalho acima do combo — os mais usados. */
  destaque?: boolean
}

/** Id do tipo livre, em que o usuário digita o rótulo. */
export const OTHER_DOCUMENT_TYPE_ID = 'outro'

/** Teto do rótulo livre: ele vai para a lista do painel. */
export const MAX_FREE_TYPE_LENGTH = 80

export const DOCUMENT_TYPES: DocumentType[] = [
  // ─── Cliente ───────────────────────────────────────────────────────────────
  {
    id:    'email-cliente',
    label: 'E-mail ou carta ao cliente',
    grupo: 'cliente',
    ajuda: 'Comunicado formal: alteração feita pelo fornecedor, reajuste, cobrança, resposta a um pedido.',
    placeholder:
      'Quem é o cliente, o que aconteceu e o que você precisa comunicar ou propor.\n\nEx.: "a companhia antecipou o voo de volta em 6 horas; preciso avisar e oferecer as opções de reacomodação ou reembolso".',
    exemplo: `Cliente: Ana Paula Ribeiro, pacote para Santiago, embarque 12/03/2027.

A LATAM cancelou o voo de volta LA-754 do dia 19/03 e remarcou para o dia 20/03, com uma noite extra em Santiago.

Preciso avisar formalmente e oferecer as três opções: aceitar a reacomodação (a diária extra do hotel fica por conta da companhia), ser reacomodada em outra companhia na data original, ou reembolso integral do trecho.

Tom cordial, mas deixando claro que a alteração é da companhia aérea e que a agência está intermediando a solução.`,
    destaque: true,
  },
  {
    id:    'termo-ciencia',
    label: 'Termo de ciência e responsabilidade',
    grupo: 'cliente',
    ajuda: 'Passaporte, visto, vacina, prazos, bagagem, horários — o cliente declara que foi avisado.',
    placeholder:
      'O que o cliente precisa declarar que sabe, e os dados da viagem.\n\nEx.: "avisei que o passaporte precisa de 6 meses de validade e que o visto do Chile não é exigido, mas a certidão de nascimento do filho menor é".',
    exemplo: `Cliente: Roberto Lima, CPF 987.654.321-00, viagem para Cancún de 02 a 10/07/2027, 2 adultos e 1 criança de 9 anos.

Informei e quero registrar a ciência sobre:
- passaporte com validade mínima de 6 meses na data do embarque, para os três;
- o México não exige visto para brasileiros, mas exige o formulário migratório e comprovação de hospedagem e de meios de subsistência;
- a criança viaja com os dois pais, sem necessidade de autorização judicial;
- vacina de febre amarela recomendada, não obrigatória;
- apresentação no aeroporto 3 horas antes do voo internacional;
- franquia de bagagem de 1 mala de 23kg por passageiro — excesso é pago direto à companhia.`,
    destaque: true,
  },
  {
    id:    'recusa-seguro',
    label: 'Termo de recusa de seguro viagem',
    grupo: 'cliente',
    ajuda: 'O seguro foi oferecido, o cliente dispensou e assume o risco por escrito.',
    placeholder:
      'Dados do cliente, a viagem, o seguro que foi oferecido (coberturas e valor) e a recusa.\n\nEx.: "ofereci o seguro Assist Card com cobertura médica de 60 mil dólares por R$ 480 e o cliente dispensou".',
    exemplo: `Cliente: Marcos Antônio Pereira, CPF 111.222.333-44, viagem para Lisboa de 05 a 20/09/2027.

Ofereci o seguro viagem Assist Card Europa, com cobertura de despesas médicas e hospitalares de EUR 60.000, extravio de bagagem, cancelamento de viagem e traslado sanitário, pelo valor de R$ 520,00 para o período.

O cliente recusou a contratação, por opção própria, informando que possui cartão de crédito com seguro próprio.`,
  },
  {
    id:    'autorizacao-menor',
    label: 'Autorização de viagem de menor e ciência dos responsáveis',
    grupo: 'cliente',
    ajuda: 'Menor viajando sozinho, com um dos pais ou com terceiro — ECA arts. 83 a 85.',
    placeholder:
      'Dados do menor, dos pais ou responsáveis, com quem o menor viaja e o roteiro.\n\nEx.: "menor de 12 anos viaja para Orlando com a avó; preciso da autorização dos dois pais e do termo de ciência de que ela precisa ser reconhecida em cartório".',
    exemplo: `Menor: Lucas Mendes Araújo, 12 anos, nascido em 14/05/2015, RG 1234567-8 SSP/RS.
Pai: Fernando Araújo, CPF 222.333.444-55. Mãe: Juliana Mendes, CPF 333.444.555-66.
Acompanhante: Therezinha Mendes, avó materna, CPF 444.555.666-77.

Viagem para Orlando, Estados Unidos, de 10 a 25/01/2028, voo GOL/Delta saindo de Porto Alegre.

O menor viaja acompanhado da avó, sem os pais. Preciso da autorização dos dois responsáveis e do registro de que informei a exigência de firma reconhecida em cartório e de duas vias originais para o embarque.`,
  },
  {
    id:    'regulamento-excursao',
    label: 'Regulamento de excursão ou viagem em grupo',
    grupo: 'cliente',
    ajuda: 'Embarque, horários, assentos, bagagem, conduta e o que acontece com quem atrasa.',
    placeholder:
      'O roteiro, as regras de embarque e convivência, e o que você quer deixar claro.\n\nEx.: "excursão de ônibus para Gramado, 2 dias; quero regra de ponto de encontro, tolerância de 10 minutos, bagagem de uma mala por pessoa e proibição de bebida alcoólica no ônibus".',
    exemplo: `Excursão para Gramado e Canela, saída 18/06/2027 às 22h do Terminal Rodoviário de Pelotas, retorno 21/06/2027.

Regras que preciso no regulamento:
- apresentação 30 minutos antes de cada embarque, tolerância de 10 minutos no retorno dos passeios;
- quem perder o horário segue por conta própria, sem reembolso do trecho;
- uma mala de até 20kg e uma bagagem de mão por passageiro;
- assentos definidos por ordem de inscrição, sem troca depois da planilha fechada;
- proibido bebida alcoólica dentro do ônibus;
- passeios opcionais são pagos no destino, direto ao receptivo;
- menores de 18 anos somente acompanhados dos pais ou com autorização.`,
  },
  {
    id:    'proposta-comercial',
    label: 'Proposta comercial ou orçamento',
    grupo: 'cliente',
    ajuda: 'Com prazo de validade e a ressalva de que tarifa só se confirma na emissão.',
    placeholder:
      'O que está sendo orçado, valores, condições de pagamento e até quando a proposta vale.\n\nEx.: "orçamento de lua de mel em Maceió, 7 noites, aéreo + hotel + traslados, R$ 9.800 o casal, válido por 3 dias".',
    exemplo: `Cliente: Camila Rocha e Diego Fontes.

Pacote lua de mel em Maceió, 7 noites, de 14 a 21/11/2027, para 2 pessoas.
Inclui: aéreo ida e volta Porto Alegre–Maceió com uma bagagem despachada por pessoa, 7 noites no Ritz Lagoa da Anta em apartamento vista mar com café da manhã, traslado aeroporto–hotel–aeroporto e um passeio de catamarã.
Não inclui: passeios opcionais, refeições fora do café, taxas de turismo pagas no hotel e seguro viagem.

Valor total: R$ 9.800,00 o casal.
Pagamento: entrada de R$ 2.000,00 e saldo em até 8x no cartão, ou 5% de desconto no PIX à vista.
Validade da proposta: 3 dias.`,
  },

  // ─── Financeiro ────────────────────────────────────────────────────────────
  {
    id:    'formalizacao-financeira',
    label: 'Formalização financeira: confissão de dívida e parcelamento',
    grupo: 'financeiro',
    ajuda: 'Cliente parcela direto com a agência e reconhece o débito por escrito.',
    placeholder:
      'Quem deve, quanto, por qual serviço, e como vai pagar.\n\nEx.: "cliente deve R$ 6.400 do pacote, vai pagar em 8 parcelas de R$ 800 no dia 10 de cada mês, começando em dezembro".',
    exemplo: `Devedor: Patrícia Nogueira, CPF 555.666.777-88, Rua Bento Gonçalves 450, apto 302, Caxias do Sul/RS.
Credora: minha agência.

Origem da dívida: pacote para Porto Seguro, contratado em 03/10/2026, embarque em 15/01/2027, valor total de R$ 8.400,00, dos quais já foram pagos R$ 2.000,00 de entrada.

Saldo devedor: R$ 6.400,00.
Parcelamento: 8 parcelas mensais de R$ 800,00, vencendo todo dia 10, a primeira em 10/12/2026 e a última em 10/07/2027, por PIX.
Atraso: multa de 2% e juros de 1% ao mês.
A emissão das passagens só acontece após a quitação integral.`,
    destaque: true,
  },
  {
    id:    'recibo',
    label: 'Recibo de pagamento ou de serviços prestados',
    grupo: 'financeiro',
    ajuda: 'Comprovante do que foi pago, por qual serviço e em que condição.',
    placeholder:
      'Quem pagou, quanto, como e referente a quê.\n\nEx.: "recebi R$ 2.000 de entrada da Patrícia Nogueira, por PIX, referente ao pacote de Porto Seguro".',
    exemplo: `Recebi de Patrícia Nogueira, CPF 555.666.777-88, o valor de R$ 2.000,00, por PIX, em 03/10/2026.

Referente à entrada do pacote para Porto Seguro, embarque em 15/01/2027, cujo valor total é de R$ 8.400,00, ficando um saldo de R$ 6.400,00 a ser pago conforme o parcelamento acordado.`,
  },
  {
    id:    'acordo-reembolso',
    label: 'Acordo de cancelamento e reembolso',
    grupo: 'financeiro',
    ajuda: 'O que volta, o que fica retido e por quê, com cronograma da devolução.',
    placeholder:
      'O que foi cancelado, quem cancelou, os valores pagos, o que o fornecedor devolve e em quanto tempo.\n\nEx.: "cliente cancelou a 20 dias do embarque; aéreo tem multa de 30% da companhia, hotel devolve integral, minha taxa de serviço de R$ 400 não volta".',
    exemplo: `Cliente: Henrique Paz, CPF 666.777.888-99. Pacote para Fernando de Noronha, embarque previsto 08/02/2027.

Cancelamento solicitado pelo cliente em 19/01/2027, 20 dias antes do embarque, por motivo pessoal.

Valores pagos: R$ 11.200,00 no total.
- Aéreo (R$ 4.200): a companhia retém 30% de multa por cancelamento fora das 24h da compra, devolvendo R$ 2.940,00 em até 7 dias úteis.
- Hospedagem (R$ 6.600): a pousada devolve integral, porque o cancelamento foi feito dentro do prazo de 15 dias.
- Taxa de serviço da agência (R$ 400): não reembolsável, o serviço de intermediação já foi prestado.

Total a devolver: R$ 9.540,00, por PIX, em até 10 dias úteis contados do recebimento do fornecedor.`,
    destaque: true,
  },
  {
    id:    'cobranca-amigavel',
    label: 'Aviso de inadimplência e cobrança amigável',
    grupo: 'financeiro',
    ajuda: 'Última chance antes da medida judicial, sem constranger o cliente.',
    placeholder:
      'Quem está devendo, o quê, desde quando, e o prazo que você dá.\n\nEx.: "duas parcelas de R$ 800 vencidas desde outubro; quero dar 10 dias antes de encaminhar para o jurídico".',
    exemplo: `Devedor: Patrícia Nogueira, CPF 555.666.777-88.

Parcelas vencidas do parcelamento assinado em 03/10/2026: as de 10/12/2026 e 10/01/2027, de R$ 800,00 cada, totalizando R$ 1.600,00 de principal.

Quero dar 10 dias para o pagamento, com multa de 2% e juros de 1% ao mês, informando que, sem resposta, o caso vai para cobrança judicial e a emissão das passagens continua suspensa.`,
  },

  // ─── Encerramento ──────────────────────────────────────────────────────────
  {
    id:    'termo-renuncia',
    label: 'Termo de desistência e renúncia de viagem',
    grupo: 'encerramento',
    ajuda: 'O cliente desiste e reconhece as multas e os valores não reembolsáveis.',
    placeholder:
      'Quem desiste, de qual viagem, quando, e o que ele reconhece que perde.\n\nEx.: "cliente desistiu a 10 dias do embarque, passagem emitida e não reembolsável, quero o reconhecimento de que a perda é dele".',
    exemplo: `Cliente: Sérgio Baptista, CPF 777.888.999-00. Pacote para Buenos Aires, embarque 22/04/2027.

Desistência comunicada por WhatsApp em 12/04/2027, 10 dias antes do embarque, por motivo pessoal, sem relação com falha de serviço.

Valores: R$ 7.600,00 pagos.
- Passagens já emitidas em tarifa promocional, não reembolsáveis: R$ 3.900,00 — perda integral, conforme a regra tarifária da companhia, que eu informei na contratação.
- Hotel: devolve 50%, por estar dentro de 15 dias do check-in: devolve R$ 1.650,00 de R$ 3.300,00.
- Taxa de serviço: R$ 400,00, não reembolsável.

Quero registrar que a desistência foi por vontade do cliente e que ele reconhece a perda.`,
    destaque: true,
  },
  {
    id:    'distrato',
    label: 'Distrato ou rescisão consensual de contrato',
    grupo: 'encerramento',
    ajuda: 'As duas partes encerram o contrato de comum acordo e acertam as contas.',
    placeholder:
      'Qual contrato será encerrado, por que, e como ficam os valores e as obrigações.\n\nEx.: "contrato de pacote assinado em agosto, as duas partes querem desfazer porque o grupo não fechou o mínimo de passageiros".',
    exemplo: `Partes: minha agência e a Associação dos Professores de Bagé, CNPJ 11.222.333/0001-44.

Contrato de 20/08/2026, excursão para Foz do Iguaçu com mínimo de 35 passageiros, saída prevista 10/12/2026, valor total de R$ 52.500,00.

Motivo: o grupo fechou 18 inscrições, abaixo do mínimo contratual de 35, e as duas partes concordam em desfazer o contrato.

Valores: foram pagos R$ 15.000,00 de sinal. O ônibus fretado tem multa de R$ 2.500,00 por cancelamento nesse prazo, que será descontada. Devolvo R$ 12.500,00 em até 15 dias.

Nenhuma das partes fica com obrigação pendente além dessa devolução.`,
  },

  // ─── Fornecedor e terceiros ────────────────────────────────────────────────
  {
    id:    'notificacao-fornecedor',
    label: 'Notificação a fornecedor',
    grupo: 'fornecedor',
    ajuda: 'Companhia aérea, operadora, hotel, receptivo — exigindo reembolso ou cumprimento.',
    placeholder:
      'Qual fornecedor, o que foi contratado, o que falhou e o que você exige, com prazo.\n\nEx.: "a operadora não repassou o reembolso de R$ 9.540 do cancelamento de janeiro; exijo o pagamento em 10 dias".',
    exemplo: `Fornecedor: Operadora XYZ Viagens, CNPJ 22.333.444/0001-55.

Reserva 884521, pacote Fernando de Noronha, cliente Henrique Paz, cancelado em 19/01/2027 dentro do prazo contratual.

A operadora confirmou o cancelamento por e-mail em 21/01/2027 e informou reembolso de R$ 9.540,00 em até 30 dias. Passaram 68 dias e o valor não foi repassado. Cobrei por e-mail em 02/03 e 18/03, sem resposta.

Exijo o repasse em 10 dias, com atualização monetária e juros, sob pena de medida judicial e de comunicação ao Ministério do Turismo e ao Procon. A agência já devolveu o valor ao consumidor do próprio caixa.`,
  },
  {
    id:    'procuracao-reembolso',
    label: 'Procuração para pleitear reembolso',
    grupo: 'fornecedor',
    ajuda: 'O cliente autoriza a agência a tratar o reembolso em nome dele junto ao fornecedor.',
    placeholder:
      'Quem outorga, para quê exatamente, e os limites do poder.\n\nEx.: "cliente me autoriza a pedir o reembolso do bilhete na GOL e receber o valor na conta da agência para repassar a ele".',
    exemplo: `Outorgante: Henrique Paz, brasileiro, casado, engenheiro, RG 2345678-9 SSP/RS, CPF 666.777.888-99, Rua Marechal Floriano 88, Pelotas/RS.
Outorgada: minha agência.

Finalidade: representar o outorgante junto à companhia aérea Azul e à Operadora XYZ Viagens, para solicitar e acompanhar o reembolso do bilhete 957-4412880321 e da reserva 884521, cancelados em 19/01/2027, podendo prestar informações, assinar formulários da companhia, receber o valor e repassá-lo ao outorgante.

Sem poder para transigir sobre valor nem para dar quitação em nome dele.`,
  },

  // ─── Conflito e conformidade ───────────────────────────────────────────────
  {
    id:    'resposta-reclamacao',
    label: 'Resposta a reclamação (Procon, consumidor.gov.br)',
    grupo: 'conformidade',
    ajuda: 'A defesa administrativa, com cronologia, documentos e a proposta de solução.',
    placeholder:
      'O que o cliente alegou, onde, e a sua versão com as datas e os documentos que você tem.\n\nEx.: "cliente abriu no consumidor.gov.br dizendo que não foi avisado da troca de hotel; tenho o WhatsApp de 10/01 avisando e ele respondeu ok".',
    exemplo: `Reclamação no consumidor.gov.br, protocolo 2027-0123456, cliente Vanessa Dutra, CPF 888.999.000-11.

Alegação: diz que foi transferida de hotel sem aviso e sem concordar, e pede R$ 5.000 de danos morais.

Minha versão: a pousada contratada teve um problema estrutural e cancelou todas as reservas em 09/01/2027. Avisei a cliente por WhatsApp em 10/01, às 14h22, oferecendo três alternativas de categoria igual ou superior. Ela escolheu o Hotel Vista Mar, de categoria superior, na mesma mensagem, às 15h08. Não houve cobrança adicional pela diferença de categoria, que absorvi.

Tenho o print da conversa com a escolha dela e o e-mail da pousada cancelando.

Proponho: manter a posição de que não houve falha, reconhecer o transtorno e oferecer um voucher de R$ 400 em serviços como gesto comercial, sem reconhecimento de culpa.`,
    destaque: true,
  },
  {
    id:    'uso-imagem',
    label: 'Autorização de uso de imagem',
    grupo: 'conformidade',
    ajuda: 'Fotos e vídeos da viagem nas redes e no material da agência.',
    placeholder:
      'Quem autoriza, quais imagens, onde serão usadas e por quanto tempo.\n\nEx.: "fotos da excursão de Gramado para o Instagram e o site da agência, por 2 anos, sem pagamento".',
    exemplo: `Autorizante: Daniela Fogaça, CPF 999.000.111-22.

Imagens: fotos e vídeos feitos durante a excursão a Gramado e Canela, de 18 a 21/06/2027, pela equipe da agência.

Uso: perfis da agência no Instagram e no Facebook, site institucional e material impresso de divulgação de excursões.
Prazo: 2 anos a contar da assinatura.
Sem qualquer pagamento, e sem uso que associe a imagem a conteúdo ofensivo ou político.`,
  },
  {
    id:    'consentimento-lgpd',
    label: 'Termo de consentimento LGPD',
    grupo: 'conformidade',
    ajuda: 'Dados do passageiro — passaporte, cartão, restrição alimentar, condição de saúde.',
    placeholder:
      'Quais dados você coleta, para que, com quem compartilha e por quanto tempo guarda.\n\nEx.: "coleto CPF, passaporte, data de nascimento e restrição alimentar, e compartilho com a companhia aérea, o hotel e o receptivo".',
    exemplo: `Titular: Eduardo Krause, CPF 000.111.222-33.

Dados que coleto: nome, CPF, RG, data de nascimento, número e validade do passaporte, endereço, telefone, e-mail, dados de pagamento, restrição alimentar e condição de saúde relevante para a viagem (mobilidade reduzida).

Finalidade: emissão de passagens, reservas de hospedagem e serviços, contratação de seguro viagem e cumprimento de exigências migratórias.

Compartilho com: companhia aérea, operadora, hotel, receptivo no destino, seguradora e, quando exigido, autoridade migratória do país de destino.

Guardo por 5 anos depois do fim da viagem, para fins fiscais e de defesa em eventual reclamação.`,
  },
]

/** Os atalhos que aparecem acima do combo. */
export const FEATURED_DOCUMENT_TYPES = DOCUMENT_TYPES.filter(t => t.destaque)

export function getDocumentType(id?: string | null): DocumentType | null {
  if (!id) return null
  return DOCUMENT_TYPES.find(t => t.id === id) ?? null
}

/** Tipos de um grupo, na ordem do catálogo. */
export function documentTypesByGroup(grupo: DocumentGroup): DocumentType[] {
  return DOCUMENT_TYPES.filter(t => t.grupo === grupo)
}
