/**
 * contrato-turismo.ts — Modelo base do contrato de intermediação de turismo.
 *
 * Texto derivado de um contrato real de agência (ZZZ Tour), generalizado: os
 * dados da CONTRATADA saem do perfil da agência e os da CONTRATANTE dos
 * documentos/prompt que a agência enviar. As cláusulas são a espinha dorsal —
 * a IA preenche as lacunas e ajusta o que o usuário pedir, mas não reescreve
 * a estrutura.
 *
 * Para acrescentar um segundo modelo, exporte outro `ContractTemplate` e
 * registre em CONTRACT_TEMPLATES: o resto do fluxo é genérico.
 */

export interface ContractTemplate {
  id:    string
  nome:  string
  /** Uma linha, para a UI de escolha do modelo. */
  resumo: string
  /** Texto base em markdown, com as lacunas marcadas. */
  corpo: string
}

/**
 * Lacuna a preencher à mão depois da geração. A IA usa esta mesma marca
 * quando não tem o dado — assim a agência vê na hora o que falta.
 */
export const LACUNA = '__________'

const CONTRATO_INTERMEDIACAO_TURISMO: ContractTemplate = {
  id:     'intermediacao-turismo',
  nome:   'Contrato de intermediação de serviços de turismo',
  resumo: 'Prestação de serviço entre a agência e o consumidor pessoa física.',
  corpo: `# CONTRATO DE INTERMEDIAÇÃO DE SERVIÇOS DE TURISMO

**CONTRATANTE:** {{cliente_nome}}, {{cliente_nacionalidade}}, inscrito(a) no CPF sob o nº {{cliente_cpf}}, residente e domiciliado(a) em {{cliente_endereco}}, e-mail {{cliente_email}}, telefone {{cliente_telefone}}.

**CONTRATADA:** {{agencia_nome}}, inscrita no {{agencia_doc_label}} sob o nº {{agencia_cnpj}}, com sede em {{agencia_endereco}}, e-mail {{agencia_email}} e telefone {{agencia_telefone}}.

## DA NATUREZA DO CONTRATO

**CLÁUSULA PRIMEIRA:** O presente contrato foi elaborado em estrita observância às normas contidas no Código de Defesa do Consumidor, à Lei nº 11.771/2008 (Política Nacional de Turismo) e às deliberações normativas aplicáveis ao setor, estando em conformidade com as diretrizes das entidades representativas das operadoras de turismo.

**CLÁUSULA SEGUNDA:** A atividade empresarial desempenhada pela CONTRATADA é de mera intermediação remunerada entre fornecedores e consumidores de serviços turísticos, bem como demais atividades complementares a esses serviços.

**CLÁUSULA TERCEIRA:** Todos os fornecedores contratados para o cumprimento do objeto, rotas, destinos, acomodações, translados e demais serviços são de conhecimento e concordância do CONTRATANTE.

## DO OBJETO

**CLÁUSULA QUARTA:** O presente contrato tem como objeto a intermediação, por parte da CONTRATADA, dos seguintes serviços de turismo adquiridos pelo CONTRATANTE:

**ITENS INCLUSOS:**
{{itens_inclusos}}

**ITENS NÃO INCLUSOS:** Fica pactuado que os demais serviços que não constam na relação de "ITENS INCLUSOS" não fazem parte do objeto contratado e, portanto, a CONTRATADA não possui qualquer responsabilidade ou gerência sobre eles.

**PARÁGRAFO PRIMEIRO:** A CONTRATADA não se responsabiliza por eventos de força maior que venham a ocorrer durante a execução de qualquer produto ou serviço, tais como greves, distúrbios, quarentenas, guerras, fenômenos naturais, causas climáticas, atrasos e/ou cancelamentos de trajetos por motivos políticos, operacionais, organizacionais, judiciais ou de tráfego aéreo, sobre os quais não possui qualquer poder de previsão ou controle, bem como pelo inadimplemento contratual dos fornecedores, haja vista que a relação entre eles e a CONTRATADA é de mera intermediação comercial.

**PARÁGRAFO SEGUNDO:** A CONTRATADA não é responsável por itens pessoais do CONTRATANTE que venham a ser perdidos, esquecidos, furtados ou extraviados durante a realização da viagem.

## DA REMUNERAÇÃO

**CLÁUSULA QUINTA:** Pelos serviços de intermediação prestados, por solicitação do CONTRATANTE, a CONTRATADA fará jus à remuneração no valor total de {{valor_total}}.

**CLÁUSULA SEXTA:** O pagamento será efetuado da seguinte forma: {{forma_pagamento}}.

**PARÁGRAFO ÚNICO:** Dada a forma de pagamento escolhida, o CONTRATANTE declara ciência e autoriza a realização dos débitos citados nesta cláusula. O CONTRATANTE declara ainda que, em nenhuma hipótese, alegará desconhecer ou negar a origem dos débitos perante a administradora do cartão de crédito.

**CLÁUSULA SÉTIMA:** Em caso de inadimplência do CONTRATANTE, a impontualidade no pagamento de qualquer parcela, independentemente do motivo, poderá dar ensejo à inscrição do nome do CONTRATANTE nos órgãos restritivos de crédito, bem como à cobrança do débito com acréscimo de juros e correção monetária, despesas de cobrança, além de honorários advocatícios e custas judiciais, se necessário o ingresso em juízo.

## ALTERAÇÕES, CANCELAMENTOS E REEMBOLSOS

**CLÁUSULA OITAVA:** O CONTRATANTE afirma estar ciente e de acordo com as políticas de cancelamento estipuladas pelos fornecedores da CONTRATADA.

**CLÁUSULA NONA:** Segundo as políticas de cancelamento dos fornecedores, sobre as quais a CONTRATADA não possui qualquer possibilidade de interferência, não são reembolsáveis, nem admitem cancelamento ou alteração, os seguintes serviços:

{{servicos_nao_reembolsaveis}}

**CLÁUSULA DÉCIMA:** Os seguintes serviços e atividades permitem cancelamento, eventuais alterações e reembolso, desde que cumpridos os requisitos específicos indicados:

{{servicos_reembolsaveis}}

**CLÁUSULA DÉCIMA PRIMEIRA:** Todo pedido de cancelamento, alteração e/ou reembolso deverá ser comunicado pelo e-mail {{agencia_email}}, com 24h de antecedência em relação ao prazo específico de cada serviço descrito na "CLÁUSULA DÉCIMA". Notificações via telefone, WhatsApp ou outros meios de comunicação não serão consideradas.

## OBRIGAÇÕES DO CONTRATANTE

**CLÁUSULA DÉCIMA SEGUNDA:** São obrigações do CONTRATANTE:

- efetuar o pagamento nos moldes do item "DA REMUNERAÇÃO", sob pena de imposição de multa de 20% e desfazimento da relação contratual no caso de inadimplemento superior a 03 (três) meses;
- comunicar a CONTRATADA, ou diretamente o hotel, em caso de atraso para check-in ou entrada posterior à data contratada;
- verificar e assumir os encargos diretamente com o hotel nos casos de entrada antecipada ou saída posterior ao horário, salvo quando o pacote adquirido já incluir check-in antecipado ou saída tardia;
- respeitar as condições estipuladas em contrato próprio de locação de veículo, sobre o qual a CONTRATADA não possui qualquer responsabilidade, a não ser que o serviço de aluguel de automóvel faça parte do objeto deste contrato;
- caso o serviço de locação de carros seja intermediado pela CONTRATADA, cumprir os horários informados, com tolerância de apenas 01h, para retirada ou devolução do veículo locado, sendo responsabilizado em caso de atrasos e multas, e devolver o automóvel em perfeitas condições e com o tanque de combustível cheio;
- apresentar carteira de habilitação válida e física para locação de carros fora do Brasil, haja vista que a CNH digital não é aceita para o aluguel de veículos no exterior, bem como cartão de crédito internacional válido e com limite disponível;
- responsabilizar-se por sua documentação, tanto para o embarque quanto para a livre circulação e permanência, apresentando os documentos originais, vistos válidos (quando exigíveis), comprovantes de vacinação ou exames de saúde necessários de acordo com a política sanitária e migratória de cada destino, nacional ou no exterior.

**PARÁGRAFO ÚNICO:** O CONTRATANTE está ciente de que, mesmo portando todos os documentos e visto válido, a polícia de fronteira pode, em ato discricionário, impedir o ingresso de qualquer cidadão.

## OBRIGAÇÕES DA CONTRATADA

**CLÁUSULA DÉCIMA TERCEIRA:** São obrigações da CONTRATADA:

- organizar o roteiro com base nas necessidades e solicitações do CONTRATANTE;
- empregar todos os esforços que lhe forem possíveis para que o objeto do contrato seja cumprido;
- atender ao CONTRATANTE e responder a eventuais questionamentos com agilidade e segurança;
- comunicar ao CONTRATANTE qualquer contratempo que venha a ocorrer com algum de seus fornecedores ou com serviços que façam parte do roteiro;
- ofertar ao CONTRATANTE, no momento da composição da viagem, a prestação de seus serviços adicionais, conforme adiante demonstrado.

## SERVIÇOS ADICIONAIS

**CLÁUSULA DÉCIMA QUARTA:** Caso o CONTRATANTE deseje adquirir serviços adicionais não compreendidos no preço do item "DA REMUNERAÇÃO", tais como roteiro personalizado ou seguro de assistência de viagem, deverá contratá-los em apartado, mediante assinatura do campo correspondente abaixo.

{{servicos_adicionais}}

**PARÁGRAFO ÚNICO:** O CONTRATANTE declara que foi orientado pela CONTRATADA sobre as possibilidades de seguro de assistência de viagem existentes e que a cobertura eventualmente escolhida atende às suas necessidades.

## DA RESCISÃO CONTRATUAL

**CLÁUSULA DÉCIMA QUINTA:** O contrato será rescindido nas seguintes hipóteses:

- por falta de pagamento, nos termos da "CLÁUSULA DÉCIMA SEGUNDA";
- a pedido de qualquer uma das partes, desde que com comunicação prévia mínima de 30 dias, por e-mail.

**PARÁGRAFO PRIMEIRO:** Nessa hipótese, as políticas de reembolso, cancelamento e alteração de cada fornecedor permanecerão aplicáveis, conforme a "CLÁUSULA OITAVA" em diante.

**PARÁGRAFO SEGUNDO:** O CONTRATANTE terá direito apenas à devolução dos valores reembolsados pelos fornecedores, visto que a remuneração da CONTRATADA, na condição de assessoria de viagens e intermediadora dos serviços de turismo, não será restituída, uma vez que sua atividade principal foi cumprida com o desenvolvimento do roteiro.

## DISPOSIÇÕES GERAIS

**CLÁUSULA DÉCIMA SEXTA:** O presente instrumento é título executivo extrajudicial, o que significa que a falta de cumprimento de qualquer das cláusulas avençadas permite à parte prejudicada executá-lo, independentemente de notificação extrajudicial.

**CLÁUSULA DÉCIMA SÉTIMA:** As partes elegem o Foro da Comarca de {{foro}} para dirimir quaisquer dúvidas, obscuridades ou controvérsias acerca do presente contrato.

{{local_data}}

---

**CONTRATANTE**
{{cliente_nome}}

**CONTRATADA**
{{agencia_nome}}
`,
}

export const CONTRACT_TEMPLATES: ContractTemplate[] = [CONTRATO_INTERMEDIACAO_TURISMO]

/** Modelo usado quando a agência não escolhe outro. */
export const DEFAULT_CONTRACT_TEMPLATE_ID = CONTRATO_INTERMEDIACAO_TURISMO.id

export function getContractTemplate(id?: string | null): ContractTemplate {
  return CONTRACT_TEMPLATES.find(t => t.id === id) ?? CONTRATO_INTERMEDIACAO_TURISMO
}
