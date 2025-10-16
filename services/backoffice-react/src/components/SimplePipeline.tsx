import { useState, useEffect } from 'react'
import { Box, Card, CardContent, Typography, Chip, CircularProgress, Alert, Snackbar } from '@mui/material'
import { Business, Person, AttachMoney, DragIndicator } from '@mui/icons-material'

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
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({ open: false, message: '', type: 'success' })
  const [movingLead, setMovingLead] = useState<string | null>(null)

  const fetchPipeline = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = localStorage.getItem('auth_token') || 'mock-admin-token'
      const response = await fetch('http://localhost:3000/backoffice/pipeline', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
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

  const moveLeadToStage = async (leadId: string, targetStageId: string) => {
    try {
      setMovingLead(leadId)
      const token = localStorage.getItem('auth_token') || 'mock-admin-token'
      const response = await fetch(`http://localhost:3000/backoffice/leads/${leadId}/move`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ stageId: targetStageId })
      })

      if (response.ok) {
        setNotification({ open: true, message: 'Lead movido com sucesso! 🎉', type: 'success' })
        await fetchPipeline() // Refresh pipeline
      } else {
        throw new Error('Falha ao mover lead')
      }
    } catch (err) {
      console.error('Error moving lead:', err)
      setNotification({ open: true, message: 'Erro ao mover lead ❌', type: 'error' })
    } finally {
      setMovingLead(null)
    }
  }

  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStage(stageId)
  }

  const handleDragLeave = () => {
    setDragOverStage(null)
  }

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault()
    setDragOverStage(null)
    
    if (draggedLead) {
      await moveLeadToStage(draggedLead.id, targetStageId)
      setDraggedLead(null)
    }
  }

  const handleDragEnd = () => {
    setDraggedLead(null)
    setDragOverStage(null)
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

  const totalLeads = stages.reduce((sum, stage) => sum + (stage.leads?.length || 0), 0)
  const totalValue = stages.reduce((sum, stage) => 
    sum + (stage.leads?.reduce((stageSum, lead) => stageSum + (lead.lead_value || 0), 0) || 0), 0
  )

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          📈 Pipeline de Vendas
        </Typography>
        <Box display="flex" gap={2}>
          <Chip 
            label={`${totalLeads} Leads`} 
            color="primary" 
            variant="outlined"
          />
          <Chip 
            label={`R$ ${totalValue.toLocaleString('pt-BR')}`} 
            color="success" 
            variant="outlined"
          />
        </Box>
      </Box>
      
      <Alert severity="info" sx={{ mb: 2 }}>
        👋 Arraste e solte os leads entre as colunas para mover pelo pipeline
      </Alert>
      
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

            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 1, 
                maxHeight: 600, 
                overflowY: 'auto',
                minHeight: 200,
                p: 1,
                borderRadius: 1,
                backgroundColor: dragOverStage === stage.id ? 'action.hover' : 'transparent',
                border: dragOverStage === stage.id ? '2px dashed' : '2px solid transparent',
                borderColor: dragOverStage === stage.id ? 'primary.main' : 'transparent',
                transition: 'all 0.2s ease'
              }}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {stage.leads?.map((lead) => (
                <Card 
                  key={lead.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead)}
                  onDragEnd={handleDragEnd}
                  sx={{ 
                    cursor: movingLead === lead.id ? 'wait' : 'grab',
                    '&:hover': { boxShadow: 3, transform: movingLead === lead.id ? 'none' : 'translateY(-2px)' },
                    '&:active': { cursor: 'grabbing' },
                    borderLeft: `4px solid ${priorityColors[lead.priority] || '#94a3b8'}`,
                    opacity: draggedLead?.id === lead.id ? 0.5 : movingLead === lead.id ? 0.7 : 1,
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    pointerEvents: movingLead === lead.id ? 'none' : 'auto'
                  }}
                >
                  <CardContent sx={{ p: 2, position: 'relative' }}>
                    <Box sx={{ position: 'absolute', top: 8, right: 8, opacity: 0.5 }}>
                      {movingLead === lead.id ? (
                        <CircularProgress size={16} />
                      ) : (
                        <DragIndicator fontSize="small" />
                      )}
                    </Box>
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
                <Box 
                  textAlign="center" 
                  py={4}
                  sx={{
                    border: dragOverStage === stage.id ? '2px dashed' : '1px dashed transparent',
                    borderColor: dragOverStage === stage.id ? 'primary.main' : 'grey.300',
                    borderRadius: 1,
                    backgroundColor: dragOverStage === stage.id ? 'primary.50' : 'transparent'
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {dragOverStage === stage.id ? 'Solte o lead aqui' : 'Nenhum lead neste estágio'}
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

      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification({ ...notification, open: false })}
        message={notification.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      />
    </Box>
  )
}