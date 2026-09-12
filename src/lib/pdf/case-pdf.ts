// Geração do PDF da orientação, no servidor.
//
// Antes o "Exportar PDF" chamava window.print() — dependia da impressora PDF do
// sistema (e o CSS de impressão estava quebrado, saía em branco). Aqui montamos
// o arquivo de verdade com pdf-lib: um clique, um .pdf baixado.

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { formatDateTimeLong } from '@/lib/datetime'

const PAGE_W = 595.28   // A4 em pontos
const PAGE_H = 841.89
const MARGIN = 56
const CONTENT_W = PAGE_W - MARGIN * 2
const FOOTER_Y = 38

const INK    = rgb(0.043, 0.071, 0.11)   // #0B121C
const BODY   = rgb(0.18, 0.21, 0.27)
const MUTED  = rgb(0.43, 0.49, 0.60)
const INDIGO = rgb(0.169, 0.122, 0.80)   // #2B1FCC
const LINE   = rgb(0.88, 0.89, 0.92)
const AMBER_BG   = rgb(1, 0.973, 0.92)
const AMBER_EDGE = rgb(0.992, 0.847, 0.541)
const AMBER_INK  = rgb(0.486, 0.259, 0.055)

type Color = ReturnType<typeof rgb>

/** As fontes padrão do PDF usam WinAnsi: o que não couber nela vira equivalente ASCII. */
const REPLACEMENTS: Record<string, string> = {
  '→': '->', '←': '<-', '⇒': '=>', '✓': '-', '✔': '-',
  '✗': 'x', '≥': '>=', '≤': '<=', ' ': ' ', ' ': ' ',
  ' ': ' ',
}
// Latin-1 + os extras que o WinAnsi cobre (aspas curvas, travessões, bullet…).
const WINANSI_OK = /[\t\n\r\x20-\x7e¡-ÿ€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/

function sanitize(text: string): string {
  return Array.from(text ?? '')
    .map(ch => REPLACEMENTS[ch] ?? (WINANSI_OK.test(ch) ? ch : ''))
    .join('')
}

interface Run { text: string; bold: boolean }

/** Quebra **negrito** em trechos, preservando o resto do texto. */
function parseInline(line: string): Run[] {
  const runs: Run[] = []
  for (const part of line.split(/(\*\*[^*]+\*\*)/g)) {
    if (!part) continue
    const bold = part.startsWith('**') && part.endsWith('**') && part.length > 4
    runs.push({ text: sanitize(bold ? part.slice(2, -2) : part), bold })
  }
  return runs.length ? runs : [{ text: '', bold: false }]
}

interface Fonts { regular: PDFFont; bold: PDFFont }

class Doc {
  private page!: PDFPage
  private y = 0
  readonly pages: PDFPage[] = []

  constructor(private readonly pdf: PDFDocument, private readonly fonts: Fonts) {
    this.newPage()
  }

  private newPage() {
    this.page = this.pdf.addPage([PAGE_W, PAGE_H])
    this.pages.push(this.page)
    this.y = PAGE_H - MARGIN
  }

  /** Garante espaço vertical; abre nova página quando não couber. */
  private ensure(height: number) {
    if (this.y - height < FOOTER_Y + 24) this.newPage()
  }

  space(amount: number) { this.y -= amount }

  private font(bold: boolean) { return bold ? this.fonts.bold : this.fonts.regular }

  /** Quebra os trechos em linhas que cabem na largura disponível. */
  private wrap(runs: Run[], size: number, width: number): Run[][] {
    const lines: Run[][] = []
    let current: Run[] = []
    let used = 0

    for (const run of runs) {
      for (const word of run.text.split(/(\s+)/)) {
        if (!word) continue
        const isSpace = /^\s+$/.test(word)
        const w = this.font(run.bold).widthOfTextAtSize(word, size)
        if (used + w > width && !isSpace && current.length) {
          lines.push(current); current = []; used = 0
        }
        if (isSpace && !current.length) continue
        const last = current[current.length - 1]
        if (last && last.bold === run.bold) last.text += word
        else current.push({ text: word, bold: run.bold })
        used += w
      }
    }
    if (current.length) lines.push(current)
    return lines.length ? lines : [[{ text: '', bold: false }]]
  }

  /** Escreve um parágrafo, quebrando linhas conforme a largura. */
  text(runs: Run[], opts: {
    size?: number; lineHeight?: number; color?: Color
    indent?: number; width?: number; after?: number
  } = {}) {
    const size = opts.size ?? 10.5
    const lh = opts.lineHeight ?? size * 1.5
    const color = opts.color ?? BODY
    const indent = opts.indent ?? 0
    const x = MARGIN + indent
    const width = (opts.width ?? CONTENT_W) - indent

    for (const line of this.wrap(runs, size, width)) {
      this.ensure(lh)
      let cx = x
      for (const run of line) {
        this.page.drawText(run.text, { x: cx, y: this.y - size, size, font: this.font(run.bold), color })
        cx += this.font(run.bold).widthOfTextAtSize(run.text, size)
      }
      this.y -= lh
    }
    if (opts.after) this.y -= opts.after
  }

  heading(label: string, opts: { size?: number; color?: Color } = {}) {
    const size = opts.size ?? 12.5
    this.ensure(size * 2.6)
    this.space(6)
    this.text([{ text: label, bold: true }], {
      size, color: opts.color ?? INK, lineHeight: size * 1.35, after: 3,
    })
  }

  bullet(runs: Run[], marker = '•') {
    const size = 10.5
    this.ensure(size * 1.5)
    this.page.drawText(marker, { x: MARGIN + 4, y: this.y - size, size, font: this.fonts.regular, color: INDIGO })
    this.text(runs, { indent: 18, after: 1 })
  }

  rule() {
    this.ensure(16)
    this.space(6)
    this.page.drawLine({
      start: { x: MARGIN, y: this.y }, end: { x: PAGE_W - MARGIN, y: this.y },
      thickness: 0.75, color: LINE,
    })
    this.space(10)
  }

  /** Caixa com fundo, usada no relato e no complemento. */
  box(content: string, tint: Color = rgb(0.973, 0.976, 0.984)) {
    const size = 10.5
    const lh = size * 1.5
    const pad = 12

    for (const paragraph of sanitize(content).split(/\n{2,}/)) {
      const runs = parseInline(paragraph.replace(/\n/g, ' ').trim())
      const height = this.wrap(runs, size, CONTENT_W - pad * 2).length * lh + pad * 2
      this.ensure(height)
      this.page.drawRectangle({
        x: MARGIN, y: this.y - height, width: CONTENT_W, height,
        color: tint, borderColor: LINE, borderWidth: 0.75,
      })
      this.space(pad)
      this.text(runs, { size, lineHeight: lh, indent: pad, width: CONTENT_W - pad })
      this.space(pad + 8)
    }
  }

  /** Aviso do Provimento OAB, em destaque âmbar. */
  notice(title: string, body: string) {
    const size = 9.5
    const lh = size * 1.5
    const pad = 12
    const runs = parseInline(body)
    const height = this.wrap(runs, size, CONTENT_W - pad * 2).length * lh + pad * 2 + 16
    this.ensure(height)
    this.page.drawRectangle({
      x: MARGIN, y: this.y - height, width: CONTENT_W, height,
      color: AMBER_BG, borderColor: AMBER_EDGE, borderWidth: 0.75,
    })
    this.space(pad)
    this.text([{ text: sanitize(title), bold: true }], {
      size, lineHeight: 16, indent: pad, width: CONTENT_W - pad, color: AMBER_INK,
    })
    this.text(runs, { size, lineHeight: lh, indent: pad, width: CONTENT_W - pad, color: AMBER_INK })
    this.space(pad)
  }

  /** Faixa escura com a marca, no topo da primeira página. */
  brandHeader(subtitle: string) {
    const h = 64
    this.page.drawRectangle({ x: 0, y: PAGE_H - h, width: PAGE_W, height: h, color: INK })
    this.page.drawText('TurisGuard', {
      x: MARGIN, y: PAGE_H - 34, size: 16, font: this.fonts.bold, color: rgb(1, 1, 1),
    })
    this.page.drawText(sanitize(subtitle), {
      x: MARGIN, y: PAGE_H - 50, size: 9, font: this.fonts.regular, color: rgb(0.616, 0.631, 0.984),
    })
    this.y = PAGE_H - h - 28
  }

  /** Rodapé com paginação — só no fim, quando se sabe o total de páginas. */
  stampFooters(left: string) {
    this.pages.forEach((page, i) => {
      page.drawText(sanitize(left), {
        x: MARGIN, y: FOOTER_Y, size: 8, font: this.fonts.regular, color: MUTED,
      })
      const label = `${i + 1}/${this.pages.length}`
      const w = this.fonts.regular.widthOfTextAtSize(label, 8)
      page.drawText(label, { x: PAGE_W - MARGIN - w, y: FOOTER_Y, size: 8, font: this.fonts.regular, color: MUTED })
    })
  }
}

/** Escreve o markdown da análise (títulos, listas, negrito) no documento. */
function writeMarkdown(doc: Doc, markdown: string) {
  for (const raw of sanitize(markdown).replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trimEnd()

    if (!line.trim()) { doc.space(5); continue }
    if (/^\s*(-{3,}|_{3,}|\*{3,})\s*$/.test(line)) { doc.rule(); continue }

    const hash = line.match(/^(#{1,4})\s+(.*)$/)
    if (hash) { doc.heading(hash[2], { size: hash[1].length <= 2 ? 12.5 : 11.5 }); continue }

    // Linha inteira em negrito é título de seção ("**O que a lei diz**").
    const strongOnly = line.match(/^\*\*(.+?)\*\*:?\s*$/)
    if (strongOnly) { doc.heading(strongOnly[1]); continue }

    const bullet = line.match(/^\s*[-*•]\s+(.*)$/)
    if (bullet) { doc.bullet(parseInline(bullet[1])); continue }

    const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)$/)
    if (numbered) { doc.bullet(parseInline(numbered[2]), `${numbered[1]}.`); continue }

    // Tabelas markdown são raras aqui; viram texto corrido.
    if (/^\s*\|/.test(line)) {
      if (/^\s*\|[\s:|-]+\|?\s*$/.test(line)) continue
      const cells = line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim())
      doc.text(parseInline(cells.join('  -  ')))
      continue
    }

    doc.text(parseInline(line), { after: 2 })
  }
}

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
