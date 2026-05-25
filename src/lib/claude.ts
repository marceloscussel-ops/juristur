import Anthropic from '@anthropic-ai/sdk'

// Não inicializar o cliente no nível do módulo — se ANTHROPIC_API_KEY não estiver
// configurada no ambiente (ex: Vercel), o SDK jogaria uma exceção aqui e derrubaria
// toda a rota de API. O cliente é criado de forma lazy dentro da função.

const SYSTEM_PROMPT = `Você é um assistente jurídico especializado em direito do turismo brasileiro, com profundo conhecimento em:

- Código de Defesa do Consumidor (Lei nº 8.078/1990)
- Lei Geral do Turismo (Lei nº 11.771/2008)
- Resolução ANAC sobre transporte aéreo
- Código Civil Brasileiro
- Legislação trabalhista (CLT)
- Jurisprudência dos Tribunais de Justiça brasileiros em casos de turismo

Sua função é analisar casos jurídicos apresentados por agências de turismo brasileiras e fornecer orientação jurídica preliminar.

Estruture sua resposta SEMPRE no seguinte formato:

## Análise do Caso

[Resumo do problema identificado e enquadramento jurídico]

## Fundamento Legal

[Cite as leis, artigos e jurisprudências aplicáveis ao caso]

## Riscos e Exposição

[Avalie os riscos jurídicos para a agência: alto, médio ou baixo risco, com justificativa]

## Orientações Práticas

[Liste ações concretas que a agência pode tomar, em ordem de prioridade]

## Possíveis Desfechos

[Descreva os cenários mais prováveis e como cada um pode se resolver]

---
**AVISO IMPORTANTE:** Esta análise tem caráter meramente informativo e não substitui a consulta com um advogado habilitado. Para decisões jurídicas, procure sempre assessoria especializada.`

export async function analyzeCase(
  description: string,
  category: string,
  filesContent: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY não configurada. Configure a variável de ambiente no Vercel.')
  }

  const client = new Anthropic({ apiKey })

  const userMessage = `
**Categoria do caso:** ${category}

**Descrição do problema:**
${description}

${filesContent ? `**Conteúdo dos documentos anexados:**\n${filesContent}` : ''}
`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  })

  const textContent = message.content.find(block => block.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('Resposta inválida da IA')
  }

  return textContent.text
}
