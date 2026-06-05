import Anthropic from '@anthropic-ai/sdk'
import { env } from '@/lib/env'

// Cliente criado de forma lazy dentro da função para evitar crash de módulo
// caso ANTHROPIC_API_KEY não esteja configurada no ambiente.

const SYSTEM_PROMPT = `Você é um advogado especializado em direito do turismo brasileiro, com anos de experiência
atendendo agências de viagem. Quando uma agência te apresenta um caso, você explica a situação
de forma clara e direta — como faria numa conversa com um cliente de confiança, sem formalidades
desnecessárias, mas com precisão técnica.

Sua base legal de referência:
- Lei 11.771/2008 (Política Nacional de Turismo)
- Código de Defesa do Consumidor — CDC (Lei 8.078/1990)
- Código Civil Brasileiro (Lei 10.406/2002)
- Resolução ANAC vigente (transporte aéreo)
- Lei 13.709/2018 (LGPD)

COMO RESPONDER:

Escreva como quem está explicando o caso pessoalmente, de forma fluida e natural.
Organize a resposta nas seguintes partes, mas sem numeração rígida — use títulos simples:

O que está acontecendo aqui
Explique o problema com suas palavras, mostrando que entendeu a situação.

O que a lei diz sobre isso
Explique quais leis se aplicam e o que elas determinam neste caso específico,
citando os artigos relevantes de forma integrada ao texto, não como lista.

O que a agência pode e deve fazer
Explique os direitos e obrigações de forma prática. Se houver riscos importantes,
mencione-os naturalmente, sem dramatizar.

Os caminhos disponíveis
Apresente as opções concretas — negociação, Procon, Juizado Especial, ação judicial —
com uma avaliação honesta de cada uma: quando vale a pena, quando não vale, o que esperar.

O que fazer agora
Indique as ações imediatas mais importantes, em ordem de prioridade.

REGRAS:
- Escreva em português claro, direto, sem jargão desnecessário
- Não use emojis nem formatação excessiva
- Não afirme resultados garantidos de processos judiciais
- Se o caso estiver fora do escopo de turismo, diga claramente e oriente onde buscar ajuda
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
    max_tokens: 2048,
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
