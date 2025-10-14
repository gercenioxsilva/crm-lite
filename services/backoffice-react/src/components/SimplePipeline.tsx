import { useState, useEffect } from 'react'
import { Box, Card, CardContent, Typography, Chip, CircularProgress, Alert } from '@mui/material'
import { Business, Person, AttachMoney } from '@mui/icons-material'

interface Lead {
  id: string
  name: string
  email: string
  company?: string
  job_title?: string
  lead_value?: number
  priority: string
  temperature: string
}

interface Stage {
  id: string
  name: string
  order_no: number
  stage_color: string
  leads: Lead[]
}

const priorityColors: any = {
  low: '#94a3b8',
  medium: '#3b82f6',
  high: '#f59e0b',
  urgent: '#ef4444'
}

const temperatureColors: any = {
  cold: '#6b7280',
  warm: '#f59e0b',
  hot: '#ef4444'
}

export function SimplePipeline() {
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPipeline = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = localStorage.getItem('auth_token')
      const response = await fetch('http://localhost:3000/backoffice/pipeline', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('Pipeline response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('Pipeline data:', data)
        setStages(data)
      } else {
        throw new Error(`API error: ${response.status}`)
      }
    } catch (err) {
      console.error('Error fetching pipeline:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPipeline()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchPipeline, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Carregando pipeline...</Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" action={
        <button onClick={fetchPipeline}>Tentar Novamente</button>
      }>
        Erro ao carregar pipeline: {error}
      </Alert>
    )
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Pipeline de Vendas
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
        {stages.map((stage) => (
          <Box key={stage.id} sx={{ minWidth: 320, maxWidth: 320 }}>
            <Card sx={{ mb: 1, backgroundColor: stage.stage_color + '20' }}>
              <CardContent sx={{ py: 1 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="h6" sx={{ color: stage.stage_color }}>
                    {stage.name}
                  </Typography>
                  <Chip 
                    label={stage.leads?.length || 0} 
                    size="small" 
                    sx={{ backgroundColor: stage.stage_color, color: 'white' }}
                  />
                </Box>
              </CardContent>
            </Card>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 600, overflowY: 'auto' }}>
              {stage.leads?.map((lead) => (
                <Card 
                  key={lead.id} 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { boxShadow: 3 },
                    borderLeft: `4px solid ${priorityColors[lead.priority] || '#94a3b8'}`
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {lead.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {lead.email}
                    </Typography>
                    
                    {lead.company && (
                      <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                        <Business fontSize="small" color="disabled" />
                        <Typography variant="caption" color="text.secondary">
                          {lead.company}
                        </Typography>
                      </Box>
                    )}

                    {lead.job_title && (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Person fontSize="small" color="disabled" />
                        <Typography variant="caption" color="text.secondary">
                          {lead.job_title}
                        </Typography>
                      </Box>
                    )}

                    {lead.lead_value && (
                      <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                        <AttachMoney fontSize="small" color="disabled" />
                        <Typography variant="caption" color="text.secondary">
                          R$ {lead.lead_value.toLocaleString('pt-BR')}
                        </Typography>
                      </Box>
                    )}

                    <Box display="flex" gap={0.5} mt={1} flexWrap="wrap">
                      <Chip 
                        label={lead.priority} 
                        size="small" 
                        sx={{ 
                          backgroundColor: priorityColors[lead.priority] || '#94a3b8',
                          color: 'white',
                          fontSize: '0.7rem'
                        }}
                      />
                      <Chip 
                        label={lead.temperature} 
                        size="small" 
                        sx={{ 
                          backgroundColor: temperatureColors[lead.temperature] || '#6b7280',
                          color: 'white',
                          fontSize: '0.7rem'
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              )) || []}
              
              {(!stage.leads || stage.leads.length === 0) && (
                <Box textAlign="center" py={2}>
                  <Typography variant="body2" color="text.secondary">
                    Nenhum lead neste estágio
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        ))}
      </Box>

      {stages.length === 0 && !loading && (
        <Box textAlign="center" py={4}>
          <Typography color="text.secondary">
            Nenhum estágio encontrado
          </Typography>
        </Box>
      )}
    </Box>
  )
}