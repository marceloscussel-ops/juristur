/**
 * POST /api/rag/seed
 *
 * Adiciona um caso à base de conhecimento RAG.
 * Protegido por SEED_SECRET para não ser acessado por qualquer um.
 *
 * Body (JSON):
 * {
 *   secret:               string   ← deve bater com SEED_SECRET no env
 *   category:             string
 *   problem_description:  string
 *   applicable_laws?:     string[]
 *   analysis:             string
 *   recommended_resolution: string
 *   actual_outcome?:      string
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { seedRagCase } from '@/lib/ai/rag'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Verificação simples de secret para proteger o endpoint
    const secret = process.env.SEED_SECRET
    if (secret && body.secret !== secret) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const { category, problem_description, applicable_laws, analysis, recommended_resolution, actual_outcome } = body

    if (!category || !problem_description || !analysis || !recommended_resolution) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: category, problem_description, analysis, recommended_resolution.' },
        { status: 400 }
      )
    }

    await seedRagCase({
      category,
      problem_description,
      applicable_laws,
      analysis,
      recommended_resolution,
      actual_outcome,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[rag/seed] error:', err)
    return NextResponse.json({ error: 'Erro ao salvar caso na base RAG.' }, { status: 500 })
  }
}
