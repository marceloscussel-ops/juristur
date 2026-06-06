export default function Disclaimer() {
  return (
    <div className="j-alert j-alert-warning" role="alert">
      <svg className="w-4 h-4 shrink-0 mt-px" viewBox="0 0 20 20" fill="#D97706">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <div>
        <div className="font-semibold mb-0.5">Aviso Importante</div>
        Esta análise tem caráter meramente informativo e não constitui parecer jurídico.
        As orientações fornecidas não substituem a consulta com um advogado habilitado pela OAB.
      </div>
    </div>
  )
}
