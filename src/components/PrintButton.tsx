'use client'

import { Printer } from 'lucide-react'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="btn btn-outline print:hidden"
      title="Exportar como PDF"
    >
      <Printer className="w-4 h-4" />
      Exportar PDF
    </button>
  )
}
