import Link from 'next/link'
import { cookies } from 'next/headers'
import TGLogo from '@/components/TGLogo'
import SignupForm from '@/components/SignupForm'
import { INDICADOR_COOKIE, buscarIndicadorPorSlug } from '@/lib/partners'

interface Props {
  searchParams: Promise<{ ind?: string }>
}

export default async function CadastroPage({ searchParams }: Props) {
  const { ind } = await searchParams

  // Quem chegou pelo link de indicação vê de quem é a indicação antes de se
  // cadastrar — o indicador precisa poder conferir que o link dele funciona, e
  // a agência precisa saber que aquele vínculo vai ficar registrado.
  // O `?ind=` é o caminho normal; o cookie cobre quem navegou dentro do site
  // depois de clicar no link e perdeu a query string.
  const slug      = ind ?? (await cookies()).get(INDICADOR_COOKIE)?.value
  const indicador = slug ? await buscarIndicadorPorSlug(slug) : null

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center no-underline">
            <TGLogo size={36} variant="color" withWordmark />
          </Link>
          <h1 className="j-h1 mt-5 mb-1">Cadastro da agência</h1>
          <p className="j-caption">Crie sua conta e comece a usar</p>
        </div>

        {indicador && (
          <div className="j-alert j-alert-info text-[13px] mb-4">
            Cadastro por indicação de <strong>{indicador.name}</strong>.
          </div>
        )}

        <div className="j-card animate-fade-in">
          <SignupForm indicador={indicador?.slug} />
        </div>

        <p className="text-center j-caption mt-5">
          Já tem conta?{' '}
          <Link href="/login" className="text-indigo hover:underline font-medium">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
