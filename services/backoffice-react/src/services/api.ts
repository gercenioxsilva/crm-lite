import { getApiUrl, getAuthUrl } from '../utils/config'

const API_BASE_URL = getApiUrl()

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

    if (!response.ok) {
      console.error(`API Error: ${response.status} - ${url}`)
      throw new Error(`HTTP ${response.status}`)
    }

    return response.json()
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
    } catch (error) {
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
    } catch (error) {
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