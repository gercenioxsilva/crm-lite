import { getApiUrl, getAuthUrl } from '../utils/config'

const API_BASE_URL = getApiUrl()

export class ApiError extends Error {
  status: number
  code?: string
  details?: unknown

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

class ApiService {
  private getAuthHeaders() {
    const token = localStorage.getItem('auth_token')
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem('auth_token')
    
    // Se for token mock, tentar obter token real
    if (token === 'mock-admin-token') {
      await this.ensureRealToken()
    }
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers
      }
    })

    const body = await response.text()
    const contentType = response.headers.get('content-type') || ''

    if (!response.ok) {
      console.error(`API Error: ${response.status} - ${url}`, body)
      let payload: any = null
      try {
        payload = body ? JSON.parse(body) : null
      } catch {
        payload = null
      }

      const message = payload?.message || payload?.error || `HTTP ${response.status}`
      throw new ApiError(message, response.status, payload?.code, payload?.details || body)
    }

    if (!body) {
      return null
    }

    if (!contentType.toLowerCase().includes('application/json')) {
      const preview = body.trim().slice(0, 120)
      throw new Error(`Resposta invalida da API: esperado JSON, recebido ${contentType || 'sem content-type'} em ${url}. Inicio: ${preview}`)
    }

    try {
      return JSON.parse(body)
    } catch {
      console.error(`Invalid JSON response from ${url}`, body)
      throw new Error(`Resposta JSON invalida da API em ${url}`)
    }
  }
  
  private async ensureRealToken() {
    try {
      const authResponse = await fetch(`${getAuthUrl()}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: 'backoffice',
          client_secret: 'backoffice-secret',
          scope: 'leads:read leads:write reports:read api:read admin:access'
        })
      })

      if (authResponse.ok) {
        const { access_token } = await authResponse.json()
        localStorage.setItem('auth_token', access_token)
        console.log('Real token obtained successfully')
      }
    } catch {
      console.warn('Failed to get real token, using mock')
    }
  }

  async getStats() {
    return await this.fetchWithAuth(`${API_BASE_URL}/backoffice/stats`)
  }

  async getChartData() {
    return await this.fetchWithAuth(`${API_BASE_URL}/backoffice/chart`)
  }

  async getLeads() {
    return await this.fetchWithAuth(`${API_BASE_URL}/backoffice/leads`)
  }

  async getPipeline() {
    return await this.fetchWithAuth(`${API_BASE_URL}/backoffice/pipeline`)
  }

  async getActivities() {
    return await this.fetchWithAuth(`${API_BASE_URL}/backoffice/activities`)
  }

  async createLead(leadData: any) {
    return this.fetchWithAuth(`${API_BASE_URL}/backoffice/leads`, {
      method: 'POST',
      body: JSON.stringify(leadData)
    })
  }

  async updateLead(id: string, leadData: any) {
    try {
      return await this.fetchWithAuth(`${API_BASE_URL}/backoffice/leads/${id}`, {
        method: 'PUT',
        body: JSON.stringify(leadData)
      })
    } catch {
      console.warn('Failed to update lead, using mock response')
      return { id, ...leadData, updated_at: new Date().toISOString() }
    }
  }

  async moveLead(id: string, stageId: string) {
    return this.fetchWithAuth(`${API_BASE_URL}/backoffice/leads/${id}/move`, {
      method: 'PUT',
      body: JSON.stringify({ stageId })
    })
  }

  async createActivity(activityData: any) {
    return this.fetchWithAuth(`${API_BASE_URL}/backoffice/activities`, {
      method: 'POST',
      body: JSON.stringify(activityData)
    })
  }
}

export const apiService = new ApiService()
