import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Box, Card, CardContent, Typography, Chip, IconButton, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material'
import { MoreVert, Business, Person, AttachMoney } from '@mui/icons-material'
import { apiService } from '../services/api'

interface Lead {
  id: string
  name: string
  email: string
  company?: string
  job_title?: string
  lead_value?: number
  priority: 'low' | 'medium' | 'high' | 'urgent'
  temperature: 'cold' | 'warm' | 'hot'
  stage_name: string
  created_at: string
}

interface Stage {
  id: string
  name: string
  order_no: number
  stage_color: string
  leads: Lead[]
}

const priorityColors = {
  low: '#94a3b8',
  medium: '#3b82f6',
  high: '#f59e0b',
  urgent: '#ef4444'
}

const temperatureColors = {
  cold: '#6b7280',
  warm: '#f59e0b',
  hot: '#ef4444'
}

export function RealTimePipeline() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [activityDialog, setActivityDialog] = useState(false)
  const [activity, setActivity] = useState({ type: '', description: '' })
  const queryClient = useQueryClient()

  const { data: stages = [], isLoading } = useQuery<Stage[]>({
    queryKey: ['pipeline'],
    queryFn: () => apiService.getPipeline(),
    refetchInterval: 10000 // Atualiza a cada 10 segundos
  })

  // const moveLeadMutation = useMutation({
  //   mutationFn: ({ leadId, stageId }: { leadId: string, stageId: string }) =>
  //     apiService.moveLead(leadId, stageId),
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['pipeline'] })
  //     queryClient.invalidateQueries({ queryKey: ['leads'] })
  //   }
  // })

  const addActivityMutation = useMutation({
    mutationFn: (activityData: any) => apiService.createActivity(activityData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] })
      setActivityDialog(false)
      setActivity({ type: '', description: '' })
    }
  })

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, lead: Lead) => {
    event.stopPropagation()
    setAnchorEl(event.currentTarget)
    setSelectedLead(lead)
  }

  const handleAddActivity = () => {
    if (selectedLead && activity.type && activity.description) {
      addActivityMutation.mutate({
        leadId: selectedLead.id,
        type: activity.type,
        description: activity.description
      })
    }
  }

  if (isLoading) {
    return <Box>Carregando pipeline...</Box>
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Pipeline de Vendas - Tempo Real
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
                    borderLeft: `4px solid ${priorityColors[lead.priority]}`
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box flex={1}>
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
                              backgroundColor: priorityColors[lead.priority],
                              color: 'white',
                              fontSize: '0.7rem'
                            }}
                          />
                          <Chip 
                            label={lead.temperature} 
                            size="small" 
                            sx={{ 
                              backgroundColor: temperatureColors[lead.temperature],
                              color: 'white',
                              fontSize: '0.7rem'
                            }}
                          />
                        </Box>

                        <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                          Criado: {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                        </Typography>
                      </Box>

                      <IconButton 
                        size="small" 
                        onClick={(e) => handleMenuClick(e, lead)}
                      >
                        <MoreVert fontSize="small" />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        ))}
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          setActivityDialog(true)
          setAnchorEl(null)
        }}>
          Adicionar Atividade
        </MenuItem>
        <MenuItem onClick={() => {
          console.log('Qualificar lead:', selectedLead)
          setAnchorEl(null)
        }}>
          Qualificar Lead
        </MenuItem>
        <MenuItem onClick={() => {
          console.log('Ver histórico:', selectedLead)
          setAnchorEl(null)
        }}>
          Ver Histórico
        </MenuItem>
      </Menu>

      <Dialog open={activityDialog} onClose={() => setActivityDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Adicionar Atividade - {selectedLead?.name}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Tipo de Atividade"
            value={activity.type}
            onChange={(e) => setActivity({ ...activity, type: e.target.value })}
            margin="normal"
            select
            SelectProps={{ native: true }}
          >
            <option value="">Selecione...</option>
            <option value="call">Ligação</option>
            <option value="email">E-mail</option>
            <option value="meeting">Reunião</option>
            <option value="proposal">Proposta</option>
            <option value="follow-up">Follow-up</option>
          </TextField>
          
          <TextField
            fullWidth
            label="Descrição"
            value={activity.description}
            onChange={(e) => setActivity({ ...activity, description: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActivityDialog(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAddActivity}
            variant="contained"
            disabled={!activity.type || !activity.description}
          >
            Adicionar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}