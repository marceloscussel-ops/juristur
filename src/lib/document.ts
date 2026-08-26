/**
 * document.ts — Validação e formatação de CPF e CNPJ brasileiros.
 *
 * A agência pode se cadastrar com CPF (pessoa física / MEI sem CNPJ) ou CNPJ.
 * A coluna `cnpj` da tabela `agencies` guarda os dois casos (só dígitos), e o
 * Asaas aceita ambos no mesmo campo `cpfCnpj`.
 *
 * Convenção: internamente armazenamos apenas dígitos. A formatação é aplicada
 * só na exibição/entrada.
 */

/** Valida CPF (11 dígitos) pelos dois dígitos verificadores. */
export function isValidCPF(raw: string): boolean {
  const d = raw.replace(/\D/g, '')
  if (d.length !== 11) return false
  if (/^(\d)\1{10}$/.test(d)) return false // rejeita 000..., 111..., etc.

  const calc = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i)
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }

  return calc(9) === Number(d[9]) && calc(10) === Number(d[10])
}

/** Valida CNPJ (14 dígitos) pelos dois dígitos verificadores. */
export function isValidCNPJ(raw: string): boolean {
  const d = raw.replace(/\D/g, '')
  if (d.length !== 14) return false
  if (/^(\d)\1{13}$/.test(d)) return false // rejeita 000..., 111..., etc.

  const calc = (len: number) => {
    // Pesos: começam em 5 (len=12) ou 6 (len=13) e decrescem, voltando a 9 após 2.
    let sum = 0
    let weight = len - 7
    for (let i = 0; i < len; i++) {
      sum += Number(d[i]) * weight
      weight = weight === 2 ? 9 : weight - 1
    }
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }

  return calc(12) === Number(d[12]) && calc(13) === Number(d[13])
}

/**
 * Valida CPF (11 dígitos) ou CNPJ (14 dígitos). Aceita string formatada.
 * Usa o comprimento para decidir qual algoritmo aplicar.
 */
export function isValidCpfCnpj(raw?: string | null): boolean {
  const d = (raw ?? '').replace(/\D/g, '')
  if (d.length === 11) return isValidCPF(d)
  if (d.length === 14) return isValidCNPJ(d)
  return false
}

/**
 * Formata dinamicamente conforme o usuário digita:
 *   até 11 dígitos → CPF  (000.000.000-00)
 *   12+ dígitos    → CNPJ (00.000.000/0000-00)
 */
export function formatCpfCnpj(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 14)

  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2')
  }

  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

/** Formata um valor já armazenado (só dígitos) como CPF ou CNPJ para exibição. */
export function displayCpfCnpj(raw?: string | null): string {
  const d = (raw ?? '').replace(/\D/g, '')
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  return raw ?? ''
}
