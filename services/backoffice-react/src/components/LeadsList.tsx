import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Button,
  Avatar
} from '@mui/material'
import {
  MoreVert,
  Search,
  Add,
  Business,
  Person,
  AttachMoney,
  Schedule
} from '@mui/icons-material'
import { LeadFormDialog } from './LeadFormDialog'
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
  created_at: string
  source?: string
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

export function LeadsList() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [leadFormOpen, setLeadFormOpen] = useState(false)
  const [leadFormMode, setLeadFormMode] = useState<'create' | 'edit'>('create')
  const [searchTerm, setSearchTerm] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [stageFilter, setStageFilter] = useState('')

  const { data: leads, isLoading } = useQuery<Lead[]>({
    queryKey: ['leads'],
    queryFn: () => apiService.getLeads()
  })

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, lead: Lead) => {
    event.stopPropagation()
    setAnchorEl(event.currentTarget)
    setSelectedLead(lead)
  }

  const filteredLeads = leads?.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesPriority = !priorityFilter || lead.priority === priorityFilter
    const matchesStage = !stageFilter || lead.stage_name === stageFilter
    
    return matchesSearch && matchesPriority && matchesStage
  })

  const uniqueStages = [...new Set(leads?.map(lead => lead.stage_name) || [])]

  if (isLoading) {
    return <Box>Carregando leads...</Box>
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">
          Leads ({filteredLeads?.length || 0})
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
            
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Estágio</InputLabel>
              <Select
                value={stageFilter}
                label="Estágio"
                onChange={(e) => setStageFilter(e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                {uniqueStages.map(stage => (
                  <MenuItem key={stage} value={stage}>{stage}</MenuItem>
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
              <TableCell>Responsável</TableCell>
              <TableCell>Próximo Follow-up</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLeads?.map((lead) => (
              <TableRow key={lead.id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {lead.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {lead.email}
                    </Typography>
                    {lead.job_title && (
                      <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                        <Person fontSize="small" color="disabled" />
                        <Typography variant="caption" color="text.secondary">
                          {lead.job_title}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </TableCell>
                
                <TableCell>
                  {lead.company && (
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Business fontSize="small" color="disabled" />
                      <Typography variant="body2">
                        {lead.company}
                      </Typography>
                    </Box>
                  )}
                </TableCell>
                
                <TableCell>
                  <Chip
                    label={lead.stage_name}
                    size="small"
                    variant="outlined"
                  />
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
                  {lead.assigned_to && (
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar sx={{ width: 24, height: 24, fontSize: '0.8rem' }}>
                        {lead.assigned_to.charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography variant="body2">
                        {lead.assigned_to.split('@')[0]}
                      </Typography>
                    </Box>
                  )}
                </TableCell>
                
                <TableCell>
                  {lead.next_follow_up && (
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Schedule fontSize="small" color="disabled" />
                      <Typography variant="body2">
                        {new Date(lead.next_follow_up).toLocaleDateString('pt-BR')}
                      </Typography>
                    </Box>
                  )}
                </TableCell>
                
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuClick(e, lead)}
                  >
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
          setLeadFormMode('edit')
          setLeadFormOpen(true)
          setAnchorEl(null)
        }}>
          Editar Lead
        </MenuItem>
        <MenuItem onClick={() => {
          console.log('View details')
          setAnchorEl(null)
        }}>
          Ver Detalhes
        </MenuItem>
        <MenuItem onClick={() => {
          console.log('Add activity')
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

      <LeadFormDialog
        open={leadFormOpen}
        onClose={() => {
          setLeadFormOpen(false)
          setSelectedLead(null)
        }}
        lead={selectedLead}
        mode={leadFormMode}
      />
    </Box>
  )
}