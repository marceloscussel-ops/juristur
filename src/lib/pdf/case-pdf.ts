// Geração do PDF da orientação, no servidor.
//
// Antes o "Exportar PDF" chamava window.print() — dependia da impressora PDF do
// sistema (e o CSS de impressão estava quebrado, saía em branco). Aqui montamos
// o arquivo de verdade com pdf-lib: um clique, um .pdf baixado.
//
// O maquinário (quebra de linha, paginação, markdown) mora em doc-builder.ts,
// compartilhado com o PDF dos documentos gerados.

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { formatDateTimeLong } from '@/lib/datetime'
import {
  Doc, writeMarkdown, sanitize,
  INK, INDIGO, MUTED,
  type Fonts,
} from '@/lib/pdf/doc-builder'

export interface CasePdfInput {
  title: string
  category: string
  createdAt: string
  description: string
  complement?: string | null
  complementedAt?: string | null
  analysis: string
  severityLabel?: string | null
  approvedAt?: string | null
  agencyName?: string | null
}

export async function buildCasePdf(input: CasePdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold:    await pdf.embedFont(StandardFonts.HelveticaBold),
  }

  pdf.setTitle(`Orientação jurídica — ${input.title}`)
  pdf.setAuthor('TurisGuard')
  pdf.setSubject(input.category)
  pdf.setCreator('TurisGuard')

  const doc = new Doc(pdf, fonts)
  doc.brandHeader('Orientação jurídica · gerada por IA, revisada por advogado')

  doc.text([{ text: sanitize(input.category).toUpperCase(), bold: true }], { size: 8.5, color: INDIGO, lineHeight: 13 })
  doc.text([{ text: sanitize(input.title), bold: true }], { size: 18, color: INK, lineHeight: 23, after: 4 })

  const meta = [
    `Aberto em ${formatDateTimeLong(input.createdAt)}`,
    input.severityLabel ? `Severidade: ${input.severityLabel}` : null,
    input.agencyName ? `Agência: ${input.agencyName}` : null,
  ].filter(Boolean).join('  ·  ')
  doc.text([{ text: sanitize(meta), bold: false }], { size: 9, color: MUTED, after: 4 })
  doc.rule()

  doc.heading(input.complement ? 'Relato original' : 'Descrição do caso', { size: 11.5 })
  doc.box(input.description)

  if (input.complement) {
    const when = input.complementedAt ? ` (adicionado em ${formatDateTimeLong(input.complementedAt)})` : ''
    doc.heading(`Complemento${when}`, { size: 11.5 })
    doc.box(input.complement, rgb(0.953, 0.957, 1))
  }

  doc.rule()
  doc.heading('Orientação', { size: 14 })
  writeMarkdown(doc, input.analysis)

  doc.space(10)
  doc.notice(
    'Aviso · Provimento OAB',
    'Orientação informativa gerada por IA com base na legislação vigente. Não constitui parecer jurídico nem ' +
    'substitui a avaliação de advogado(a) inscrito(a) na OAB. Para decisões com risco contratual ou financeiro ' +
    'relevante, escale para atendimento humano.',
  )

  doc.stampFooters(
    input.approvedAt
      ? `TurisGuard · Análise aprovada em ${formatDateTimeLong(input.approvedAt)}`
      : 'TurisGuard',
  )

  return pdf.save()
}

/** Nome amigável: caso-extravio-de-bagagem-2026-09-12.pdf */
export function casePdfFilename(title: string, createdAt: string): string {
  const slug = (title || 'caso')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'caso'
  const date = new Date(createdAt).toISOString().slice(0, 10)
  return `caso-${slug}-${date}.pdf`
}
