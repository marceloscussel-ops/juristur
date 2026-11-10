/**
 * documentos-guias.ts — O guia de redação de cada tipo de documento.
 *
 * Separado de `documentos.ts` por tamanho: o catálogo é importado pelo
 * formulário (client component) e os guias são longos, então deixá-los lá
 * levava uns 9 kB de texto que só o servidor lê para dentro do bundle do
 * navegador. Aqui, só a rota da API importa.
 *
 * `Record<DocumentTypeId, string>` é o que amarra os dois arquivos: um tipo
 * novo no catálogo sem guia aqui não compila.
 */

import type { DocumentTypeId } from './documentos'

export const DOCUMENT_GUIDES: Record<DocumentTypeId, string> = {
  'email-cliente': `E-MAIL / CARTA AO CLIENTE.
Estrutura: linha "**Assunto:**" com o assunto; saudação nominal; primeiro parágrafo dizendo o fato objetivo; parágrafos seguintes com a consequência prática e as opções disponíveis, cada opção com o que o cliente ganha e o que perde; prazo para a resposta quando houver; fechamento cordial com nome da agência, telefone e e-mail. NÃO leva campo de assinatura.
Base legal quando o caso envolver alteração de voo: Resolução ANAC 400/2016 (reacomodação, reembolso ou execução por outra modalidade, à escolha do passageiro) e CDC art. 20. Cite a norma só quando ela sustentar o que está sendo oferecido.
Armadilha: a agência é intermediária (Lei 11.771/2008), e o texto deve deixar isso claro sem soar como fuga de responsabilidade. Nunca prometa um resultado que depende do fornecedor ("garantimos o reembolso em 7 dias") — escreva o que a agência vai fazer e o prazo que o fornecedor pratica.`,

  'termo-ciencia': `TERMO DE CIÊNCIA E RESPONSABILIDADE.
Estrutura: título; qualificação do DECLARANTE (cliente) e da agência; identificação da viagem; seção "DECLARA ter sido informado de que:" com uma lista numerada, um item por informação, cada um redigido na primeira pessoa do declarante; cláusula final assumindo que o descumprimento de exigência documental ou de horário é de responsabilidade exclusiva do declarante e não gera direito a reembolso dos serviços perdidos; local e data; campo de assinatura do declarante.
Base legal: CDC art. 6º, III (direito à informação) — o termo é o cumprimento desse dever, não a sua renúncia. Documentação de viagem de menor: ECA arts. 83 a 85.
Armadilha: o termo registra CIÊNCIA de informação, e nada mais. Nunca redija nele renúncia a direito do consumidor, exclusão de responsabilidade da agência por falha de serviço próprio, nem quitação antecipada — isso é cláusula abusiva (CDC art. 51) e derruba o documento inteiro em juízo. Se o pedido da agência for nesse sentido, redija apenas a parte válida: a ciência da informação e a responsabilidade pelo ato do próprio declarante.`,

  'recusa-seguro': `TERMO DE RECUSA DE SEGURO VIAGEM.
Estrutura: título; qualificação do declarante e da agência; identificação da viagem; parágrafo dizendo que a agência OFERECEU o seguro, com a descrição das coberturas e o valor apresentado; declaração expressa de recusa por opção própria; declaração de ciência de que, sem o seguro, despesas médicas, hospitalares, de repatriação, extravio de bagagem e cancelamento correm por conta exclusiva do declarante e não são cobertas pela agência nem pelos fornecedores; menção à exigência de seguro por alguns destinos quando for o caso; local, data e assinatura.
Armadilha: descreva a cobertura oferecida de forma concreta (valor e riscos cobertos) — um termo que só diz "foi oferecido seguro" não prova o cumprimento do dever de informar. Se o destino exigir seguro obrigatório, o documento NÃO pode registrar recusa: avise que a viagem fica inviável sem ele e redija o termo deixando essa exigência explícita.`,

  'autorizacao-menor': `AUTORIZAÇÃO DE VIAGEM DE MENOR + CIÊNCIA DOS RESPONSÁVEIS.
Produza DOIS blocos no mesmo documento, separados por título: (1) a AUTORIZAÇÃO, assinada pelos responsáveis, e (2) o TERMO DE CIÊNCIA sobre as exigências formais, assinado por quem contratou.
Na autorização: qualificação completa de cada responsável (nome, nacionalidade, estado civil, profissão, RG, CPF, endereço), qualificação do menor (nome, data de nascimento, documento), qualificação do acompanhante quando houver, destino, meio de transporte e período exato, e a autorização expressa de viagem e, em viagem internacional, de saída do território nacional.
No termo de ciência, liste: necessidade de firma reconhecida em cartório, duas vias originais, validade da autorização, documento de identificação do menor com foto, passaporte do menor quando internacional, e exigências do país de destino.
Base legal: ECA arts. 83, 84 e 85; Resolução CNJ 131/2011. Viagem nacional: menor de 16 anos desacompanhado ou acompanhado de terceiro precisa de autorização judicial ou de autorização dos pais com firma reconhecida. Viagem internacional: autorização de ambos os pais com firma reconhecida, salvo decisão judicial ou autorização de um só quando o outro consta como único no registro.
Armadilha: a agência não substitui o cartório nem o juiz. Nunca escreva que o documento basta por si — ele é o modelo que os responsáveis levam para reconhecer a firma. Quando o caso exigir autorização judicial, diga isso no termo de ciência.`,

  'regulamento-excursao': `REGULAMENTO DE EXCURSÃO / VIAGEM EM GRUPO.
Estrutura: título com a identificação da excursão; identificação da organizadora; roteiro e datas; seções numeradas, uma por assunto — embarque e horários, bagagem, assentos, passeios inclusos e opcionais, alimentação, conduta e convivência, menores de idade, saúde e medicação de uso contínuo, alterações de roteiro por força maior, cancelamento e reembolso; e, no fim, declaração de adesão com local, data e assinatura do participante.
Base legal: CDC arts. 6º, III e 46 (o regulamento só obriga quem teve conhecimento prévio dele — por isso a declaração de adesão assinada); Lei 11.771/2008.
Armadilha: regra de atraso e de conduta é legítima, mas a perda do serviço precisa ser proporcional e explicada pelo custo que ela gera. Não redija cláusula de perda total do valor pago por qualquer descumprimento, nem multa sem critério. Alteração de roteiro deve estar presa a motivo real (clima, estrada, força maior), nunca a conveniência da organizadora.`,

  'proposta-comercial': `PROPOSTA COMERCIAL / ORÇAMENTO.
Estrutura: título; identificação da agência e do cliente; data da proposta; descrição do que está incluso em lista item a item; lista separada do que NÃO está incluso; valor total e por pessoa quando aplicável; condições de pagamento; prazo de validade da proposta em destaque; ressalva de confirmação; próximos passos para aceitar. NÃO leva campo de assinatura — é proposta, não contrato.
Ressalva obrigatória, com estas duas ideias: tarifas aéreas e diárias são dinâmicas e só ficam garantidas com a emissão/reserva confirmada e o pagamento conforme a condição acordada; depois do prazo de validade a proposta precisa de nova cotação.
Base legal: CDC art. 30 e art. 48 — o que está na proposta vincula a agência dentro da validade. Por isso o prazo e a ressalva precisam ser claros e visíveis, e não escondidos no fim.
Armadilha: inclusão vaga vira obrigação ampla em juízo. "Traslados" sem dizer quais trechos, "passeios" sem dizer quantos. Seja específico no que inclui e explícito no que não inclui. Também não prometa upgrade, assento ou vista sem confirmação do fornecedor.`,

  'formalizacao-financeira': `CONFISSÃO DE DÍVIDA E PARCELAMENTO.
Estrutura: título; qualificação completa do DEVEDOR e da CREDORA; cláusula de origem da dívida (qual contrato, qual serviço, data, valor total e o que já foi pago); cláusula com o valor do saldo confessado, em número e por extenso; cláusula do parcelamento com número de parcelas, valor, forma e datas exatas de vencimento; cláusula de encargos por atraso; cláusula de vencimento antecipado do saldo em caso de inadimplemento; cláusula sobre o efeito na prestação do serviço quando houver; foro; local, data; assinatura do devedor, da credora e de duas testemunhas com nome e CPF.
Base legal: Código Civil arts. 389 e 395; o documento assinado por duas testemunhas é título executivo extrajudicial (CPC art. 784, III) — por isso as testemunhas importam.
Encargos: multa de mora limitada a 2% (CDC art. 52, §1º) e juros de mora de 1% ao mês, salvo pactuação diferente informada. Se a agência pedir multa acima de 2% em relação de consumo, use 2%.
Armadilha: valor por extenso junto do numérico, datas de vencimento explícitas (nunca "a combinar") e nada de cláusula autorizando desconto em folha, retenção de documento do cliente ou cobrança vexatória (CDC art. 42).`,

  'recibo': `RECIBO.
Estrutura: título "RECIBO"; valor em destaque, em número e por extenso; nome e CPF/CNPJ de quem pagou; discriminação do que o pagamento se refere (serviço, contrato de origem, período da viagem); forma de pagamento e data do recebimento; quando for pagamento parcial, o valor total e o saldo remanescente; identificação da agência com documento; local, data e assinatura da agência.
Armadilha: recibo de valor parcial que não diz que é parcial funciona como quitação integral. Quando houver saldo, escreva o total, o que foi pago e o que resta. E o recibo não substitui nota fiscal — não o chame de nota nem de fatura.`,

  'acordo-reembolso': `ACORDO DE CANCELAMENTO E REEMBOLSO.
Estrutura: título; qualificação das partes; cláusula com a identificação do contrato cancelado e a data e a origem do pedido de cancelamento; cláusula com o total pago; cláusula de apuração — uma linha POR SERVIÇO, com o valor pago, o valor retido, o motivo concreto da retenção e o valor devolvido; cláusula com o total a devolver, em número e por extenso; cláusula com forma, prazo e conta/chave da devolução; cláusula de quitação recíproca limitada ao que o acordo trata; local, data e assinaturas das duas partes.
Base legal: CDC art. 49 (arrependimento em 7 dias para compra fora do estabelecimento — se o caso cair aí, a devolução é integral e imediata, e o documento deve refletir isso); Resolução ANAC 400/2016 art. 11 (desistência em 24h da compra, sem ônus, quando a compra foi feita a 7 dias ou mais do voo); Lei 11.771/2008.
Armadilha: toda retenção precisa de motivo concreto e verificável — regra tarifária do fornecedor, prazo de cancelamento da hospedagem, serviço de intermediação já prestado. Retenção sem causa declarada é o que faz o acordo cair. Nunca redija quitação ampla ("nada mais a reclamar a qualquer título"): a quitação é do objeto deste acordo. E não prometa prazo que depende do fornecedor sem dizer que ele conta do repasse.`,

  'cobranca-amigavel': `AVISO DE INADIMPLÊNCIA / COBRANÇA AMIGÁVEL.
Estrutura: título; destinatário com nome e documento; remetente; parágrafo com a origem da obrigação (contrato, data, serviço); demonstrativo do débito — uma linha por parcela vencida, com vencimento, principal, multa e juros, e o total atualizado; prazo para pagamento em dias e a data-limite; forma de pagamento; consequência objetiva da falta de pagamento; convite a procurar a agência para renegociar; local, data e identificação de quem assina pela agência.
Base legal: CDC art. 42 e art. 71 — cobrança não pode expor o consumidor a ridículo, ameaça ou constrangimento, nem usar afirmação falsa. Multa de mora até 2% (CDC art. 52, §1º).
Armadilha: tom firme, nunca ameaçador. Não escreva que o nome "já foi negativado" se não foi, não mencione terceiros (família, empregador), não ameace com consequência que a agência não pode executar, e não anuncie protesto ou negativação como se fosse imediata. Escreva a consequência real: cobrança judicial do título e suspensão da emissão.`,

  'termo-renuncia': `TERMO DE DESISTÊNCIA E RENÚNCIA DE VIAGEM.
Estrutura: título; qualificação das partes; cláusula identificando o contrato de origem e os serviços contratados; cláusula declarando que a desistência parte do DECLARANTE, por vontade própria, com a data da comunicação, e que não decorre de falha na prestação do serviço; cláusula discriminando item por item o que é retido, com o motivo concreto de cada retenção; cláusula com o valor a devolver, se houver, e o prazo; cláusula de quitação recíproca restrita ao contrato desistido; local, data, assinatura do declarante e de duas testemunhas.
Base legal: CDC art. 51 (nulidade de cláusula abusiva) e art. 25 (é vedada a cláusula que impossibilite ou atenue a responsabilidade do fornecedor por vício). Resolução ANAC 400/2016 para a regra tarifária.
ARMADILHA PRINCIPAL deste documento: a renúncia é ao SERVIÇO CONTRATADO e ao valor retido conforme a regra já informada — nunca ao direito de reclamar. Nunca redija renúncia ao direito de reclamação administrativa ou judicial, renúncia prévia a indenização por vício ou defeito de serviço, nem quitação de fato futuro. Se a agência pedir isso, redija a versão válida: declaração de que a desistência é voluntária e reconhecimento das retenções discriminadas. Toda retenção sem motivo declarado deve virar lacuna, não um valor inventado.`,

  'distrato': `DISTRATO / RESCISÃO CONSENSUAL.
Estrutura: título; qualificação das duas partes; cláusula identificando o contrato rescindido (data, objeto, valor); cláusula com o motivo da rescisão e a declaração de que ela é consensual; cláusula de acerto financeiro, discriminando o que foi pago, o que é retido e com que fundamento, e o que será devolvido, com prazo e forma; cláusula declarando extintas as obrigações recíprocas a partir da assinatura, ressalvando a devolução pactuada até a sua quitação; cláusula de confidencialidade quando pedida; foro; local, data, assinaturas das duas partes e de duas testemunhas.
Base legal: Código Civil art. 472 (o distrato se faz na mesma forma do contrato) — se o contrato de origem foi escrito, o distrato é escrito.
Armadilha: distrato é bilateral. Não redija como se fosse rescisão unilateral nem como punição de uma parte. A quitação recíproca só vale depois de cumprida a devolução — deixe isso explícito, senão a agência quita antes de pagar.`,

  'notificacao-fornecedor': `NOTIFICAÇÃO EXTRAJUDICIAL A FORNECEDOR.
Estrutura: título "NOTIFICAÇÃO EXTRAJUDICIAL"; destinatário com razão social, CNPJ e endereço; notificante com os mesmos dados; cláusula dos fatos em ordem cronológica, com datas, números de reserva/localizador e o que cada parte fez, incluindo as cobranças anteriores; cláusula do fundamento, com a obrigação descumprida; cláusula do pedido, objetivo e quantificado; prazo em dias para o cumprimento; consequência do silêncio; local, data e assinatura da agência.
Base legal: Código Civil arts. 389, 394 e 395 (mora e perdas e danos); CDC quando a agência responde solidariamente perante o consumidor e cobra em regresso do fornecedor (CDC arts. 7º, §único, e 25, §1º); Resolução ANAC 400/2016 quando o fornecedor é companhia aérea.
Armadilha: entre fornecedor e agência a relação é empresarial, não de consumo — não invoque CDC como se a agência fosse consumidora, salvo na parte do regresso. Pedido tem que ser líquido: valor exato, prazo em dias, forma. Mencione só a consequência que a agência de fato vai executar.`,

  'procuracao-reembolso': `PROCURAÇÃO.
Estrutura: título "PROCURAÇÃO"; qualificação completa do OUTORGANTE (nome, nacionalidade, estado civil, profissão, RG, CPF, endereço — a qualificação completa é o que o fornecedor exige); qualificação da OUTORGADA; cláusula de poderes, descrevendo a finalidade específica e os atos autorizados, um a um; cláusula de limites, dizendo expressamente o que a outorgada NÃO pode fazer; prazo de validade; local, data e assinatura do outorgante.
Base legal: Código Civil arts. 653 a 666. Art. 661, §1º: alienar, transigir ou dar quitação exige poderes expressos — se não estiverem escritos, não existem.
Armadilha: procuração de finalidade ampla ("para os fins que se fizerem necessários") é um risco para as duas partes e muitos fornecedores recusam. Escreva o localizador, o número do bilhete e o fornecedor. Quando a procuração autorizar receber valores, diga em qual conta entram e em que prazo são repassados ao outorgante. Se o pedido envolver quitação ou transação, isso precisa estar expresso — sem isso, registre no documento que esses poderes não foram outorgados.`,

  'resposta-reclamacao': `RESPOSTA A RECLAMAÇÃO ADMINISTRATIVA.
Estrutura: cabeçalho com o órgão, o número do protocolo, o nome do consumidor e a identificação da agência; seção "DA RECLAMAÇÃO" resumindo com fidelidade o que foi alegado; seção "DOS FATOS" com a cronologia da agência, data por data, citando os documentos que comprovam cada ponto e o que cada um prova; seção "DO DIREITO" com o enquadramento; seção "DA PROPOSTA" com o que a agência oferece, se oferecer; fechamento com local, data e identificação de quem assina. Liste no fim os documentos que sustentam a resposta — inclusive os que a agência disse ter em mãos e vai anexar no sistema do órgão, não só os que vieram junto do pedido.
Base legal: CDC arts. 6º, III, 14, §3º (excludentes: inexistência do defeito ou culpa exclusiva do consumidor ou de terceiro), 20 e 30; Lei 11.771/2008 e a posição da agência como intermediária; Decreto 11.034/2022 (regulamento do SAC) quando o ponto for atendimento.
Armadilha: respeitoso e factual, nunca irônico ou acusatório — o órgão lê o tom. Afirme apenas o que o documento comprova; para o que não houver prova, descreva o fato sem adjetivar. Quando houver proposta comercial, registre que é gesto de boa-fé sem reconhecimento de culpa. E não negue um fato que os próprios documentos do caso contradizem: aponte a excludente aplicável em vez de negar o fato.`,

  'uso-imagem': `AUTORIZAÇÃO DE USO DE IMAGEM.
Estrutura: título; qualificação do AUTORIZANTE e da agência; descrição das imagens autorizadas (ocasião, data, autoria); descrição dos usos autorizados, meio por meio; prazo de vigência; cláusula de gratuidade ou do valor pactuado; cláusula de limites (nada ofensivo, discriminatório, político-partidário ou que exponha o autorizante ao ridículo); cláusula de revogação, dizendo como o autorizante pede a retirada e em que prazo a agência atende; local, data e assinatura. Quando o autorizante for menor, a assinatura é dos dois responsáveis, com a qualificação deles.
Base legal: Constituição art. 5º, X e XXVIII; Código Civil art. 20; LGPD (Lei 13.709/2018) arts. 7º, I, 9º e 18 — imagem de pessoa identificável é dado pessoal, então o consentimento tem de ser para finalidade específica e informada, e revogável.
Armadilha: nunca redija autorização perpétua, irrevogável, para "quaisquer fins" ou com cessão ampla de direitos — sob a LGPD o consentimento é revogável e finalidade genérica o invalida. Finalidade, meios e prazo precisam estar escritos. Falta de prazo informado vira lacuna, não "prazo indeterminado".`,

  'consentimento-lgpd': `TERMO DE CONSENTIMENTO PARA TRATAMENTO DE DADOS PESSOAIS.
Estrutura: título; identificação do TITULAR e da agência como CONTROLADORA, com canal de contato para pedidos do titular; seção com os dados coletados, em lista; seção com a finalidade de cada grupo de dados; seção com o compartilhamento, nomeando as categorias de destinatários e o motivo; seção de transferência internacional quando a viagem for internacional, explicando que ela decorre da própria execução do contrato; seção com o prazo de guarda e o motivo; seção com os direitos do titular (confirmação, acesso, correção, anonimização, portabilidade, eliminação, revogação) e como exercê-los; declaração de consentimento específico para os dados sensíveis, destacada; local, data e assinatura.
Base legal: LGPD arts. 7º (I consentimento, V execução de contrato), 9º (informação clara sobre finalidade, duração e compartilhamento), 11 (dado sensível — saúde, mobilidade, restrição alimentar de origem religiosa — exige consentimento específico e destacado), 18 (direitos) e 33 (transferência internacional).
Armadilha: boa parte do tratamento de uma agência se sustenta na execução do contrato, não no consentimento — não peça consentimento para o que é necessário à emissão da passagem, porque isso dá ao titular a impressão de que pode revogar sem perder o serviço. Separe no documento: o que é execução do contrato e o que depende de consentimento (dado sensível, marketing). Nunca condicione a prestação do serviço ao consentimento para marketing.`,
}

export function getDocumentGuia(id?: string | null): string | null {
  if (!id) return null
  return DOCUMENT_GUIDES[id as DocumentTypeId] ?? null
}
