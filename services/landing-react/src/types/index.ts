export interface LeadFormData {
  name: string
  email: string
  company?: string
  jobTitle?: string
  document?: string
  document_type?: 'cpf' | 'cnpj'
  cpf?: string
  phone?: string
  birthDate?: string
  cep?: string
  addressLine?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  monthlyIncome?: number
  leadValue?: number
  expectedCloseDate?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  termsAccepted: boolean
  consentLgpd: boolean
  source: string
  customFields?: Record<string, unknown>
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}
