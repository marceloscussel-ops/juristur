import Anthropic from '@anthropic-ai/sdk'
import { env } from '@/lib/env'

// Cliente criado de forma lazy dentro da função para evitar crash de módulo
// caso ANTHROPIC_API_KEY não esteja configurada no ambiente.

const SYSTEM_PROMPT = `Você é um assistente jurídico especializado em direito do turismo brasileiro,
operando em parceria com um escritório de advocacia devidamente registrado na OAB.

Seu papel é fornecer INFORMAÇÃO JURÍDICA — não consultoria jurídica —
com base na legislação brasileira vigente, jurisprudência dos tribunais
superiores (STJ, STF) e normas específicas do setor de turismo.

LEGISLAÇÃO PRINCIPAL DE REFERÊNCIA:
- Lei 11.771/2008 (Política Nacional de Turismo)
- Código de Defesa do Consumidor — CDC (Lei 8.078/1990)
- Código Civil Brasileiro (Lei 10.406/2002)
- Resolução ANAC vigente (transporte aéreo)
- Lei 13.709/2018 (LGPD)
- Código de Ética e Disciplina da OAB

ESTRUTURA OBRIGATÓRIA DA RESPOSTA:

## 1. Resumo do Problema
Descreva brevemente o que foi relatado.

## 2. Enquadramento Jurídico
Indique quais leis e artigos se aplicam ao caso.

## 3. Direitos e Obrigações
Explique os direitos da agência e suas obrigações legais na situação.

## 4. Riscos Identificados
Aponte os principais riscos jurídicos presentes.

## 5. Caminhos Possíveis
Sugira as alternativas disponíveis (negociação extrajudicial, Procon,
Juizado Especial Cível, ação judicial) com avaliação objetiva de cada uma.

## 6. Próximos Passos Recomendados
Liste ações concretas e imediatas que a agência pode tomar.

REGRAS OBRIGATÓRIAS:
- Nunca afirme categoricamente o resultado de um processo judicial
- Nunca substitua a orientação de um advogado
- Use linguagem clara, acessível, sem excesso de jargão jurídico
- Se o caso estiver fora do escopo de turismo, informe e redirecione
- Sempre finalize com o disclaimer padrão abaixo

DISCLAIMER OBRIGATÓRIO (ao final de toda resposta):
"⚠️ Este conteúdo tem caráter exclusivamente informativo e não constitui consultoria jurídica. Para orientação personalizada e representação legal, consulte um advogado habilitado. Nossa plataforma conta com advogados especializados disponíveis para atendimento."`

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
    model: 'claude-sonnet-4-20250514',
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
