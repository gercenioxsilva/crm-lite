import { useState, useEffect } from 'react'
import {
  Box, Card, CardContent, Typography, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Select, FormControl,
  InputLabel, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Chip, Grid, Alert
} from '@mui/material'
import {
  Add, Phone, Email, VideoCall, Event, Note, CheckCircle, Cancel, Refresh
} from '@mui/icons-material'
import { apiService } from '../services/api'

interface Activity {
  id: string
  lead_id: string
  type: string
  description: string
  outcome?: string
  follow_up_required?: boolean
  next_action?: string
  duration_minutes?: number
  created_at: string
  lead_name?: string
}

interface Lead {
  id: string
  name: string
  email: string
  phone?: string
}

const outcomeOptions = [
  { value: '', label: 'Nao informar' },
  { value: 'interested', label: 'Interessado' },
  { value: 'not_interested', label: 'Nao interessado' },
  { value: 'callback', label: 'Retornar contato' },
  { value: 'meeting_scheduled', label: 'Reuniao agendada' },
  { value: 'no_answer', label: 'Sem resposta' },
  { value: 'completed', label: 'Concluido' },
  { value: 'sent', label: 'Email enviado' },
  { value: 'opened', label: 'Email aberto' },
  { value: 'clicked', label: 'Clique registrado' },
]

type ActivityErrorDialog = {
  title: string
  message: string
}

export function ActivitiesManager() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [openDialog, setOpenDialog] = useState(false)
  const [errorDialog, setErrorDialog] = useState<ActivityErrorDialog | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [newActivity, setNewActivity] = useState({
    leadId: '',
    type: 'call',
    description: '',
    outcome: '',
    follow_up_required: false,
    next_action: '',
    duration_minutes: ''
  })

  const fetchData = async () => {
    try {
      setLoading(true)
      setLoadError('')

      const [leadsData, activitiesData] = await Promise.all([
        apiService.getLeads(),
        apiService.getActivities(),
      ])

      setLeads(Array.isArray(leadsData) ? leadsData.slice(0, 100) : [])
      setActivities(Array.isArray(activitiesData) ? activitiesData : [])

    } catch (err) {
      console.error('Error fetching data:', err)
      setLoadError(err instanceof Error ? err.message : 'Erro ao carregar dados')
      setLeads([])
      setActivities([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateActivity = async () => {
    try {
      if (!newActivity.leadId || !newActivity.description) {
      setErrorDialog({
        title: 'Dados incompletos',
        message: 'Selecione um lead e adicione uma descricao para registrar a atividade.',
      })
        return
      }

      const payload = {
        leadId: newActivity.leadId,
        type: newActivity.type,
        description: newActivity.description,
        outcome: newActivity.outcome || null,
        follow_up_required: newActivity.follow_up_required,
        next_action: newActivity.next_action || null,
        duration_minutes: newActivity.duration_minutes ? parseInt(newActivity.duration_minutes) : null
      }
      
      await apiService.createActivity(payload)

      setOpenDialog(false)
      setNewActivity({
        leadId: '',
        type: 'call',
        description: '',
        outcome: '',
        follow_up_required: false,
        next_action: '',
        duration_minutes: ''
      })

      await fetchData()
    } catch (err) {
      console.error('Error creating activity:', err)
      setErrorDialog({
        title: 'Nao foi possivel criar a atividade',
        message: 'Todo mundo erra dessa vez, foi os nossos engenheiros.',
      })
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone />
      case 'email': return <Email />
      case 'meeting': return <VideoCall />
      case 'whatsapp': return <Phone />
      case 'task': return <Event />
      default: return <Note />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'call': return 'primary'
      case 'email': return 'info'
      case 'meeting': return 'success'
      case 'whatsapp': return 'secondary'
      case 'task': return 'warning'
      default: return 'default'
    }
  }

  useEffect(() => {
    fetchData()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">
          📋 Gestão de Atividades
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchData}
            disabled={loading}
          >
            {loading ? 'Atualizando...' : 'Atualizar'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenDialog(true)}
          >
            Nova Atividade
          </Button>
        </Box>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                📞 Ligações Hoje
              </Typography>
              <Typography variant="h4">
                {activities.filter(a => a.type === 'call' && 
                  new Date(a.created_at).toDateString() === new Date().toDateString()).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                ✉️ Emails Enviados
              </Typography>
              <Typography variant="h4">
                {activities.filter(a => a.type === 'email').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                🤝 Reuniões
              </Typography>
              <Typography variant="h4">
                {activities.filter(a => a.type === 'meeting').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                🔄 Follow-ups
              </Typography>
              <Typography variant="h4">
                {activities.filter(a => a.follow_up_required).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Activities Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Atividades Recentes
          </Typography>
          {loadError && (
            <Typography variant="body2" color="error" sx={{ mb: 2 }}>
              Falha ao carregar leads/atividades: {loadError}
            </Typography>
          )}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Lead</TableCell>
                  <TableCell>Descrição</TableCell>
                  <TableCell>Resultado</TableCell>
                  <TableCell>Duração</TableCell>
                  <TableCell>Follow-up</TableCell>
                  <TableCell>Data</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary">
                        Nenhuma atividade encontrada. Crie a primeira atividade!
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  activities.map((activity) => (
                    <TableRow key={activity.id} hover>
                      <TableCell>
                        <Chip
                          icon={getActivityIcon(activity.type)}
                          label={activity.type}
                          color={getActivityColor(activity.type) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {activity.lead_name || 'Lead não encontrado'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {activity.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {activity.outcome || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {activity.duration_minutes ? `${activity.duration_minutes}min` : '-'}
                      </TableCell>
                      <TableCell>
                        {activity.follow_up_required ? (
                          <Box>
                            <Chip
                              icon={<CheckCircle />}
                              label="Sim"
                              color="warning"
                              size="small"
                            />
                            {activity.next_action && (
                              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                {activity.next_action}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Chip
                            icon={<Cancel />}
                            label="Não"
                            color="default"
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(activity.created_at).toLocaleDateString('pt-BR')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(activity.created_at).toLocaleTimeString('pt-BR')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Create Activity Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>📋 Nova Atividade</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Lead</InputLabel>
                <Select
                  label="Lead"
                  value={newActivity.leadId}
                  onChange={(e) => setNewActivity({ ...newActivity, leadId: e.target.value })}
                >
                  {leads.length === 0 && (
                    <MenuItem value="" disabled>
                      {loading ? 'Carregando leads...' : 'Nenhum lead disponivel'}
                    </MenuItem>
                  )}
                  {leads.map((lead) => (
                    <MenuItem key={lead.id} value={lead.id}>
                      {lead.name} - {lead.email}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Atividade</InputLabel>
                <Select
                  label="Tipo de Atividade"
                  value={newActivity.type}
                  onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value })}
                >
                  <MenuItem value="call">📞 Ligação</MenuItem>
                  <MenuItem value="email">✉️ Email</MenuItem>
                  <MenuItem value="meeting">🤝 Reunião</MenuItem>
                  <MenuItem value="whatsapp">💬 WhatsApp</MenuItem>
                  <MenuItem value="task">📋 Tarefa</MenuItem>
                  <MenuItem value="note">📝 Anotação</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrição da Atividade"
                multiline
                rows={3}
                value={newActivity.description}
                onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Resultado</InputLabel>
                <Select
                  label="Resultado"
                  value={newActivity.outcome}
                  onChange={(e) => setNewActivity({ ...newActivity, outcome: e.target.value })}
                >
                  {outcomeOptions.map((option) => (
                    <MenuItem key={option.value || 'empty'} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Duração (minutos)"
                type="number"
                value={newActivity.duration_minutes}
                onChange={(e) => setNewActivity({ ...newActivity, duration_minutes: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Requer Follow-up?</InputLabel>
                <Select
                  label="Requer Follow-up?"
                  value={newActivity.follow_up_required ? 'true' : 'false'}
                  onChange={(e) => setNewActivity({ ...newActivity, follow_up_required: e.target.value === 'true' })}
                >
                  <MenuItem value="false">❌ Não</MenuItem>
                  <MenuItem value="true">✅ Sim</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {newActivity.follow_up_required && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Próxima Ação"
                  value={newActivity.next_action}
                  onChange={(e) => setNewActivity({ ...newActivity, next_action: e.target.value })}
                  placeholder="Ex: Ligar em 3 dias, Enviar proposta, Agendar reunião..."
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button 
            onClick={handleCreateActivity} 
            variant="contained"
            disabled={!newActivity.leadId || !newActivity.description}
          >
            ✅ Criar Atividade
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(errorDialog)} onClose={() => setErrorDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{errorDialog?.title}</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorDialog?.message || 'Todo mundo erra dessa vez, foi os nossos engenheiros.'}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setErrorDialog(null)} variant="contained">
            Entendi
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
