import { AlertTriangle } from 'lucide-react'

export default function Disclaimer() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-amber-800 font-semibold text-sm">Aviso Importante</p>
        <p className="text-amber-700 text-sm mt-1">
          Esta análise tem caráter meramente informativo e não constitui parecer jurídico.
          As orientações fornecidas não substituem a consulta com um advogado habilitado pela OAB.
          Para decisões jurídicas, procure sempre assessoria especializada.
        </p>
      </div>
    </div>
  )
}
