import { LeadFormData, ApiResponse } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

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
        error: response.ok ? undefined : result.message || 'Erro ao criar lead'
      }
    } catch (error) {
      return {
        success: false,
        error: 'Erro de conexão'
      }
    }
  },

  async createGoogleLead(credential: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/public/leads/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credential }),
      })

      const result = await response.json()
      
      return {
        success: response.ok,
        data: result,
        error: response.ok ? undefined : result.message || 'Erro ao criar lead com Google'
      }
    } catch (error) {
      return {
        success: false,
        error: 'Erro de conexão'
      }
    }
  }
}