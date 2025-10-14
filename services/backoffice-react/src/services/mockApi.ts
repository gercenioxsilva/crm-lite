// Mock API service for development
export const mockApi = {
  async getStats() {
    return {
      totalLeads: 1247,
      todayLeads: 45,
      conversionRate: 12.5,
      monthlyGrowth: 8.3
    }
  },

  async getChartData() {
    return [
      { name: 'Seg', leads: 45 },
      { name: 'Ter', leads: 52 },
      { name: 'Qua', leads: 38 },
      { name: 'Qui', leads: 61 },
      { name: 'Sex', leads: 55 },
      { name: 'Sab', leads: 28 },
      { name: 'Dom', leads: 22 }
    ]
  },

  async getLeads() {
    return [
      {
        id: '1',
        name: 'João Silva Santos',
        email: 'joao.silva@email.com',
        source: 'landing',
        phone: '11987654321',
        city: 'São Paulo',
        state: 'SP',
        status: 'qualified',
        score: 85,
        temperature: 'hot',
        company: 'Tech Solutions',
        job_title: 'CTO',
        lead_value: 50000,
        priority: 'high',
        assigned_to: 'vendedor1@quiz.com',
        stage_name: 'Qualificado',
        next_follow_up: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Ana Paula Ferreira',
        email: 'ana@startup.com',
        source: 'google',
        phone: '11876543210',
        city: 'Rio de Janeiro',
        state: 'RJ',
        status: 'new',
        score: 65,
        temperature: 'warm',
        company: 'Startup Fintech',
        job_title: 'Founder',
        lead_value: 30000,
        priority: 'medium',
        assigned_to: 'vendedor2@quiz.com',
        stage_name: 'Novo Lead',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  },

  async getPipeline() {
    return [
      {
        id: '1',
        name: 'Novo Lead',
        order_no: 1,
        stage_color: '#94a3b8',
        leads: [
          {
            id: '2',
            name: 'Ana Paula Ferreira',
            email: 'ana@startup.com',
            company: 'Startup Fintech',
            job_title: 'Founder',
            lead_value: 30000,
            priority: 'medium',
            temperature: 'warm',
            assigned_to: 'vendedor2@quiz.com',
            stage_name: 'Novo Lead'
          }
        ]
      },
      {
        id: '2',
        name: 'Qualificado',
        order_no: 2,
        stage_color: '#3b82f6',
        leads: [
          {
            id: '1',
            name: 'João Silva Santos',
            email: 'joao.silva@email.com',
            company: 'Tech Solutions',
            job_title: 'CTO',
            lead_value: 50000,
            priority: 'high',
            temperature: 'hot',
            assigned_to: 'vendedor1@quiz.com',
            stage_name: 'Qualificado',
            next_follow_up: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]
      },
      {
        id: '3',
        name: 'Proposta',
        order_no: 3,
        stage_color: '#f59e0b',
        leads: []
      },
      {
        id: '4',
        name: 'Negociação',
        order_no: 4,
        stage_color: '#ef4444',
        leads: []
      },
      {
        id: '5',
        name: 'Fechado',
        order_no: 5,
        stage_color: '#22c55e',
        leads: []
      }
    ]
  }
}

// API service with fallback to mock
export const apiService = {
  async fetchWithFallback(url: string, options: RequestInit = {}) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      })
      
      if (response.ok) {
        return await response.json()
      }
      throw new Error(`HTTP ${response.status}`)
    } catch (error) {
      console.warn('API call failed, using mock data:', error)
      return null
    }
  },

  async getStats() {
    const data = await this.fetchWithFallback(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/backoffice/stats`)
    return data || mockApi.getStats()
  },

  async getChartData() {
    const data = await this.fetchWithFallback(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/backoffice/chart`)
    return data || mockApi.getChartData()
  },

  async getLeads() {
    const data = await this.fetchWithFallback(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/backoffice/leads`)
    return data || mockApi.getLeads()
  },

  async getPipeline() {
    const data = await this.fetchWithFallback(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/backoffice/pipeline`)
    return data || mockApi.getPipeline()
  }
}