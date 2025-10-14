export interface LeadFormData {
  name: string
  email: string
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
  termsAccepted: boolean
  consentLgpd: boolean
  source: string
}

export interface GoogleCredentialResponse {
  credential: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}