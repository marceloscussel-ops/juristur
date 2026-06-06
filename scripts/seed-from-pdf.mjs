/**
 * seed-from-pdf.mjs
 *
 * Importa um ou mais processos judiciais em PDF para o banco RAG.
 * Usa Claude para extrair as informações estruturadas do processo.
 *
 * Uso:
 *   node scripts/seed-from-pdf.mjs "C:\caminho\para\processo.pdf"
 *   node scripts/seed-from-pdf.mjs "C:\pasta\com\pdfs\"   ← importa todos os PDFs da pasta
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { resolve, extname, basename, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

const require = createRequire(import.meta.url)

// ─── Carrega .env.local (mesmo padrão do seed-rag.mjs) ───────────────────────
const __dir = dirname(fileURLToPath(import.meta.url))
const envLines = readFileSync(resolve(__dir, '..', '.env.local'), 'utf-8').split('\n')
for (const line of envLines) {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
}

const getEnv = (key) => (process.env[key] ?? '').replace(/[^\x20-\x7E]/g, '').trim()

// ─── Clientes ─────────────────────────────────────────────────────────────────

const supabase = createClient(
  getEnv('NEXT_PUBLIC_SUPABASE_URL'),
  getEnv('SUPABASE_SERVICE_ROLE_KEY')
)

const openai = new OpenAI({ apiKey: getEnv('OPENAI_API_KEY') })
const anthropic = new Anthropic({ apiKey: getEnv('ANTHROPIC_API_KEY') })

// ─── Categorias disponíveis ───────────────────────────────────────────────────

const CATEGORIES = [
  'Cancelamento de pacote pelo cliente',
  'Cancelamento de pacote pelo fornecedor',
  'Overbooking (hotel ou aéreo)',
  'Acidente ou incidente durante o serviço',
  'Disputa com operadora',
  'Reclamação de cliente (Procon / Reclame Aqui)',
  'Questão trabalhista',
  'Contrato com fornecedor',
  'Outro',
]

// ─── Extrai texto do PDF localmente ──────────────────────────────────────────

async function extractPdfText(pdfPath) {
  const { PDFParse } = require('pdf-parse')
  const buf = readFileSync(pdfPath)
  const parser = new PDFParse({ verbosity: 0, data: new Uint8Array(buf) })
  await parser.load()
  const result = await parser.getText()
  // result.text é a string completa; result.pages é array de {text, num}
  const fullText = result.text ?? result.pages?.map(p => p.text).join('\n\n') ?? ''
  // Limita a ~150 000 chars (≈ 37k tokens) — bem dentro do contexto do Claude Sonnet
  return fullText.length > 150000 ? fullText.slice(0, 150000) + '\n[... texto truncado ...]' : fullText
}

// ─── Extrai informações do processo via Claude ────────────────────────────────

async function extractFromPdf(pdfPath) {
  console.log(`\n  Lendo PDF: ${basename(pdfPath)}`)
  const pdfText = await extractPdfText(pdfPath)
  console.log(`  Texto extraído: ${pdfText.length} chars`)
  console.log(`  Enviando para Claude analisar...`)

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `Você é um especialista em direito do turismo. Analise o texto deste processo judicial e extraia as informações no formato JSON abaixo.

Este processo envolve uma agência de viagem ou empresa do setor de turismo.

Responda APENAS com o JSON válido, sem texto adicional:

{
  "category": "<uma das categorias: ${CATEGORIES.join(' | ')}>",
  "problem_description": "<descrição clara do problema/conflito em 2-4 parágrafos, focando nos fatos relevantes para agências de turismo>",
  "applicable_laws": ["<lei 1>", "<lei 2>"],
  "analysis": "<análise jurídica do caso em 3-5 parágrafos: argumentos das partes, fundamentos aplicados pelo juiz, pontos mais relevantes para casos similares>",
  "recommended_resolution": "<o que o processo indica como melhor caminho de resolução, baseado na decisão ou argumentação>",
  "actual_outcome": "<desfecho real do processo: procedente/improcedente, valor de condenação se houver, acordos, etc. Se não houver decisão final, coloque null>"
}

TEXTO DO PROCESSO:
${pdfText}`,
      },
    ],
  })

  const text = response.content.find(b => b.type === 'text')?.text ?? ''

  // Extrai o JSON da resposta
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Claude não retornou JSON válido')

  return JSON.parse(jsonMatch[0])
}

// ─── Gera embedding e salva no RAG ────────────────────────────────────────────

async function seedToRag(data, sourceFile) {
  // Gera embedding do texto completo do caso
  const textForEmbedding = `${data.category}\n${data.problem_description}\n${data.analysis}`

  const embeddingRes = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: textForEmbedding,
  })

  const embedding = embeddingRes.data[0].embedding

  const { error } = await supabase.from('rag_cases').insert({
    category:               data.category,
    problem_description:    data.problem_description,
    applicable_laws:        data.applicable_laws,
    analysis:               data.analysis,
    recommended_resolution: data.recommended_resolution,
    actual_outcome:         data.actual_outcome ?? null,
    embedding,
  })

  if (error) throw new Error(`Erro ao salvar no banco: ${error.message}`)
  return true
}

// ─── Lista PDFs a processar ───────────────────────────────────────────────────

function getPdfs(input) {
  const resolved = resolve(input)
  const stat = statSync(resolved)
  if (stat.isDirectory()) {
    return readdirSync(resolved)
      .filter(f => extname(f).toLowerCase() === '.pdf')
      .map(f => resolve(resolved, f))
  }
  return [resolved]
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const input = process.argv[2]
if (!input) {
  console.error('Uso: node scripts/seed-from-pdf.mjs "caminho/para/arquivo.pdf"')
  process.exit(1)
}

const pdfs = getPdfs(input)
console.log(`\nProcessando ${pdfs.length} PDF(s)...\n`)

let success = 0
let failed = 0

for (const pdf of pdfs) {
  try {
    const data = await extractFromPdf(pdf)

    console.log(`  Categoria detectada: ${data.category}`)
    console.log(`  Leis aplicadas: ${(data.applicable_laws ?? []).join(', ')}`)
    console.log(`  Desfecho: ${data.actual_outcome ?? '(sem decisão final)'}`)

    await seedToRag(data, pdf)
    console.log(`  ✅ Salvo no RAG!\n`)
    success++
  } catch (err) {
    console.error(`  ❌ Erro em ${basename(pdf)}: ${err.message}\n`)
    failed++
  }
}

console.log(`\nConcluído: ${success} importados, ${failed} com erro.`)
