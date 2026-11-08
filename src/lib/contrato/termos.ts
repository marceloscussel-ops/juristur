/**
 * termos.ts — Texto do contrato de licença de uso do TurisGuard.
 *
 * O contrato é dividido em duas partes, e essa divisão é deliberada:
 *
 *  1. CORPO GENÉRICO — idêntico para todas as agências. Vive aqui, em código,
 *     versionado por `CONTRATO_VERSAO`. Mudança no texto = nova versão, e o
 *     aceite guardado no banco continua apontando para a versão que a agência
 *     realmente leu.
 *  2. ANEXO I — os dados variáveis (agência, plano, valor, forma de pagamento,
 *     data de ativação). Montado no momento do aceite por `montarAnexoI` e
 *     congelado junto com o aceite, porque é ele que individualiza o contrato.
 *
 * O aceite grava o markdown completo (corpo + anexo) em
 * `contract_acceptances.contract_text`: assim o PDF de um aceite de 2026
 * continua reproduzível depois de o corpo mudar duas vezes.
 */

/**
 * Versão do corpo genérico. **Suba ao alterar o texto das cláusulas.**
 * Aceites antigos guardam a versão que foi aceita — não reescreva histórico.
 *
 * Histórico:
 *   1.0 — texto inicial (a Cláusula Terceira fixava 1 escalonamento/ano).
 *   1.1 — a Cláusula Terceira passa a remeter a quantidade de escalonamentos
 *         ao Anexo I, porque ela varia por plano (Essential 0, Professional 1,
 *         Enterprise 3).
 */
export const CONTRATO_VERSAO = '1.1'

/** Data de entrada em vigor desta versão (ISO, só a data). */
export const CONTRATO_VIGENTE_DESDE = '2026-11-08'

export const CONTRATO_TITULO =
  'Contrato de licença de uso de plataforma digital e prestação de serviços de tecnologia e assessoria para agências de turismo'

/** Lacuna para dado que a agência ainda não informou. */
const LACUNA = '—'

/**
 * Corpo genérico, em markdown. Não contém nenhum dado da agência: tudo que
 * individualiza o contrato está no Anexo I, que é parte integrante dele.
 */
export const CONTRATO_CORPO = `# CONTRATO DE LICENÇA DE USO DE PLATAFORMA DIGITAL E PRESTAÇÃO DE SERVIÇOS DE TECNOLOGIA E ASSESSORIA PARA AGÊNCIAS DE TURISMO

Pelo presente instrumento particular, **FIDEMARC TECNOLOGIA LTDA**, pessoa jurídica de direito privado, inscrita no CNPJ sob nº 68.390.480/0001-88, titular e responsável pela plataforma digital denominada **TURISGUARD**, com sede na Rua Jamil Koff, 563, bairro São José, CEP 95720-000, na cidade de Garibaldi/RS, neste ato representada na forma de seu contrato social, doravante denominada **CONTRATADA** ou **TURISGUARD**; e, de outro lado, a **AGÊNCIA DE TURISMO** qualificada no **Anexo I** deste instrumento, pessoa física ou jurídica neste ato representada pelo titular da conta de acesso identificado no mesmo anexo, doravante denominada **CONTRATANTE** ou **AGÊNCIA**; resolvem celebrar o presente contrato, mediante as cláusulas e condições seguintes.

O **Anexo I — Identificação da Contratante e do Plano** é parte integrante e inseparável deste contrato e registra os dados cadastrais da CONTRATANTE, o plano contratado, a modalidade, o valor, a forma de pagamento, a data de ativação e as condições do aceite eletrônico.

## DO OBJETO

**CLÁUSULA PRIMEIRA:** O presente contrato tem por objeto a concessão de licença de uso, não exclusiva, pessoal, intransferível e limitada, da plataforma digital TURISGUARD, de titularidade da CONTRATADA, destinada a disponibilizar à CONTRATANTE ferramentas tecnológicas de apoio, orientação e consulta relacionadas à atividade empresarial de agenciamento de viagens e turismo.

## DOS SERVIÇOS CONTRATADOS

**CLÁUSULA SEGUNDA:** Mediante a assinatura, a plataforma irá disponibilizar:

- a) orientações gerais e preliminares acerca das dúvidas apresentadas pela CONTRATANTE, com base em consultas automatizadas por meio de inteligência artificial direcionada e fundamentada em extensa pesquisa de jurisprudência, legislação e precedentes jurídicos;
- b) classificação indicativa de riscos e identificação de possíveis pontos de atenção, conforme cada caso específico;
- c) elaboração de modelos de respostas, emails e solicitações em face de clientes, operadoras e/ou companhias aéreas;
- d) análise e revisão de contratos e documentos;
- e) histórico e organização das consultas realizadas;
- f) integração com canais de comunicação na própria plataforma, ou por WhatsApp;
- g) manutenção da infraestrutura tecnológica necessária ao funcionamento regular dos serviços, ressalvadas indisponibilidades justificadas.

**PARÁGRAFO PRIMEIRO:** A plataforma constitui ferramenta tecnológica de apoio à tomada de decisões, não substituindo a análise individualizada dos fatos, a atuação dos profissionais responsáveis pela AGÊNCIA ou a contratação de serviços jurídicos especializados quando necessários.

**PARÁGRAFO SEGUNDO:** A CONTRATANTE deverá fornecer informações verdadeiras, completas e suficientemente detalhadas para permitir a adequada compreensão das situações submetidas à plataforma.

**PARÁGRAFO TERCEIRO:** A CONTRATANTE será responsável por avaliar as orientações recebidas e decidir sobre sua aplicação concreta.

## DO PLANO E DO ESCALONAMENTO PARA ADVOGADO

**CLÁUSULA TERCEIRA:** Todos os serviços da plataforma possuem conferência de advogado. Além disso, em virtude do plano contratado, identificado no **Anexo I**, a AGÊNCIA poderá solicitar, sem custo adicional, a quantidade de escalonamentos para advogado por ano ali indicada, enquanto vigorar sua assinatura. O plano cujo Anexo I não indique escalonamento incluso não confere direito a escalonamento sem custo adicional.

**PARÁGRAFO PRIMEIRO:** Corresponde a 1 (um) escalonamento para advogado, qualquer uma das seguintes atividades:

- a) elaboração de contrato;
- b) apresentação de defesa em processo judicial;
- c) acompanhamento em audiência de qualquer natureza;
- d) confecção de qualquer peça jurídica em processo vigente ou extrajudicial.

**PARÁGRAFO SEGUNDO:** O escalonamento previsto pelo plano e sem cobrança adicional poderá ser utilizado, tão somente, após o vencimento do período de carência de 60 (sessenta) dias, no qual a CONTRATANTE poderá utilizar normalmente as funcionalidades tecnológicas e demais orientações automatizadas.

**PARÁGRAFO TERCEIRO:** Os escalonamentos que excederem a quantidade inclusa no plano contratado — bem como qualquer escalonamento, quando o Anexo I não indicar escalonamento incluso — e os serviços jurídicos adicionais prestados antes do prazo de 60 dias não estão incluídos na assinatura e dependerão de contratação específica, com definição direta dos honorários entre a AGÊNCIA e o advogado responsável, considerando a natureza, complexidade, urgência, extensão e responsabilidade envolvidas na demanda.

## REGRAS PARA O USO DA PLATAFORMA

**CLÁUSULA QUARTA:** Visando o uso correto do TURISGUARD, são deveres da AGÊNCIA contratante:

**4.1** - Efetuar o pagamento nos moldes do plano contratado, sob pena de imposição de multa de 20% e desfazimento da relação contratual no caso de inadimplemento superior a 03 (três) meses;

**4.2** - Fornecer informações verdadeiras, completas e atualizadas de acordo a finalidade da plataforma e com as disposições deste instrumento;

**4.3** - Manter atualizados seus dados cadastrais e evitar o compartilhamento de suas credenciais e acesso com terceiros não autorizados, sob pena de suspensão temporária ou definitiva do plano;

**4.4** - Adotar medidas razoáveis de segurança da informação e proteção de dados pessoais da sua agência e de seus clientes.

## DA PROTEÇÃO DE DADOS PESSOAIS E DA LGPD

**CLÁUSULA QUINTA:** As PARTES comprometem-se a cumprir a Lei nº 13.709/2018 – Lei Geral de Proteção de Dados Pessoais (LGPD), bem como as demais normas aplicáveis à privacidade, segurança da informação e proteção de dados pessoais.

**CLÁUSULA SEXTA:** A CONTRATANTE declara possuir legitimidade e base legal adequada para inserir na plataforma dados pessoais de passageiros, consumidores, representantes, colaboradores e demais terceiros, responsabilizando-se pela observância dos deveres de transparência e informação perante os titulares.

**CLÁUSULA SÉTIMA:** A CONTRATANTE declara estar ciente de que deverá evitar inserir dados pessoais sensíveis, documentos de identificação completos, dados financeiros ou informações excessivas quando tais elementos não forem necessários à compreensão da consulta.

## DA CONFIDENCIALIDADE E DA PROPRIEDADE INTELECTUAL

**CLÁUSULA OITAVA:** As PARTES obrigam-se a manter sigilo sobre informações comerciais, técnicas, operacionais, estratégicas, financeiras, jurídicas e quaisquer outras informações confidenciais a que tenham acesso em razão deste contrato.

**CLÁUSULA NONA:** A obrigação de confidencialidade permanecerá vigente durante a execução do contrato e pelo prazo de 5 (cinco) anos após seu encerramento, ressalvadas as informações protegidas por sigilo legal ou profissional, cuja proteção observará os prazos e condições previstos na legislação aplicável.

**CLÁUSULA DÉCIMA:** A plataforma TURISGUARD, seus sistemas, códigos, interfaces, funcionalidades, marcas, elementos visuais, conteúdos, bases estruturadas, materiais e demais componentes tecnológicos são de titularidade da CONTRATADA.

**CLÁUSULA DÉCIMA PRIMEIRA:** O presente contrato concede à CONTRATANTE apenas licença limitada de uso, não exclusiva, intransferível e revogável nas hipóteses previstas neste instrumento, não implicando cessão de propriedade intelectual.

**CLÁUSULA DÉCIMA SEGUNDA:** É vedado à CONTRATANTE copiar, reproduzir, modificar, distribuir, comercializar, sublicenciar ou explorar economicamente qualquer componente da plataforma sem autorização expressa e escrita da CONTRATADA.

## DA VIGÊNCIA E RENOVAÇÃO

**CLÁUSULA DÉCIMA TERCEIRA:** O presente contrato terá início na data de confirmação da contratação e permanecerá vigente pelo período correspondente ao plano escolhido.

**PARÁGRAFO PRIMEIRO:** Nos planos mensais, a vigência mínima será de 3 (três) meses e será renovada sucessivamente, mediante pagamento da respectiva mensalidade, salvo manifestação de cancelamento.

**PARÁGRAFO SEGUNDO:** Nos planos anuais, a vigência será de 12 (doze) meses, com renovação automática ao final do contrato, salvo solicitação expressa de cancelamento pela CONTRATANTE ou não realização do pagamento.

**PARÁGRAFO TERCEIRO:** Eventuais atualizações e reajustes no valor do plano, mediante decisão discricionária da CONTRATADA, deverão ser comunicadas com antecedência mínima de 30 dias à CONTRATANTE, sendo considerado o aceite ainda que de forma tácita na ausência de solicitação de cancelamento durante o prazo citado.

**CLÁUSULA DÉCIMA QUARTA:** A CONTRATADA poderá rescindir o contrato em caso de descumprimento contratual relevante pela CONTRATANTE, mediante comunicação e concessão de prazo razoável para regularização.

**PARÁGRAFO ÚNICO:** eventual tolerância da CONTRATADA quanto ao descumprimento de obrigação pela CONTRATANTE não constituirá renúncia de direito, novação ou alteração contratual.

**CLÁUSULA DÉCIMA QUINTA:** A rescisão imediata poderá ocorrer em situações de fraude, uso ilícito da plataforma, violação grave de segurança ou prática que exponha a CONTRATADA ou terceiros a risco relevante, sem prejuízo das medidas legais cabíveis.

## DISPOSIÇÕES GERAIS

**CLÁUSULA DÉCIMA SEXTA:** Ambas as partes elegem o Foro Central da Comarca de Porto Alegre/RS, observadas as regras legais de competência e as normas de proteção do consumidor eventualmente aplicáveis, para dirimir controvérsias decorrentes deste contrato, sem prejuízo de eventual tentativa prévia de solução consensual.

**CLÁUSULA DÉCIMA SÉTIMA:** O presente contrato constituirá título executivo extrajudicial, nos termos do artigo 784, inciso III, do Código de Processo Civil, preenchidos os requisitos legais de certeza, liquidez e exigibilidade das obrigações nele previstas.

**CLÁUSULA DÉCIMA OITAVA:** A CONTRATANTE manifesta sua concordância com este instrumento por meio de aceite eletrônico na plataforma TURISGUARD, registrado com data, hora, identificação da conta e demais dados constantes do Anexo I, forma que as PARTES reconhecem como válida e suficiente para a formação do contrato, nos termos do artigo 10, § 2º, da Medida Provisória nº 2.200-2/2001.

E, por estarem justas e contratadas, as partes aceitam o presente instrumento, para que produza todos os seus efeitos jurídicos.`

// ─── Anexo I ─────────────────────────────────────────────────────────────────

/** Momento em que o aceite foi colhido. */
export type AceiteEvento = 'cadastro' | 'assinatura' | 'renovacao'

export const ACEITE_EVENTO_LABEL: Record<AceiteEvento, string> = {
  cadastro:   'Cadastro na plataforma',
  assinatura: 'Assinatura do plano',
  renovacao:  'Renovação do plano',
}

/** Dados da agência no Anexo I. Tudo opcional: o que falta sai como "—". */
export interface AnexoAgencia {
  nome?:      string | null
  documento?: string | null   // CPF/CNPJ, só dígitos ou formatado
  endereco?:  string | null
  email?:     string | null
  telefone?:  string | null
}

/** Plano no Anexo I. No cadastro, descreve o período gratuito. */
export interface AnexoPlano {
  nome:            string   // 'Essential' | 'Período de avaliação gratuito'
  modalidade:      string   // 'Mensal' | 'Anual' | 'Avaliação gratuita'
  valor:           string   // 'R$ 99,00 por mês'
  formaPagamento:  string   // 'Cartão de crédito' | 'PIX' | 'Não aplicável'
  ativacao:        string   // texto já formatado (ex.: '08 de novembro de 2026')
  escalonamentos?: string   // ex.: '1 (um) escalonamento por ano...'
  observacao?:     string | null
}

/** Registro do aceite eletrônico, impresso no fim do Anexo I. */
export interface AnexoAceite {
  evento:     AceiteEvento
  /** Data/hora já formatada no fuso de São Paulo. */
  dataHora:   string
  /** Conta autenticada que praticou o aceite. */
  email?:     string | null
  ip?:        string | null
  userAgent?: string | null
  versao?:    string
}

export interface AnexoI {
  agencia: AnexoAgencia
  plano:   AnexoPlano
  aceite:  AnexoAceite
}

/** Formata CPF/CNPJ para o anexo; devolve como veio se não tiver 11/14 dígitos. */
function formatDoc(value?: string | null): string {
  const d = (value ?? '').replace(/\D/g, '')
  if (d === '00000000000000' || !d) return LACUNA
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  return value ?? LACUNA
}

/** Telefone com DDI para exibição: +55 (51) 99999-9999. */
function formatTel(value?: string | null): string {
  const d = (value ?? '').replace(/\D/g, '')
  if (d.length < 12) return value || LACUNA
  return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`
}

/** Monta o Anexo I em markdown. */
export function montarAnexoI(anexo: AnexoI): string {
  const { agencia, plano, aceite } = anexo
  const linhas: string[] = [
    '## ANEXO I — IDENTIFICAÇÃO DA CONTRATANTE E DO PLANO',
    '',
    'Anexo integrante do contrato acima, firmado por aceite eletrônico na plataforma TurisGuard.',
    '',
    '### Identificação da CONTRATANTE',
    '',
    `- **Agência (razão social / nome):** ${agencia.nome || LACUNA}`,
    `- **CPF / CNPJ:** ${formatDoc(agencia.documento)}`,
    `- **Endereço:** ${agencia.endereco || LACUNA}`,
    `- **E-mail:** ${agencia.email || LACUNA}`,
    `- **WhatsApp:** ${formatTel(agencia.telefone)}`,
    `- **Titular da conta de acesso:** ${aceite.email || agencia.email || LACUNA}`,
    '',
    '### Identificação do plano',
    '',
    `- **Plano contratado:** ${plano.nome}`,
    `- **Modalidade:** ${plano.modalidade}`,
    `- **Valor:** ${plano.valor}`,
    `- **Forma de pagamento:** ${plano.formaPagamento}`,
    `- **Data de ativação:** ${plano.ativacao}`,
    `- **Direito ao escalonamento para advogado:** ${plano.escalonamentos ?? 'Conforme o plano contratado'}`,
  ]

  if (plano.observacao) linhas.push(`- **Observações:** ${plano.observacao}`)

  linhas.push(
    '',
    '### Registro do aceite eletrônico',
    '',
    `- **Momento do aceite:** ${ACEITE_EVENTO_LABEL[aceite.evento]}`,
    `- **Data e hora:** ${aceite.dataHora}`,
    `- **Conta:** ${aceite.email || LACUNA}`,
    `- **Versão do contrato aceita:** ${aceite.versao ?? CONTRATO_VERSAO}`,
    `- **Endereço IP:** ${aceite.ip || LACUNA}`,
    `- **Navegador (user-agent):** ${aceite.userAgent || LACUNA}`,
  )

  return linhas.join('\n')
}

/**
 * Texto completo do contrato individualizado: corpo genérico + Anexo I.
 * É isto que fica congelado no aceite e vira o PDF.
 */
export function montarContrato(anexo: AnexoI): string {
  return `${CONTRATO_CORPO}\n\n---\n\n${montarAnexoI(anexo)}`
}
