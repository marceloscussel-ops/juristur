/**
 * documents.ts — Geração de documentos (contrato e outros) com a Claude API.
 *
 * Separado de `lib/claude.ts` de propósito: aquele arquivo é o advogado que
 * analisa casos, com um system prompt de parecer. Aqui o trabalho é redigir
 * um documento — outro papel, outras regras, outra saída.
 *
 * A saída é sempre markdown, porque é o que a tela, o DOCX e o PDF consomem.
 */

import Anthropic from '@anthropic-ai/sdk'
import { env } from '@/lib/env'
import { displayCpfCnpj } from '@/lib/document'
import { formatWhatsappNumber } from '@/lib/whatsapp/public-number'
import { LACUNA, type ContractTemplate } from '@/lib/templates/contrato-turismo'

export interface GeneratedDocument {
  /** Documento em markdown. */
  content:    string
  /** Título curto, para a lista do painel. */
  title:      string
  tokensUsed: number
}

/** Dados da agência que entram como CONTRATADA / remetente. */
export interface AgencyProfile {
  nome:      string
  /** CPF ou CNPJ já formatado para exibição. */
  documento?: string | null
  /** 'CPF' ou 'CNPJ', conforme o número cadastrado. */
  docLabel:  'CPF' | 'CNPJ'
  email?:    string | null
  telefone?: string | null
  endereco?: string | null
  cidade?:   string | null
}

/**
 * Monta o perfil a partir da linha de `agencies`.
 *
 * A formatação do documento e do telefone acontece AQUI, e não no prompt, por
 * um motivo concreto: a coluna `cnpj` guarda CPF ou CNPJ só com dígitos, e
 * pedir à IA que "formate" levou-a a enfiar um CPF de 11 dígitos na máscara de
 * CNPJ — `94769796072` virou `94.769.796/0072-00`, um número que não existe.
 * Dado de identificação não passa por IA.
 */
export function agencyProfileFromRow(row: Record<string, unknown> | null): AgencyProfile {
  const digits = String(row?.cnpj ?? '').replace(/\D/g, '')
  const street = [row?.endereco, row?.endereco_numero].filter(Boolean).join(', ')
  const full   = [street, row?.bairro, row?.cidade].filter(Boolean).join(' - ')
  const phone  = String(row?.phone ?? '')

  return {
    nome:      (row?.name as string) ?? 'Minha agência',
    documento: digits ? displayCpfCnpj(digits) : null,
    docLabel:  digits.length === 11 ? 'CPF' : 'CNPJ',
    email:     (row?.email as string) ?? null,
    telefone:  phone ? formatWhatsappNumber(phone) : null,
    endereco:  full || null,
    cidade:    (row?.cidade as string) ?? null,
  }
}

/**
 * Preenche no modelo os campos que vêm do cadastro, antes de a IA ver o texto.
 *
 * Tudo que é determinístico sai do código: a IA só decide o que depende de
 * interpretação (dados do consumidor, itens da viagem, valores, políticas de
 * cancelamento). Menos marcador na mão dela, menos chance de invenção.
 */
function fillAgencyFields(corpo: string, agency: AgencyProfile): string {
  const cidade = agency.cidade?.trim()
  return corpo
    .replace(/\{\{agencia_nome\}\}/g,      agency.nome)
    .replace(/\{\{agencia_doc_label\}\}/g, agency.docLabel)
    .replace(/\{\{agencia_cnpj\}\}/g,      agency.documento ?? LACUNA)
    .replace(/\{\{agencia_endereco\}\}/g,  agency.endereco  ?? LACUNA)
    .replace(/\{\{agencia_email\}\}/g,     agency.email     ?? LACUNA)
    .replace(/\{\{agencia_telefone\}\}/g,  agency.telefone  ?? LACUNA)
    .replace(/\{\{foro\}\}/g,              cidade           ?? LACUNA)
    .replace(/\{\{local_data\}\}/g,        `${cidade ?? LACUNA}, _____ de _______________ de _______.`)
}

const BASE_RULES = `Você redige documentos para agências de turismo brasileiras. Escreve em português do Brasil, em linguagem jurídica formal e correta, sem juridiquês desnecessário.

REGRAS ABSOLUTAS:
- NUNCA invente dados. Nome, CPF, endereço, valores, datas, destinos e condições só entram no documento se aparecerem nas informações fornecidas.
- Todo dado que faltar vira exatamente \`${LACUNA}\` no texto, para a agência preencher à mão. Nunca escreva "a definir", "[inserir nome]" ou um exemplo no lugar.
- Saída em markdown: \`#\` para o título, \`##\` para as seções, \`**negrito**\` para rótulos de cláusula e \`-\` para listas.
- Não escreva nenhum comentário, explicação ou observação sua fora do documento. A resposta é o documento e nada mais.
- Não use emojis.`

const TITLE_RULE = `Na PRIMEIRA linha da resposta, escreva somente:
TITULO: <título curto, até 60 caracteres, que identifique este documento na lista da agência>
Depois pule uma linha e comece o documento.`

/** Separa o marcador TITULO da primeira linha e devolve o resto como documento. */
function parseTitle(text: string, fallback: string): { title: string; content: string } {
  const lines = text.split('\n')
  const m = (lines[0] ?? '').trim().match(/^t[ií]tulo\s*[:\-–]\s*(.+)$/i)
  if (!m) return { title: fallback, content: text.trim() }
  return {
    title:   m[1].trim().slice(0, 150) || fallback,
    content: lines.slice(1).join('\n').trim(),
  }
}

function client() {
  const apiKey = env('ANTHROPIC_API_KEY')
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada.')
  return new Anthropic({ apiKey })
}

function agencyBlock(agency: AgencyProfile): string {
  return [
    `Razão social: ${agency.nome}`,
    agency.documento ? `${agency.docLabel}: ${agency.documento}` : null,
    agency.endereco  ? `Endereço: ${agency.endereco}`            : null,
    agency.cidade    ? `Cidade: ${agency.cidade}`                : null,
    agency.email     ? `E-mail: ${agency.email}`                 : null,
    agency.telefone  ? `Telefone: ${agency.telefone}`            : null,
  ].filter(Boolean).join('\n')
}

// ─── Contrato ─────────────────────────────────────────────────────────────────

const CONTRACT_SYSTEM = `${BASE_RULES}

Sua tarefa agora é preencher um MODELO DE CONTRATO já pronto.

COMO TRABALHAR O MODELO:
- Mantenha a estrutura, a ordem e a redação das cláusulas do modelo. Você preenche lacunas, não reescreve o contrato.
- Os dados da CONTRATADA já vêm preenchidos no modelo. NÃO os altere, não os reformate e não os complete — nem o número de documento, nem o endereço, nem o telefone.
- Substitua cada marcador \`{{campo}}\` restante pelo dado correspondente. Sem o dado, o marcador vira \`${LACUNA}\`.
- CPF, CNPJ, RG, valores e datas entram EXATAMENTE como foram informados. Nunca reformate, complete ou "corrija" um número de documento: um CPF de 11 dígitos não vira CNPJ.
- Os marcadores que pedem listas (itens inclusos, serviços reembolsáveis ou não) viram listas markdown com os serviços informados. Sem informação, deixe um único item com \`${LACUNA}\`.
- Você PODE acrescentar, alterar ou remover cláusulas quando as instruções da agência pedirem isso explicitamente. Nesse caso, renumere as cláusulas seguintes para a sequência continuar correta.
- Nunca enfraqueça uma cláusula de proteção da agência por conta própria.

${TITLE_RULE}`

export interface ContractInput {
  template:     ContractTemplate
  agency:       AgencyProfile
  /** Texto extraído dos documentos do consumidor que a agência anexou. */
  filesContent: string
  /** Dados e pedidos que a agência digitou. */
  prompt:       string
}

export async function generateContract(input: ContractInput): Promise<GeneratedDocument> {
  const corpo = fillAgencyFields(input.template.corpo, input.agency)

  const userMessage = `DADOS DA CONTRATADA (a agência) — já preenchidos no modelo abaixo, apenas para sua referência:
${agencyBlock(input.agency)}

${input.filesContent
  ? `DOCUMENTOS DO CONSUMIDOR ANEXADOS PELA AGÊNCIA (texto extraído — pode vir com ruído de OCR; use só o que estiver claro):\n${input.filesContent}\n`
  : 'A agência não anexou documentos do consumidor.\n'}
${input.prompt
  ? `INSTRUÇÕES E DADOS DIGITADOS PELA AGÊNCIA:\n${input.prompt}\n`
  : 'A agência não digitou instruções adicionais.\n'}
MODELO DE CONTRATO A PREENCHER:
---
${corpo}
---

Devolva o contrato preenchido, seguindo as regras.`

  const message = await client().messages.create({
    model:      'claude-sonnet-5',
    max_tokens: 16000,
    thinking:   { type: 'disabled' },
    system:     CONTRACT_SYSTEM,
    messages:   [{ role: 'user', content: userMessage }],
  })

  const block = message.content.find(b => b.type === 'text')
  if (!block || block.type !== 'text') throw new Error('Resposta inválida da IA')

  const { title, content } = parseTitle(block.text, input.template.nome)
  return {
    title,
    content,
    tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
  }
}

// ─── Outros documentos (etapa 3) ──────────────────────────────────────────────

const DOCUMENT_SYSTEM = `${BASE_RULES}

Sua tarefa agora é redigir um documento do zero, a partir do pedido da agência. Não existe modelo base.

COMO TRABALHAR:
- Use o formato adequado ao tipo pedido: um e-mail tem assunto, saudação, corpo e assinatura; um termo de ciência tem qualificação das partes, declaração e campo de assinatura; uma notificação tem destinatário, fundamentação, pedido e prazo.
- Seja completo mas enxuto. Nada de enrolação para alongar o texto.
- Quando o documento envolver direitos do consumidor, respeite o CDC e a Lei 11.771/2008. Não redija cláusula abusiva mesmo se pedirem — nesse caso, redija a versão válida mais próxima do que foi pedido, sem explicar a mudança fora do documento.
- Feche com campo de assinatura quando o documento for assinado (termo, declaração, notificação, procuração). E-mail e proposta comercial não levam campo de assinatura.
- Quando vier um GUIA DE REDAÇÃO abaixo, ele manda sobre estas instruções gerais: siga a estrutura, a base legal e as advertências dele.

${TITLE_RULE}`

export interface OtherDocumentInput {
  agency:       AgencyProfile
  /** Rótulo do tipo escolhido na UI (e-mail, termo de ciência...). */
  docType:      string
  /**
   * Conhecimento do catálogo para este tipo: estrutura esperada, base legal e
   * armadilha a evitar (ver `lib/templates/documentos.ts`). Vem nulo quando a
   * agência escolheu "Outro" e digitou o tipo à mão.
   */
  guia?:        string | null
  filesContent: string
  prompt:       string
}

export async function generateDocument(input: OtherDocumentInput): Promise<GeneratedDocument> {
  const userMessage = `DADOS DA AGÊNCIA (quem emite o documento):
${agencyBlock(input.agency)}

TIPO DE DOCUMENTO PEDIDO: ${input.docType}

${input.guia
  ? `GUIA DE REDAÇÃO PARA ESTE TIPO (vem do nosso jurídico — tem prioridade sobre as regras gerais):\n${input.guia}\n`
  : 'Não há guia de redação para este tipo: a agência descreveu o documento com as próprias palavras. Deduza a estrutura adequada pelo pedido.\n'}
${input.filesContent
  ? `DOCUMENTOS ANEXADOS PELA AGÊNCIA (texto extraído — pode vir com ruído de OCR; use só o que estiver claro):\n${input.filesContent}\n`
  : 'A agência não anexou documentos.\n'}
PEDIDO DA AGÊNCIA:
${input.prompt}

Redija o documento, seguindo as regras.`

  const message = await client().messages.create({
    model:      'claude-sonnet-5',
    max_tokens: 8096,
    thinking:   { type: 'disabled' },
    system:     DOCUMENT_SYSTEM,
    messages:   [{ role: 'user', content: userMessage }],
  })

  const block = message.content.find(b => b.type === 'text')
  if (!block || block.type !== 'text') throw new Error('Resposta inválida da IA')

  const { title, content } = parseTitle(block.text, input.docType)
  return {
    title,
    content,
    tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
  }
}
