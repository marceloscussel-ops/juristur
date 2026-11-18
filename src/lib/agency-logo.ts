/**
 * agency-logo.ts — Logomarca da agência: regras de arquivo e carga para os
 * geradores de PDF e DOCX.
 *
 * O arquivo vive no bucket PRIVADO `agency-logos`, em `<agency_id>/logo-*.png|jpg`,
 * e o caminho fica em `agencies.logo_path` (ver a migration 2026-11-18).
 *
 * Só PNG e JPEG são guardados: são os únicos formatos que o pdf-lib embute, e o
 * Word aceita os dois. WebP e SVG são aceitos na tela e convertidos para PNG no
 * navegador (ver `prepararLogo` em LogoAgencia.tsx) — assim o servidor nunca
 * precisa de uma biblioteca de imagem.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export const LOGO_BUCKET = 'agency-logos'
/** 2 MB — mesmo limite gravado no bucket (`file_size_limit`). */
export const LOGO_MAX_BYTES = 2 * 1024 * 1024

export type LogoFormat = 'png' | 'jpg'

export const LOGO_MIME: Record<LogoFormat, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
}

export interface AgencyLogo {
  bytes:  Uint8Array
  format: LogoFormat
  /** Em pixels, lidos do próprio arquivo. */
  width:  number
  height: number
}

/**
 * Identifica o formato pelos primeiros bytes — o `type` que o navegador manda
 * é só a extensão do arquivo, e um .png renomeado de .exe passaria por ele.
 */
export function detectarFormato(bytes: Uint8Array): LogoFormat | null {
  if (bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    return 'png'
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpg'
  }
  return null
}

/** Largura e altura em pixels, lidas do cabeçalho PNG (IHDR) ou do marcador SOF do JPEG. */
export function dimensoesDaImagem(bytes: Uint8Array, format: LogoFormat): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

  if (format === 'png') {
    if (bytes.length < 24) return null
    return { width: view.getUint32(16), height: view.getUint32(20) }
  }

  // JPEG: percorre os segmentos até um Start Of Frame (C0–CF, exceto C4, C8 e CC).
  let i = 2
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) { i++; continue }
    const marker = bytes[i + 1]
    if (marker === 0xff) { i++; continue }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue }
    const len = view.getUint16(i + 2)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: view.getUint16(i + 5), width: view.getUint16(i + 7) }
    }
    i += 2 + len
  }
  return null
}

/**
 * Cabe a logo numa caixa máxima, sem distorcer. Usada pelo PDF (pontos) e pelo
 * DOCX (pixels) — a unidade é a de quem chama.
 */
export function encaixar(
  width: number, height: number, maxW: number, maxH: number,
): { width: number; height: number } {
  const scale = Math.min(maxW / width, maxH / height, 1)
  return { width: width * scale, height: height * scale }
}

/**
 * Carrega a logo da agência para embutir num documento. Usa o cliente com a
 * sessão do usuário: a policy de leitura do bucket já restringe à própria
 * agência (titular e membros).
 *
 * Nunca lança: sem logo, ou com qualquer falha de leitura, devolve null e o
 * documento sai no layout de sempre — a logo não pode impedir o download.
 */
export async function carregarLogoDaAgencia(
  supabase: SupabaseClient,
  logoPath: string | null | undefined,
): Promise<AgencyLogo | null> {
  if (!logoPath) return null
  try {
    const { data, error } = await supabase.storage.from(LOGO_BUCKET).download(logoPath)
    if (error || !data) return null

    const bytes = new Uint8Array(await data.arrayBuffer())
    const format = detectarFormato(bytes)
    if (!format) return null

    const dims = dimensoesDaImagem(bytes, format)
    if (!dims || !dims.width || !dims.height) return null

    return { bytes, format, ...dims }
  } catch (err) {
    console.error('[agency-logo] falha ao carregar a logo', err)
    return null
  }
}
