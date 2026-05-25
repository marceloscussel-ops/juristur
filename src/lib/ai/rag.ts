/**
 * RAG — Retrieval-Augmented Generation
 *
 * Fluxo:
 * 1. Gera embedding da descrição do caso via OpenAI text-embedding-3-small
 * 2. Busca os N casos mais similares em rag_cases usando pgvector
 * 3. Retorna o contexto formatado para incluir no prompt do Claude
 */

import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

// ─── Clientes (lazy) ────────────────────────────────────────────────────────

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada.')
  return new OpenAI({ apiKey })
}

function getServiceClient() {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) throw new Error('Credenciais Supabase não configuradas.')
  return createClient(url, service)
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface SimilarCase {
  category:               string
  problem_description:    string
  applicable_laws:        string[] | null
  analysis:               string
  recommended_resolution: string
  similarity:             number
}

// ─── Funções públicas ────────────────────────────────────────────────────────

/**
 * Gera o vetor de embedding para um texto usando OpenAI.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAIClient()
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000), // limite seguro de tokens
  })
  return response.data[0].embedding
}

/**
 * Busca os casos mais similares na base RAG usando pgvector.
 * Retorna array vazio se não houver casos ou se a busca falhar.
 */
export async function findSimilarCases(
  description: string,
  matchCount   = 3,
  threshold    = 0.5
): Promise<SimilarCase[]> {
  try {
    const embedding = await generateEmbedding(description)
    const supabase  = getServiceClient()

    const { data, error } = await supabase.rpc('match_rag_cases', {
      query_embedding: embedding,
      match_count:     matchCount,
      match_threshold: threshold,
    })

    if (error) {
      console.error('[RAG] match_rag_cases error:', error)
      return []
    }

    return (data ?? []) as SimilarCase[]
  } catch (err) {
    console.error('[RAG] findSimilarCases error:', err)
    return [] // nunca bloquear a análise por falha no RAG
  }
}

/**
 * Formata os casos similares como texto para incluir no prompt do Claude.
 */
export function formatSimilarCases(cases: SimilarCase[]): string {
  if (cases.length === 0) return ''

  return cases
    .map((c, i) => {
      const laws = c.applicable_laws?.join(', ') ?? 'Não especificado'
      return `[CASO ${i + 1}] (similaridade: ${(c.similarity * 100).toFixed(0)}%)
Categoria: ${c.category}
Problema: ${c.problem_description}
Leis aplicadas: ${laws}
Análise: ${c.analysis}
Resolução recomendada: ${c.recommended_resolution}`
    })
    .join('\n\n')
}

/**
 * Insere um caso na base de conhecimento RAG.
 * Usado pelo endpoint /api/rag/seed.
 */
export async function seedRagCase(data: {
  category:               string
  problem_description:    string
  applicable_laws?:       string[]
  analysis:               string
  recommended_resolution: string
  actual_outcome?:        string
}): Promise<void> {
  const embedding = await generateEmbedding(
    `${data.category}: ${data.problem_description}`
  )

  const supabase = getServiceClient()
  const { error } = await supabase.from('rag_cases').insert({
    ...data,
    embedding,
  })

  if (error) throw new Error(`Erro ao salvar caso RAG: ${error.message}`)
}
