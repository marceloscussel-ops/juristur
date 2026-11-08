/**
 * contrato-pdf.ts — PDF do contrato aceito (corpo genérico + Anexo I).
 *
 * A fonte é sempre o markdown congelado no aceite
 * (`contract_acceptances.contract_text`), nunca o texto atual do código: o PDF
 * de um aceite antigo tem de continuar mostrando o que a agência aceitou.
 *
 * Layout sóbrio como o dos documentos gerados (Times, sem faixa de marca): é um
 * instrumento contratual, não uma peça da plataforma. O rodapé carrega a prova
 * do aceite — data, hora e versão — em todas as páginas.
 */

import { PDFDocument, StandardFonts } from 'pdf-lib'
import { Doc, writeMarkdown, sanitize, INK, type Fonts } from '@/lib/pdf/doc-builder'
import { formatDateTime } from '@/lib/datetime'
import { ACEITE_EVENTO_LABEL, type AceiteEvento } from '@/lib/contrato/termos'

export interface ContratoPdfInput {
  /** Markdown completo do contrato aceito. */
  content:    string
  version:    string
  event:      AceiteEvento
  acceptedAt: string
  agencyName?: string | null
}

export async function buildContratoPdf(input: ContratoPdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.TimesRoman),
    bold:    await pdf.embedFont(StandardFonts.TimesRomanBold),
  }

  pdf.setTitle(`Contrato TurisGuard - ${input.agencyName ?? 'agência'}`)
  pdf.setAuthor('FIDEMARC TECNOLOGIA LTDA')
  pdf.setCreator('TurisGuard')

  const doc = new Doc(pdf, fonts)

  // O `# ...` de abertura é o cabeçalho do instrumento, não uma seção: sem isto
  // o título sairia do mesmo tamanho dos títulos de cláusula.
  const body = input.content.replace(/\r\n/g, '\n')
  const head = body.match(/^\s*#\s+(.+?)\s*$/m)
  const rest = head ? body.replace(head[0], '').trimStart() : body

  if (head) {
    doc.text([{ text: sanitize(head[1]), bold: true }], {
      size: 13, lineHeight: 18, color: INK, after: 2,
    })
    doc.rule()
  }

  writeMarkdown(doc, rest)

  doc.stampFooters(
    sanitize(
      [
        input.agencyName,
        `${ACEITE_EVENTO_LABEL[input.event]} - aceito em ${formatDateTime(input.acceptedAt)}`,
        `versao ${input.version}`,
      ].filter(Boolean).join(' - '),
    ),
  )

  return pdf.save()
}

/** Nome do arquivo: contrato-turisguard-2026-11-08.pdf */
export function contratoFilename(acceptedAt: string): string {
  return `contrato-turisguard-${new Date(acceptedAt).toISOString().slice(0, 10)}.pdf`
}
