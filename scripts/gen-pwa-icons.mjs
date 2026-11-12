/**
 * Gera os PNG do PWA a partir dos SVG fonte (src/app/icon.svg e assets/pwa/).
 *
 * Android e iOS pedem PNG: o manifest aceita SVG, mas o Chrome só considera
 * o app instalável com um ícone raster de 192px ou mais, e o iPhone ignora
 * apple-touch-icon em SVG. Os SVG continuam sendo a fonte — mexeu neles,
 * rode `node scripts/gen-pwa-icons.mjs` da raiz do projeto.
 *
 * A rasterização usa o Chrome (ou o Edge) que já está instalado na máquina,
 * em modo headless, para não trazer uma dependência de imagem (sharp, canvas)
 * só para isto.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const CANDIDATOS = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean)

const navegador = CANDIDATOS.find(p => existsSync(p))
if (!navegador) {
  console.error('Chrome/Edge não encontrado. Aponte o caminho em CHROME_PATH.')
  process.exit(1)
}

/** svg de origem, png de destino, lado em px, fundo transparente? */
const ALVOS = [
  ['src/app/icon.svg',            'public/icon-192.png',           192, true],
  ['src/app/icon.svg',            'public/icon-512.png',           512, true],
  ['assets/pwa/icon-maskable.svg', 'public/icon-maskable-192.png',  192, false],
  ['assets/pwa/icon-maskable.svg', 'public/icon-maskable-512.png',  512, false],
  ['assets/pwa/apple-touch-icon.svg', 'public/apple-touch-icon.png',   180, false],
]

const trabalho = mkdtempSync(join(tmpdir(), 'tg-icons-'))

try {
  for (const [origem, destino, lado, transparente] of ALVOS) {
    const svg  = readFileSync(resolve(origem), 'utf8')
    const html = join(trabalho, `${lado}-${destino.replace(/\W+/g, '-')}.html`)
    writeFileSync(
      html,
      `<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0;padding:0;width:${lado}px;height:${lado}px;overflow:hidden;background:transparent}
  svg{display:block;width:${lado}px;height:${lado}px}
</style>
${svg}`,
      'utf8'
    )

    const args = [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${lado},${lado}`,
      `--screenshot=${resolve(destino)}`,
    ]
    if (transparente) args.push('--default-background-color=00000000')
    args.push(pathToFileURL(resolve(html)).href)

    const r = spawnSync(navegador, args, { stdio: 'pipe' })
    if (r.status !== 0 || !existsSync(resolve(destino))) {
      console.error(`falhou: ${destino}`)
      console.error(r.stderr?.toString().slice(0, 2000))
      process.exitCode = 1
      continue
    }
    console.log(`ok  ${destino}  ${lado}x${lado}`)
  }
} finally {
  rmSync(trabalho, { recursive: true, force: true })
}
