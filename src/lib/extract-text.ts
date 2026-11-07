/**
 * extract-text.ts — Texto dos arquivos anexados, para a IA ler.
 *
 * ATENÇÃO ao pdf-parse: na v2 o pacote deixou de exportar uma função e passou
 * a exportar a classe `PDFParse`. O código antigo fazia `require('pdf-parse')(buffer)`,
 * que virou "m is not a function" — e, como tudo aqui está dentro de um
 * try/catch que devolve string vazia, a falha era silenciosa: todo PDF anexado
 * chegava à IA sem uma linha de conteúdo. Se um dia subir a major de novo,
 * confira esta chamada antes de qualquer outra coisa.
 */

/** Construtor de PDFParse, venha ele como named export ou dentro do default. */
type PdfParseCtor = new (opts: { data: Uint8Array }) => {
  getText(): Promise<{ text?: string }>
  destroy?(): Promise<void>
}

/** Extrai o texto de um PDF usando a API da v2 do pdf-parse. */
async function extractFromPdf(buffer: Buffer): Promise<string> {
  // `import()` em vez de `require()`: o pdf-parse é CJS e, dependendo do
  // runtime (bundle do Next x node puro), a classe vem no topo ou no default.
  const mod = await import('pdf-parse') as unknown as
    { PDFParse?: PdfParseCtor; default?: { PDFParse?: PdfParseCtor } }

  const PDFParse = mod.PDFParse ?? mod.default?.PDFParse
  if (!PDFParse) throw new Error('pdf-parse: PDFParse não encontrado no módulo')

  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  try {
    const result = await parser.getText()
    return (result?.text ?? '').trim()
  } finally {
    // Libera o worker do pdf.js; sem isso o processo do servidor segura memória.
    await parser.destroy?.()
  }
}

export async function extractTextFromFile(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<string> {
  try {
    if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
      return await extractFromPdf(buffer)
    }

    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword' ||
      fileName.endsWith('.docx') ||
      fileName.endsWith('.doc')
    ) {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      return result.value.trim()
    }

    if (mimeType.startsWith('text/')) {
      return buffer.toString('utf-8').trim()
    }

    return ''
  } catch (err) {
    // Continua devolvendo vazio (um anexo ilegível não pode derrubar o caso),
    // mas agora deixa rastro no log em vez de sumir.
    console.error(`[extract-text] falha em "${fileName}" (${mimeType}):`, err)
    return ''
  }
}
