import Link from 'next/link'
import TGLogo from '@/components/TGLogo'
import SignupForm from '@/components/SignupForm'

export default function CadastroPage() {
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

        <div className="j-card animate-fade-in">
          <SignupForm />
        </div>

        <p className="text-center j-caption mt-5">
          Já tem conta?{' '}
          <Link href="/login" className="text-indigo hover:underline font-medium">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
