import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'JurisTur — Assessoria Jurídica para Agências de Turismo',
  description: 'Plataforma de assessoria jurídica especializada para agências de turismo brasileiras',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50">
        {children}
      </body>
    </html>
  )
}
