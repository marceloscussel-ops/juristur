const fs = require('fs')
const { PDFParse } = require('pdf-parse')

async function main() {
  const buf = fs.readFileSync('C:/Users/marce/Downloads/processo real.PDF')
  const parser = new PDFParse({ verbosity: 0, data: new Uint8Array(buf) })
  await parser.load()
  const info = await parser.getInfo()
  console.log('Info:', JSON.stringify(info).slice(0, 300))
  const text = await parser.getText()
  console.log('Text type:', typeof text, Array.isArray(text) ? 'array len=' + text.length : '')
  if (Array.isArray(text)) {
    const combined = text.map(p => p.text || p).join('\n')
    console.log('Combined chars:', combined.length)
    console.log(combined.slice(0, 5000))
  } else {
    console.log(String(text).slice(0, 5000))
  }
}

main().catch(e => console.error('Erro:', e.message))
