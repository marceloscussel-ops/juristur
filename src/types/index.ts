export type CaseStatus = 'em_analise' | 'concluido' | 'arquivado'

export type CaseCategory =
  | 'Cancelamento de pacote pelo cliente'
  | 'Cancelamento de pacote pelo fornecedor'
  | 'Overbooking (hotel ou aéreo)'
  | 'Acidente ou incidente durante o serviço'
  | 'Disputa com operadora'
  | 'Reclamação de cliente (Procon / Reclame Aqui)'
  | 'Questão trabalhista'
  | 'Contrato com fornecedor'
  | 'Outro'

export const CASE_CATEGORIES: CaseCategory[] = [
  'Cancelamento de pacote pelo cliente',
  'Cancelamento de pacote pelo fornecedor',
  'Overbooking (hotel ou aéreo)',
  'Acidente ou incidente durante o serviço',
  'Disputa com operadora',
  'Reclamação de cliente (Procon / Reclame Aqui)',
  'Questão trabalhista',
  'Contrato com fornecedor',
  'Outro',
]

export interface Agency {
  id: string
  name: string
  cnpj: string
  email: string
  created_at: string
}

export interface Case {
  id: string
  agency_id: string
  title: string
  description: string
  category: CaseCategory
  status: CaseStatus
  created_at: string
  case_analyses?: CaseAnalysis[]
  case_files?: CaseFile[]
}

export interface CaseFile {
  id: string
  case_id: string
  file_url: string
  file_name: string
  file_type: string
  created_at: string
}

export interface CaseAnalysis {
  id: string
  case_id: string
  ai_response: string
  created_at: string
}
