import Anthropic from '@anthropic-ai/sdk'
import { env } from '@/lib/env'
import type { Severity } from '@/types'

/**
 * Extrai o marcador "SEVERIDADE: <nível>" da primeira linha da resposta e o
 * remove do texto exibido. Robusto a acentos e a frases como "Risco Médio".
 */
function parseSeverity(text: string): { severity: Severity | null; text: string } {
  const lines = text.split('\n')
  const first = (lines[0] ?? '').trim()
  const m = first.match(/severidade\s*[:\-–]\s*(.+)/i)
  if (m) {
    const raw = m[1].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    let severity: Severity | null = null
    if (raw.includes('elevadissimo')) severity = 'elevadissimo'
    else if (raw.includes('elevado')) severity = 'elevado'
    else if (raw.includes('medio'))   severity = 'medio'
    else if (raw.includes('leve'))    severity = 'leve'
    if (severity) return { severity, text: lines.slice(1).join('\n').trim() }
  }
  return { severity: null, text }
}

// Cliente criado de forma lazy dentro da função para evitar crash de módulo
// caso ANTHROPIC_API_KEY não esteja configurada no ambiente.

const SYSTEM_PROMPT = `Você é um advogado especializado em direito do turismo brasileiro. Quando uma agência apresenta um caso, você responde de forma direta e objetiva — como num bate-papo com um especialista, sem enrolação.

Sua base legal de referência:
- Lei 11.771/2008 (Política Nacional de Turismo)
- Código de Defesa do Consumidor — CDC (Lei 8.078/1990)
- Código Civil Brasileiro (Lei 10.406/2002)
- Resolução ANAC vigente (transporte aéreo)
- Lei 13.709/2018 (LGPD)

CLASSIFICAÇÃO DE SEVERIDADE (obrigatório):
Na PRIMEIRA linha da resposta, escreva SOMENTE o marcador abaixo (sem título, sem markdown, sem explicação):
SEVERIDADE: leve
(troque "leve" por um destes: leve, medio, elevado ou elevadissimo)

Classifique pelo risco jurídico/financeiro para a agência. Quando o caso se enquadrar num dos cenários abaixo, aplique estes critérios:
- Extravio de bagagem (tempo sem a bagagem): leve = até 24h; medio = 24h a 72h; elevado = acima de 72h; elevadissimo = acima de 21 dias (extravio definitivo).
- Cancelamento da viagem pelo cliente (antecedência em relação à data da viagem): leve = menos de 72h antes da viagem; medio = entre 72h e 7 dias antes; elevado = mais de 7 dias antes.
- Atraso ou cancelamento de voo (tempo de atraso): leve = até 4h; medio = 4h a 8h; elevado = acima de 8h.
Fora desses cenários, classifique pelo seu julgamento (leve = baixo risco, medio = intermediário, elevado = alto).

COMO RESPONDER:

Após o marcador de severidade, use os quatro títulos abaixo. Cada seção deve ter no máximo 3-4 frases curtas. Seja direto ao ponto.

O que está acontecendo
Resuma o problema em 2-3 frases. Sem repetir o que a agência já sabe.

O que a lei diz
Cite apenas as leis e artigos que realmente importam para este caso. 1-2 referências legais, integradas ao texto.

O que fazer
Liste as ações práticas em ordem de prioridade. Máximo 4 itens curtos.

Os caminhos possíveis
Apresente cada opção como um item de lista separado (bullet iniciado por "- "), um por linha, com uma linha de avaliação para cada. Use exatamente este formato:
- Negociação: sua avaliação em uma linha
- Processo judicial: sua avaliação em uma linha

Depois das quatro seções acima, encerre com uma frase curta e cordial (sem título): ofereça montar um modelo de contato para negociação com a outra parte e pergunte se a agência ficou com alguma dúvida.

REGRAS:
- Respostas curtas e objetivas — evite parágrafos longos
- Português direto, sem jargão desnecessário
- Sem emojis nem formatação excessiva
- Não afirme resultados garantidos de processos judiciais
- NUNCA sugira Procon, Juizado Especial, reclamação via ANAC nem consumidor.gov.br. Os únicos caminhos a mencionar são negociação e processo judicial
- Se o caso estiver fora do escopo de turismo, diga claramente`

export interface AnalysisResult {
  text: string
  tokensUsed: number
  severity?: Severity | null
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

const FOLLOWUP_SYSTEM = `${SYSTEM_PROMPT}

MODO DE ACOMPANHAMENTO: Você está esclarecendo dúvidas sobre O CASO JÁ ANALISADO acima. Suas respostas devem se ater EXCLUSIVAMENTE a este caso e à análise já fornecida.

- NÃO use os quatro títulos da análise inicial — responda de forma direta e conversacional, como um especialista esclarecendo uma dúvida pontual.
- NÃO inclua o marcador SEVERIDADE nas respostas de acompanhamento.
- Seja conciso: no máximo 3-4 parágrafos curtos. Cite a base legal quando relevante.
- IMPORTANTE: se a pergunta for sobre um caso diferente, uma nova situação ou um assunto não relacionado ao caso em análise, NÃO analise esse novo assunto. Explique em uma frase que este acompanhamento trata apenas do caso atual e oriente o usuário a abrir um novo caso para uma nova análise.`

export async function followUpCase(
  description: string,
  category: string,
  initialAnalysis: string,
  history: ConversationMessage[],
  question: string,
): Promise<AnalysisResult> {
  const apiKey = env('ANTHROPIC_API_KEY')
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada.')

  const client = new Anthropic({ apiKey })

  const contextMessage = `CASO EM ANÁLISE:\nCategoria: ${category}\nDescrição: ${description}\n\nANÁLISE ANTERIOR FORNECIDA:\n${initialAnalysis}`

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: contextMessage },
    { role: 'assistant', content: 'Entendido. Analisei o caso e forneci a orientação acima. Pode me fazer perguntas de acompanhamento.' },
    ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    { role: 'user', content: question },
  ]

  const message = await client.messages.create({
    model:      'claude-sonnet-5',
    max_tokens: 2048,
    thinking:   { type: 'disabled' },
    system:     FOLLOWUP_SYSTEM,
    messages,
  })

  const textContent = message.content.find(block => block.type === 'text')
  if (!textContent || textContent.type !== 'text') throw new Error('Resposta inválida da IA')

  return {
    text:       textContent.text,
    tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
  }
}

export async function analyzeCaseRevision(
  description: string,
  category: string,
  originalAnalysis: string,
  lawyerNotes: string,
): Promise<AnalysisResult> {
  const apiKey = env('ANTHROPIC_API_KEY')
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada.')

  const client = new Anthropic({ apiKey })

  const userMessage = `Você gerou a análise abaixo para um caso jurídico. O advogado revisor solicitou ajustes.

CASO ORIGINAL:
Categoria: ${category}
Descrição: ${description}

SUA ANÁLISE ANTERIOR:
${originalAnalysis}

COMENTÁRIOS DO ADVOGADO REVISOR:
${lawyerNotes}

Gere uma nova análise incorporando os comentários acima. Mantenha a mesma estrutura de quatro seções.`

  const message = await client.messages.create({
    model:      'claude-sonnet-5',
    max_tokens: 8096,
    thinking:   { type: 'disabled' },
    system:     SYSTEM_PROMPT,
    messages:   [{ role: 'user', content: userMessage }],
  })

  const textContent = message.content.find(block => block.type === 'text')
  if (!textContent || textContent.type !== 'text') throw new Error('Resposta inválida da IA')

  const parsed = parseSeverity(textContent.text)
  return {
    text:       parsed.text,
    severity:   parsed.severity,
    tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
  }
}

/**
 * Reanálise disparada por um COMPLEMENTO da agência a um caso já aprovado.
 * O relato original é preservado; o complemento acrescenta fatos. Gera uma
 * análise completa (com as quatro seções e o marcador de severidade),
 * considerando o relato original somado ao complemento.
 */
export async function analyzeCaseComplement(
  description: string,
  category: string,
  originalAnalysis: string,
  complement: string,
): Promise<AnalysisResult> {
  const apiKey = env('ANTHROPIC_API_KEY')
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada.')

  const client = new Anthropic({ apiKey })

  const userMessage = `Você já analisou o caso abaixo. A agência ACRESCENTOU um complemento ao relato original (uma ressalva ou informação esquecida). O relato original NÃO muda — o complemento apenas acrescenta fatos.

CASO ORIGINAL:
Categoria: ${category}
Descrição original: ${description}

COMPLEMENTO ADICIONADO PELA AGÊNCIA:
${complement}

SUA ANÁLISE ANTERIOR (do relato original):
${originalAnalysis}

Gere uma NOVA análise completa considerando o relato original somado ao complemento. Siga exatamente a estrutura de quatro seções e inclua o marcador SEVERIDADE na primeira linha. Se o complemento mudar a severidade ou as recomendações, reflita isso na nova análise.`

  const message = await client.messages.create({
    model:      'claude-sonnet-5',
    max_tokens: 8096,
    thinking:   { type: 'disabled' },
    system:     SYSTEM_PROMPT,
    messages:   [{ role: 'user', content: userMessage }],
  })

  const textContent = message.content.find(block => block.type === 'text')
  if (!textContent || textContent.type !== 'text') throw new Error('Resposta inválida da IA')

  const parsed = parseSeverity(textContent.text)
  return {
    text:       parsed.text,
    severity:   parsed.severity,
    tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
  }
}

export async function analyzeCase(
  description: string,
  category: string,
  filesContent: string,
  similarCases: string = ''
): Promise<AnalysisResult> {
  const apiKey = env('ANTHROPIC_API_KEY')
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY não configurada.')
  }

  const client = new Anthropic({ apiKey })

  const userMessage = `${similarCases ? `CASOS SIMILARES JÁ ANALISADOS (use como referência):\n\n${similarCases}\n\n---\n\n` : ''}NOVO CASO A ANALISAR:

Categoria: ${category}
Descrição do problema: ${description}
${filesContent ? `\nDocumentos anexados:\n${filesContent}` : ''}

Por favor, analise este caso seguindo a estrutura definida.`

  const message = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 8096,
    thinking: { type: 'disabled' },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const textContent = message.content.find(block => block.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('Resposta inválida da IA')
  }

  const parsed = parseSeverity(textContent.text)
  return {
    text: parsed.text,
    severity: parsed.severity,
    tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
  }
}
