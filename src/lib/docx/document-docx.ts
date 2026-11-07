/**
 * document-docx.ts — Converte o markdown do documento gerado em um .docx real.
 *
 * Um .docx de verdade (e não um HTML renomeado) porque a agência vai abrir o
 * arquivo no Word para preencher as lacunas, ajustar e imprimir para assinatura
 * — com HTML renomeado o Word reclama na abertura e a paginação sai errada.
 *
 * O subconjunto de markdown é o mesmo que a IA produz: `#`/`##` títulos,
 * `**negrito**` inline, listas com `-` e `1.`, e `---` como régua.
 */

import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, convertInchesToTwip,
} from 'docx'

interface Run { text: string; bold: boolean }

/** Quebra **negrito** em trechos. */
function parseInline(line: string): Run[] {
  const runs: Run[] = []
  for (const part of line.split(/(\*\*[^*]+\*\*)/g)) {
    if (!part) continue
    const bold = part.startsWith('**') && part.endsWith('**') && part.length > 4
    runs.push({ text: bold ? part.slice(2, -2) : part, bold })
  }
  return runs.length ? runs : [{ text: '', bold: false }]
}

function textRuns(line: string, size = 22): TextRun[] {
  return parseInline(line).map(r => new TextRun({ text: r.text, bold: r.bold, size }))
}

/** Régua horizontal: um parágrafo vazio com borda inferior. */
function rule(): Paragraph {
  return new Paragraph({
    spacing: { before: 160, after: 160 },
    border:  { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'C9CDD6', space: 1 } },
    children: [],
  })
}

/** Traduz o markdown em parágrafos do Word. */
function markdownToParagraphs(markdown: string): Paragraph[] {
  const out: Paragraph[] = []

  for (const raw of markdown.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trimEnd()

    if (!line.trim()) continue
    if (/^\s*(-{3,}|_{3,}|\*{3,})\s*$/.test(line)) { out.push(rule()); continue }

    const hash = line.match(/^(#{1,4})\s+(.*)$/)
    if (hash) {
      const level = hash[1].length
      out.push(new Paragraph({
        heading:   level === 1 ? HeadingLevel.HEADING_1
                 : level === 2 ? HeadingLevel.HEADING_2
                 : HeadingLevel.HEADING_3,
        alignment: level === 1 ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing:   { before: level === 1 ? 0 : 280, after: 140 },
        children:  textRuns(hash[2], level === 1 ? 28 : 24),
      }))
      continue
    }

    const bullet = line.match(/^\s*[-*•]\s+(.*)$/)
    if (bullet) {
      out.push(new Paragraph({
        bullet:   { level: 0 },
        spacing:  { after: 80 },
        alignment: AlignmentType.JUSTIFIED,
        children: textRuns(bullet[1]),
      }))
      continue
    }

    const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)$/)
    if (numbered) {
      out.push(new Paragraph({
        spacing:   { after: 80 },
        indent:    { left: convertInchesToTwip(0.3) },
        alignment: AlignmentType.JUSTIFIED,
        children:  textRuns(`${numbered[1]}. ${numbered[2]}`),
      }))
      continue
    }

    out.push(new Paragraph({
      spacing:   { after: 140 },
      alignment: AlignmentType.JUSTIFIED,
      children:  textRuns(line),
    }))
  }

  return out
}

export interface DocumentDocxInput {
  title:   string
  content: string
  agencyName?: string | null
}

export async function buildDocumentDocx(input: DocumentDocxInput): Promise<Buffer> {
  const doc = new Document({
    creator:     input.agencyName ?? 'TurisGuard',
    title:       input.title,
    description: 'Documento gerado no TurisGuard',
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22 },     // 11pt
          paragraph: { spacing: { line: 320 } },  // ~1,15 de entrelinha
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top:    convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left:   convertInchesToTwip(1.1),
            right:  convertInchesToTwip(1.1),
          },
        },
      },
      children: markdownToParagraphs(input.content),
    }],
  })

  return Packer.toBuffer(doc)
}
