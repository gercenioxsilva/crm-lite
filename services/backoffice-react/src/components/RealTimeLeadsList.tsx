import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box, Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Menu, MenuItem, TextField, InputAdornment,
  FormControl, InputLabel, Select, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, Avatar
} from '@mui/material'
import { MoreVert, Search, Add, Business, Person, AttachMoney, Phone, Email } from '@mui/icons-material'
import { apiService } from '../services/api'

interface Lead {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  job_title?: string
  lead_value?: number
  priority: 'low' | 'medium' | 'high' | 'urgent'
  temperature: 'cold' | 'warm' | 'hot'
  stage_name: string
  source?: string
  created_at: string
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

const priorityLabels = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente'
}

const temperatureLabels = {
  cold: 'Frio',
  warm: 'Morno',
  hot: 'Quente'
}

export function RealTimeLeadsList() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [detailsDialog, setDetailsDialog] = useState(false)
  const [qualifyDialog, setQualifyDialog] = useState(false)
  const [qualification, setQualification] = useState({
    priority: '',
    temperature: '',
    lead_value: '',
    notes: ''
  })

  const queryClient = useQueryClient()

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ['leads'],
    queryFn: () => apiService.getLeads(),
    refetchInterval: 15000 // Atualiza a cada 15 segundos
  })

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) =>
      apiService.updateLead(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['pipeline'] })
      setQualifyDialog(false)
    }
  })

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, lead: Lead) => {
    event.stopPropagation()
    setAnchorEl(event.currentTarget)
    setSelectedLead(lead)
  }

  const handleQualifyLead = () => {
    if (selectedLead && qualification.priority && qualification.temperature) {
      updateLeadMutation.mutate({
        id: selectedLead.id,
        data: {
          priority: qualification.priority,
          temperature: qualification.temperature,
          lead_value: qualification.lead_value ? Number(qualification.lead_value) : undefined,
          notes: qualification.notes
        }
      })
    }
  }

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesPriority = !priorityFilter || lead.priority === priorityFilter
    const matchesSource = !sourceFilter || lead.source === sourceFilter
    
    return matchesSearch && matchesPriority && matchesSource
  })

  const uniqueSources = [...new Set(leads.map(lead => lead.source).filter(Boolean))]

  if (isLoading) {
    return <Box>Carregando leads...</Box>
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Leads ({filteredLeads.length})
        </Typography>
        <Button variant="contained" startIcon={<Add />}>
          Novo Lead
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={2} flexWrap="wrap">
            <TextField
              size="small"
              placeholder="Buscar leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 250 }}
            />
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Prioridade</InputLabel>
              <Select
                value={priorityFilter}
                label="Prioridade"
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="urgent">Urgente</MenuItem>
                <MenuItem value="high">Alta</MenuItem>
                <MenuItem value="medium">Média</MenuItem>
                <MenuItem value="low">Baixa</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Fonte</InputLabel>
              <Select
                value={sourceFilter}
                label="Fonte"
                onChange={(e) => setSourceFilter(e.target.value)}
              >
                <MenuItem value="">Todas</MenuItem>
                {uniqueSources.map(source => (
                  <MenuItem key={source} value={source}>{source}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      <TableContainer component={Card}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Lead</TableCell>
              <TableCell>Empresa</TableCell>
              <TableCell>Estágio</TableCell>
              <TableCell>Valor</TableCell>
              <TableCell>Prioridade</TableCell>
              <TableCell>Temperatura</TableCell>
              <TableCell>Fonte</TableCell>
              <TableCell>Criado</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLeads.map((lead) => (
              <TableRow key={lead.id} hover>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {lead.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {lead.name}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Email fontSize="small" color="disabled" />
                        <Typography variant="caption" color="text.secondary">
                          {lead.email}
                        </Typography>
                      </Box>
                      {lead.phone && (
                        <Box display="flex" alignItems="center" gap={1}>
                          <Phone fontSize="small" color="disabled" />
                          <Typography variant="caption" color="text.secondary">
                            {lead.phone}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </TableCell>
                
                <TableCell>
                  {lead.company && (
                    <Box>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Business fontSize="small" color="disabled" />
                        <Typography variant="body2">{lead.company}</Typography>
                      </Box>
                      {lead.job_title && (
                        <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                          <Person fontSize="small" color="disabled" />
                          <Typography variant="caption" color="text.secondary">
                            {lead.job_title}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}
                </TableCell>
                
                <TableCell>
                  <Chip label={lead.stage_name} size="small" variant="outlined" />
                </TableCell>
                
                <TableCell>
                  {lead.lead_value && (
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <AttachMoney fontSize="small" color="disabled" />
                      <Typography variant="body2">
                        R$ {lead.lead_value.toLocaleString('pt-BR')}
                      </Typography>
                    </Box>
                  )}
                </TableCell>
                
                <TableCell>
                  <Chip
                    label={priorityLabels[lead.priority]}
                    size="small"
                    sx={{
                      backgroundColor: priorityColors[lead.priority],
                      color: 'white'
                    }}
                  />
                </TableCell>
                
                <TableCell>
                  <Chip
                    label={temperatureLabels[lead.temperature]}
                    size="small"
                    sx={{
                      backgroundColor: temperatureColors[lead.temperature],
                      color: 'white'
                    }}
                  />
                </TableCell>
                
                <TableCell>
                  <Chip 
                    label={lead.source || 'N/A'} 
                    size="small" 
                    variant="outlined"
                    sx={{ textTransform: 'capitalize' }}
                  />
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2">
                    {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                  </Typography>
                </TableCell>
                
                <TableCell align="right">
                  <IconButton size="small" onClick={(e) => handleMenuClick(e, lead)}>
                    <MoreVert />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          setDetailsDialog(true)
          setAnchorEl(null)
        }}>
          Ver Detalhes
        </MenuItem>
        <MenuItem onClick={() => {
          setQualification({
            priority: selectedLead?.priority || '',
            temperature: selectedLead?.temperature || '',
            lead_value: selectedLead?.lead_value?.toString() || '',
            notes: ''
          })
          setQualifyDialog(true)
          setAnchorEl(null)
        }}>
          Qualificar Lead
        </MenuItem>
        <MenuItem onClick={() => {
          console.log('Adicionar atividade')
          setAnchorEl(null)
        }}>
          Adicionar Atividade
        </MenuItem>
      </Menu>

      {/* Dialog de Detalhes */}
      <Dialog open={detailsDialog} onClose={() => setDetailsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Detalhes do Lead</DialogTitle>
        <DialogContent>
          {selectedLead && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Nome" value={selectedLead.name} InputProps={{ readOnly: true }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Email" value={selectedLead.email} InputProps={{ readOnly: true }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Empresa" value={selectedLead.company || ''} InputProps={{ readOnly: true }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Cargo" value={selectedLead.job_title || ''} InputProps={{ readOnly: true }} />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialog(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Qualificação */}
      <Dialog open={qualifyDialog} onClose={() => setQualifyDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Qualificar Lead - {selectedLead?.name}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Prioridade</InputLabel>
                <Select
                  value={qualification.priority}
                  label="Prioridade"
                  onChange={(e) => setQualification({ ...qualification, priority: e.target.value })}
                >
                  <MenuItem value="low">Baixa</MenuItem>
                  <MenuItem value="medium">Média</MenuItem>
                  <MenuItem value="high">Alta</MenuItem>
                  <MenuItem value="urgent">Urgente</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Temperatura</InputLabel>
                <Select
                  value={qualification.temperature}
                  label="Temperatura"
                  onChange={(e) => setQualification({ ...qualification, temperature: e.target.value })}
                >
                  <MenuItem value="cold">Frio</MenuItem>
                  <MenuItem value="warm">Morno</MenuItem>
                  <MenuItem value="hot">Quente</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Valor do Lead (R$)"
                type="number"
                value={qualification.lead_value}
                onChange={(e) => setQualification({ ...qualification, lead_value: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observações"
                multiline
                rows={3}
                value={qualification.notes}
                onChange={(e) => setQualification({ ...qualification, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQualifyDialog(false)}>Cancelar</Button>
          <Button 
            onClick={handleQualifyLead}
            variant="contained"
            disabled={!qualification.priority || !qualification.temperature}
          >
            Qualificar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}