/**
 * /api/profile/logo — Logomarca da agência.
 *
 *   GET    devolve a imagem (titular e membros da agência) — é o que a tela de
 *          Perfil usa na pré-visualização, já que o bucket é privado;
 *   POST   envia ou troca a logo (só o titular), multipart com o campo `file`;
 *   DELETE remove a logo (só o titular).
 *
 * O upload e a remoção usam a sessão do usuário, não service role: as policies
 * do bucket `agency-logos` são a segunda trava — mesmo que esta rota errasse,
 * o Storage recusaria gravar fora da pasta da agência ou vindo de um membro.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getVinculo } from '@/lib/agencia-do-usuario'
import { exigirTitular } from '@/lib/titular'
import {
  LOGO_BUCKET, LOGO_MAX_BYTES, LOGO_MIME, detectarFormato, dimensoesDaImagem,
} from '@/lib/agency-logo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MSG_TITULAR = 'Só o titular da conta pode alterar a logomarca da agência.'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

    const { agencyId } = await getVinculo(user.id)
    const { data: agency } = await supabase
      .from('agencies').select('logo_path').eq('id', agencyId).maybeSingle()

    if (!agency?.logo_path) {
      return NextResponse.json({ error: 'A agência não tem logomarca.' }, { status: 404 })
    }

    const { data, error } = await supabase.storage.from(LOGO_BUCKET).download(agency.logo_path)
    if (error || !data) {
      return NextResponse.json({ error: 'Logomarca não encontrada.' }, { status: 404 })
    }

    const bytes = new Uint8Array(await data.arrayBuffer())
    const format = detectarFormato(bytes)

    return new NextResponse(bytes, {
      headers: {
        'Content-Type':  format ? LOGO_MIME[format] : 'application/octet-stream',
        'Content-Length': String(bytes.length),
        // O caminho muda a cada troca (logo-<timestamp>), e a tela pede a
        // imagem com `?v=<caminho>`: dá para guardar em cache sem servir a
        // logo antiga depois de uma troca.
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const porteiro = await exigirTitular(MSG_TITULAR)
    if ('erro' in porteiro) return porteiro.erro
    const { agencyId } = porteiro

    const form = await request.formData().catch(() => null)
    const file = form?.get('file')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Selecione um arquivo de imagem.' }, { status: 400 })
    }
    if (file.size > LOGO_MAX_BYTES) {
      return NextResponse.json({ error: 'A imagem passa de 2 MB. Envie um arquivo menor.' }, { status: 413 })
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    // A tela já converte WebP e SVG para PNG; aqui chega só PNG ou JPEG.
    const format = detectarFormato(bytes)
    if (!format) {
      return NextResponse.json(
        { error: 'Formato não aceito. Envie a logomarca em PNG, JPG, WebP ou SVG.' },
        { status: 415 },
      )
    }
    const dims = dimensoesDaImagem(bytes, format)
    if (!dims || !dims.width || !dims.height) {
      return NextResponse.json({ error: 'Não foi possível ler esta imagem. Tente outro arquivo.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: atual } = await supabase
      .from('agencies').select('logo_path').eq('id', agencyId).maybeSingle()

    const path = `${agencyId}/logo-${Date.now()}.${format}`
    const { error: upErr } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(path, bytes, { contentType: LOGO_MIME[format], upsert: false })

    if (upErr) {
      console.error('[profile/logo] upload', upErr.message)
      return NextResponse.json({ error: 'Não foi possível enviar a logomarca. Tente de novo.' }, { status: 500 })
    }

    const { error: dbErr } = await supabase
      .from('agencies').update({ logo_path: path }).eq('id', agencyId)

    if (dbErr) {
      // Sem o caminho gravado, o arquivo novo ficaria órfão no bucket.
      await supabase.storage.from(LOGO_BUCKET).remove([path])
      console.error('[profile/logo] update', dbErr.message)
      return NextResponse.json({ error: 'Não foi possível salvar a logomarca. Tente de novo.' }, { status: 500 })
    }

    // A antiga sai só depois que a nova está gravada: se algo falhar no meio,
    // a agência continua com uma logo válida.
    if (atual?.logo_path && atual.logo_path !== path) {
      await supabase.storage.from(LOGO_BUCKET).remove([atual.logo_path])
    }

    return NextResponse.json({ logo_path: path })
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const porteiro = await exigirTitular(MSG_TITULAR)
    if ('erro' in porteiro) return porteiro.erro
    const { agencyId } = porteiro

    const supabase = await createClient()
    const { data: atual } = await supabase
      .from('agencies').select('logo_path').eq('id', agencyId).maybeSingle()

    const { error } = await supabase
      .from('agencies').update({ logo_path: null }).eq('id', agencyId)
    if (error) {
      return NextResponse.json({ error: 'Não foi possível remover a logomarca.' }, { status: 500 })
    }

    if (atual?.logo_path) {
      await supabase.storage.from(LOGO_BUCKET).remove([atual.logo_path])
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
