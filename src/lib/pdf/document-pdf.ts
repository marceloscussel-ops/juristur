/**
 * document-pdf.ts — PDF do documento gerado (contrato e outros).
 *
 * Layout deliberadamente sóbrio, diferente do PDF da orientação jurídica: isto
 * é um documento que vai ser assinado e eventualmente juntado a um processo,
 * então nada de faixa de marca no topo nem aviso da OAB. Só o texto, com um
 * rodapé discreto dizendo quando foi gerado.
 *
 * O maquinário (quebra de linha, paginação, markdown) vem de doc-builder.ts.
 */

import { PDFDocument, StandardFonts } from 'pdf-lib'
import { Doc, writeMarkdown, sanitize, INK, type Fonts } from '@/lib/pdf/doc-builder'
import { formatDateTimeLong } from '@/lib/datetime'

export interface DocumentPdfInput {
  title:      string
  content:    string
  createdAt:  string
  agencyName?: string | null
}

export async function buildDocumentPdf(input: DocumentPdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const fonts: Fonts = {
    // Times combina melhor com documento contratual do que Helvetica.
    regular: await pdf.embedFont(StandardFonts.TimesRoman),
    bold:    await pdf.embedFont(StandardFonts.TimesRomanBold),
  }

  pdf.setTitle(input.title)
  pdf.setAuthor(input.agencyName ?? 'TurisGuard')
  pdf.setCreator('TurisGuard')

  const doc = new Doc(pdf, fonts)

  // O `# Título` de abertura é o cabeçalho do documento, não mais uma seção:
  // writeMarkdown o trataria como heading comum, do tamanho das cláusulas.
  const body = input.content.replace(/\r\n/g, '\n')
  const head = body.match(/^\s*#\s+(.+?)\s*$/m)
  const rest = head ? body.replace(head[0], '').trimStart() : body

  if (head) {
    doc.text([{ text: sanitize(head[1]).toUpperCase(), bold: true }], {
      size: 14, lineHeight: 19, color: INK, after: 2,
    })
    doc.rule()
  }

  writeMarkdown(doc, rest)

  doc.stampFooters(
    sanitize(
      [input.agencyName, `Gerado em ${formatDateTimeLong(input.createdAt)}`]
        .filter(Boolean).join(' · '),
    ),
  )

  return pdf.save()
}

/** Nome amigável: contrato-maria-silva-2026-11-07.pdf */
export function documentFilename(title: string, createdAt: string, ext: 'pdf' | 'docx'): string {
  const slug = (title || 'documento')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'documento'
  const date = new Date(createdAt).toISOString().slice(0, 10)
  return `${slug}-${date}.${ext}`
}
