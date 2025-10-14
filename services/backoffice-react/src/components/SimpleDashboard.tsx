import { useState, useEffect } from 'react'
import { Box, Grid, Card, CardContent, Typography, CircularProgress, Alert } from '@mui/material'
import { People, AttachMoney, TrendingUp, Schedule } from '@mui/icons-material'

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
  company?: string
  source?: string
  lead_value?: number
  created_at: string
}

export function SimpleDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = localStorage.getItem('auth_token')
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

      console.log('Fetching data with token:', token?.substring(0, 20) + '...')

      // Fetch stats
      const statsResponse = await fetch('http://localhost:3000/backoffice/stats', { headers })
      console.log('Stats response status:', statsResponse.status)
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        console.log('Stats data:', statsData)
        setStats(statsData)
      } else {
        throw new Error(`Stats API error: ${statsResponse.status}`)
      }

      // Fetch leads
      const leadsResponse = await fetch('http://localhost:3000/backoffice/leads', { headers })
      console.log('Leads response status:', leadsResponse.status)
      
      if (leadsResponse.ok) {
        const leadsData = await leadsResponse.json()
        console.log('Leads data:', leadsData)
        setLeads(leadsData)
      } else {
        throw new Error(`Leads API error: ${leadsResponse.status}`)
      }

    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Carregando dados...</Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" action={
        <button onClick={fetchData}>Tentar Novamente</button>
      }>
        Erro ao carregar dados: {error}
      </Alert>
    )
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard CRM - Dados Reais
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Total de Leads
                  </Typography>
                  <Typography variant="h4" component="div">
                    {stats?.totalLeads || 0}
                  </Typography>
                  {stats?.monthlyGrowth !== undefined && (
                    <Typography variant="body2" color="success.main">
                      +{stats.monthlyGrowth.toFixed(1)}% este mês
                    </Typography>
                  )}
                </Box>
                <People sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Valor Pipeline
                  </Typography>
                  <Typography variant="h4" component="div">
                    R$ {(stats?.totalValue || 0).toLocaleString('pt-BR')}
                  </Typography>
                </Box>
                <AttachMoney sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Taxa Conversão
                  </Typography>
                  <Typography variant="h4" component="div">
                    {(stats?.conversionRate || 0).toFixed(1)}%
                  </Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 40, color: 'error.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Leads Hoje
                  </Typography>
                  <Typography variant="h4" component="div">
                    {stats?.todayLeads || 0}
                  </Typography>
                </Box>
                <Schedule sx={{ fontSize: 40, color: 'info.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Leads Recentes
              </Typography>
              {leads.length > 0 ? (
                <Box>
                  {leads.slice(0, 5).map((lead) => (
                    <Box key={lead.id} sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {lead.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {lead.email}
                      </Typography>
                      {lead.company && (
                        <Typography variant="caption" color="text.secondary">
                          {lead.company}
                        </Typography>
                      )}
                      <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                        <Typography variant="caption">
                          {lead.source || 'N/A'}
                        </Typography>
                        <Typography variant="caption">
                          {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography color="text.secondary">
                  Nenhum lead encontrado
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Resumo por Fonte
              </Typography>
              {(() => {
                const sourceCount = leads.reduce((acc: any, lead) => {
                  const source = lead.source || 'unknown'
                  acc[source] = (acc[source] || 0) + 1
                  return acc
                }, {})
                
                return Object.entries(sourceCount).map(([source, count]: [string, any]) => (
                  <Box key={source} display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {source}
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {count}
                    </Typography>
                  </Box>
                ))
              })()}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}