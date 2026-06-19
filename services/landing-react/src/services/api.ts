import { LeadFormData, ApiResponse } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const api = {
  async createLead(data: LeadFormData): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/public/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      return {
        success: response.ok,
        data: result,
        error: response.ok ? undefined : result.error || result.message || 'Erro ao criar lead',
      }
    } catch {
      return {
        success: false,
        error: 'Erro de conexao',
      }
    }
  },
}
