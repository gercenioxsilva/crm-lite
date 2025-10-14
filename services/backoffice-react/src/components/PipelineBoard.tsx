import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  Grid,
  Fab
} from '@mui/material'
import { MoreVert, Person, Business, AttachMoney, Schedule, Add } from '@mui/icons-material'
import { LeadFormDialog } from './LeadFormDialog'
import { ActivityDialog } from './ActivityDialog'
import { apiService } from '../services/api'

interface Lead {
  id: string
  name: string
  email: string
  company?: string
  job_title?: string
  lead_value?: number
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigned_to?: string
  stage_name: string
  temperature: 'cold' | 'warm' | 'hot'
  next_follow_up?: string
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

export function PipelineBoard() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [leadFormOpen, setLeadFormOpen] = useState(false)
  const [leadFormMode, setLeadFormMode] = useState<'create' | 'edit'>('create')
  const [activityDialogOpen, setActivityDialogOpen] = useState(false)


  const { data: stages, isLoading } = useQuery<Stage[]>({
    queryKey: ['pipeline-board'],
    queryFn: () => apiService.getPipeline()
  })



  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead)
  }

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, lead: Lead) => {
    event.stopPropagation()
    setAnchorEl(event.currentTarget)
    setSelectedLead(lead)
  }



  if (isLoading) {
    return <Box>Carregando pipeline...</Box>
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">
          Pipeline de Vendas
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setLeadFormMode('create')
            setLeadFormOpen(true)
          }}
        >
          Novo Lead
        </Button>
      </Box>
      
      <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
        {stages?.map((stage) => (
          <Box key={stage.id} sx={{ minWidth: 300, maxWidth: 300 }}>
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
                  onClick={() => handleLeadClick(lead)}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box flex={1}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {lead.name}
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

                        {lead.assigned_to && (
                          <Box display="flex" alignItems="center" gap={0.5} mt={1}>
                            <Avatar sx={{ width: 20, height: 20, fontSize: '0.7rem' }}>
                              {lead.assigned_to.charAt(0).toUpperCase()}
                            </Avatar>
                            <Typography variant="caption" color="text.secondary">
                              {lead.assigned_to.split('@')[0]}
                            </Typography>
                          </Box>
                        )}

                        {lead.next_follow_up && (
                          <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                            <Schedule fontSize="small" color="disabled" />
                            <Typography variant="caption" color="text.secondary">
                              {new Date(lead.next_follow_up).toLocaleDateString('pt-BR')}
                            </Typography>
                          </Box>
                        )}
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
          setLeadFormMode('edit')
          setLeadFormOpen(true)
          setAnchorEl(null)
        }}>
          Editar Lead
        </MenuItem>
        <MenuItem onClick={() => {
          setActivityDialogOpen(true)
          setAnchorEl(null)
        }}>
          Adicionar Atividade
        </MenuItem>
        <MenuItem onClick={() => {
          console.log('Add note')
          setAnchorEl(null)
        }}>
          Adicionar Nota
        </MenuItem>
      </Menu>

      <Dialog 
        open={Boolean(selectedLead) && !leadFormOpen} 
        onClose={() => setSelectedLead(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Detalhes do Lead: {selectedLead?.name}
        </DialogTitle>
        <DialogContent>
          {selectedLead && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nome"
                  value={selectedLead.name}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  value={selectedLead.email}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Empresa"
                  value={selectedLead.company || ''}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Cargo"
                  value={selectedLead.job_title || ''}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Valor do Lead"
                  value={selectedLead.lead_value ? `R$ ${selectedLead.lead_value.toLocaleString('pt-BR')}` : ''}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Prioridade"
                  value={selectedLead.priority}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
      </Dialog>

      <LeadFormDialog
        open={leadFormOpen}
        onClose={() => {
          setLeadFormOpen(false)
          setSelectedLead(null)
        }}
        lead={selectedLead}
        mode={leadFormMode}
      />

      <ActivityDialog
        open={activityDialogOpen}
        onClose={() => {
          setActivityDialogOpen(false)
          setSelectedLead(null)
        }}
        leadId={selectedLead?.id || ''}
        leadName={selectedLead?.name || ''}
      />

      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => {
          setLeadFormMode('create')
          setLeadFormOpen(true)
        }}
      >
        <Add />
      </Fab>
    </Box>
  )
}