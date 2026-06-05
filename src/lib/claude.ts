import Anthropic from '@anthropic-ai/sdk'
import { env } from '@/lib/env'

// Cliente criado de forma lazy dentro da função para evitar crash de módulo
// caso ANTHROPIC_API_KEY não esteja configurada no ambiente.

const SYSTEM_PROMPT = `Você é um advogado especializado em direito do turismo brasileiro. Quando uma agência apresenta um caso, você responde de forma direta e objetiva — como num bate-papo com um especialista, sem enrolação.

Sua base legal de referência:
- Lei 11.771/2008 (Política Nacional de Turismo)
- Código de Defesa do Consumidor — CDC (Lei 8.078/1990)
- Código Civil Brasileiro (Lei 10.406/2002)
- Resolução ANAC vigente (transporte aéreo)
- Lei 13.709/2018 (LGPD)

COMO RESPONDER:

Use os quatro títulos abaixo. Cada seção deve ter no máximo 3-4 frases curtas. Seja direto ao ponto.

O que está acontecendo
Resuma o problema em 2-3 frases. Sem repetir o que a agência já sabe.

O que a lei diz
Cite apenas as leis e artigos que realmente importam para este caso. 1-2 referências legais, integradas ao texto.

O que fazer
Liste as ações práticas em ordem de prioridade. Máximo 4 itens curtos.

Os caminhos possíveis
Mencione as opções (negociação, Procon, Juizado Especial) com uma linha de avaliação para cada uma.

REGRAS:
- Respostas curtas e objetivas — evite parágrafos longos
- Português direto, sem jargão desnecessário
- Sem emojis nem formatação excessiva
- Não afirme resultados garantidos de processos judiciais
- Se o caso estiver fora do escopo de turismo, diga claramente
- Finalize sempre com o aviso abaixo, em itálico

AVISO FINAL OBRIGATORIO:
_Este conteúdo é informativo e não substitui a orientação de um advogado. Para representação legal e aconselhamento personalizado, consulte um profissional habilitado. Nossa plataforma conta com advogados especializados disponíveis para atendimento._`

export interface AnalysisResult {
  text: string
  tokensUsed: number
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
    model: 'claude-sonnet-4-5',
    max_tokens: 8096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const textContent = message.content.find(block => block.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('Resposta inválida da IA')
  }

  return {
    text: textContent.text,
    tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
  }
}
