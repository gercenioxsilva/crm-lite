import { useState, useEffect } from 'react'
import { Box, Typography, Grid, Card, CardContent, LinearProgress } from '@mui/material'

interface Stats {
  totalLeads: number
  todayLeads: number
  conversionRate: number
  monthlyGrowth: number
  totalValue: number
}

interface Lead {
  id: string
  name: string
  email: string
  source?: string
  temperature?: string
  priority?: string
  lead_value?: number
  created_at: string
}

interface ChartData {
  name: string
  leads: number
}

export function SimpleReports() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('auth_token') || 'mock-admin-token'
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

      const [statsRes, leadsRes, chartRes] = await Promise.all([
        fetch('http://localhost:3000/backoffice/stats', { headers }),
        fetch('http://localhost:3000/backoffice/leads', { headers }),
        fetch('http://localhost:3000/backoffice/chart', { headers })
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      if (leadsRes.ok) {
        const leadsData = await leadsRes.json()
        setLeads(Array.isArray(leadsData) ? leadsData : [])
      }

      if (chartRes.ok) {
        const chartData = await chartRes.json()
        setChartData(Array.isArray(chartData) ? chartData : [])
      }
    } catch (error) {
      console.error('Error fetching reports data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Carregando relatórios...</Typography>
      </Box>
    )
  }

  const sourceData = leads.reduce((acc: any, lead) => {
    const source = lead.source || 'unknown'
    acc[source] = (acc[source] || 0) + 1
    return acc
  }, {})

  const hotLeads = leads.filter(l => l.temperature === 'hot').length
  const highPriorityLeads = leads.filter(l => l.priority === 'high' || l.priority === 'urgent').length

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          📊 Relatórios e Analytics
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Análises e métricas do seu CRM em tempo real
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📈 Leads por Dia da Semana
              </Typography>
              {chartData.map((item) => (
                <Box key={item.name} sx={{ mb: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2">{item.name}</Typography>
                    <Typography variant="body2" fontWeight="bold">{item.leads}</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={chartData.length > 0 ? (item.leads / Math.max(...chartData.map(d => d.leads), 1)) * 100 : 0}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🎯 Leads por Fonte
              </Typography>
              {Object.entries(sourceData).map(([source, count]: [string, any]) => (
                <Box key={source} sx={{ mb: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {source === 'landing' ? '🌐 Landing Page' : 
                       source === 'google' ? '🔍 Google' :
                       source === 'facebook' ? '📘 Facebook' :
                       source === 'linkedin' ? '💼 LinkedIn' :
                       source === 'instagram' ? '📸 Instagram' : `📱 ${source}`}
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">{count}</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={leads.length > 0 ? (count / leads.length) * 100 : 0}
                    sx={{ height: 8, borderRadius: 4 }}
                    color={source === 'landing' ? 'primary' : 
                           source === 'google' ? 'success' : 
                           source === 'facebook' ? 'info' : 'secondary'}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📋 Resumo Executivo
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
                  <Box textAlign="center" p={2} bgcolor="primary.light" borderRadius={2}>
                    <Typography variant="h4" color="primary.contrastText">
                      {stats?.totalLeads || 0}
                    </Typography>
                    <Typography variant="body2" color="primary.contrastText">
                      Total de Leads
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Box textAlign="center" p={2} bgcolor="success.light" borderRadius={2}>
                    <Typography variant="h4" color="success.contrastText">
                      R$ {(stats?.totalValue || 0).toLocaleString('pt-BR')}
                    </Typography>
                    <Typography variant="body2" color="success.contrastText">
                      Valor Pipeline
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Box textAlign="center" p={2} bgcolor="warning.light" borderRadius={2}>
                    <Typography variant="h4" color="warning.contrastText">
                      {hotLeads}
                    </Typography>
                    <Typography variant="body2" color="warning.contrastText">
                      🔥 Leads Quentes
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Box textAlign="center" p={2} bgcolor="error.light" borderRadius={2}>
                    <Typography variant="h4" color="error.contrastText">
                      {highPriorityLeads}
                    </Typography>
                    <Typography variant="body2" color="error.contrastText">
                      ⚡ Alta Prioridade
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 Métricas Detalhadas
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Taxa de Conversão
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={stats?.conversionRate || 0}
                    sx={{ height: 12, borderRadius: 6, mb: 1 }}
                    color="success"
                  />
                  <Typography variant="body2" color="text.secondary">
                    {(stats?.conversionRate || 0).toFixed(1)}%
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Crescimento Mensal
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.abs(stats?.monthlyGrowth || 0)}
                    sx={{ height: 12, borderRadius: 6, mb: 1 }}
                    color={stats?.monthlyGrowth && stats.monthlyGrowth > 0 ? 'success' : 'warning'}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {stats?.monthlyGrowth ? (stats.monthlyGrowth > 0 ? '+' : '') + stats.monthlyGrowth.toFixed(1) : '0'}%
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}