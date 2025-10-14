import { useState, useEffect } from 'react'
import {
  Box, Card, CardContent, Typography, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Select, FormControl,
  InputLabel, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Chip, Grid
} from '@mui/material'
import {
  Add, Phone, Email, VideoCall, Event, Note, CheckCircle, Cancel
} from '@mui/icons-material'

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

export function ActivitiesManager() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [openDialog, setOpenDialog] = useState(false)
  const [, setLoading] = useState(false)
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
      const token = localStorage.getItem('auth_token')
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

      // Fetch leads for dropdown
      const leadsRes = await fetch('http://localhost:3000/backoffice/leads', { headers })
      if (leadsRes.ok) {
        const leadsData = await leadsRes.json()
        setLeads(leadsData.slice(0, 20)) // Limit for dropdown
      }

      // Mock activities for now (would come from API)
      setActivities([
        {
          id: '1',
          lead_id: '11111111-1111-1111-1111-111111111111',
          type: 'call',
          description: 'Ligação inicial para apresentar a solução',
          outcome: 'Interessado, solicitou proposta',
          follow_up_required: true,
          next_action: 'Enviar proposta comercial',
          duration_minutes: 15,
          created_at: new Date().toISOString(),
          lead_name: 'João Silva Santos'
        },
        {
          id: '2',
          lead_id: '22222222-2222-2222-2222-222222222222',
          type: 'email',
          description: 'Envio de material institucional',
          outcome: 'Email aberto, aguardando retorno',
          follow_up_required: true,
          next_action: 'Ligar em 2 dias',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          lead_name: 'Maria Oliveira Costa'
        },
        {
          id: '3',
          lead_id: '33333333-3333-3333-3333-333333333333',
          type: 'meeting',
          description: 'Reunião de apresentação da solução',
          outcome: 'Muito interessado, vai avaliar internamente',
          follow_up_required: true,
          next_action: 'Follow-up em 1 semana',
          duration_minutes: 45,
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          lead_name: 'Carlos Eduardo Lima'
        }
      ])

    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateActivity = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('http://localhost:3000/backoffice/activities', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          leadId: newActivity.leadId,
          type: newActivity.type,
          description: newActivity.description,
          outcome: newActivity.outcome,
          follow_up_required: newActivity.follow_up_required,
          next_action: newActivity.next_action,
          duration_minutes: parseInt(newActivity.duration_minutes) || null
        })
      })

      if (response.ok) {
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
        fetchData()
      }
    } catch (err) {
      console.error('Error creating activity:', err)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone />
      case 'email': return <Email />
      case 'meeting': return <VideoCall />
      case 'task': return <Event />
      default: return <Note />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'call': return 'primary'
      case 'email': return 'info'
      case 'meeting': return 'success'
      case 'task': return 'warning'
      default: return 'default'
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">
          📋 Gestão de Atividades
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
        >
          Nova Atividade
        </Button>
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
                {activities.map((activity) => (
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
                        {activity.lead_name}
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
                ))}
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
                  value={newActivity.leadId}
                  onChange={(e) => setNewActivity({ ...newActivity, leadId: e.target.value })}
                >
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
                  value={newActivity.type}
                  onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value })}
                >
                  <MenuItem value="call">📞 Ligação</MenuItem>
                  <MenuItem value="email">✉️ Email</MenuItem>
                  <MenuItem value="meeting">🤝 Reunião</MenuItem>
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
              <TextField
                fullWidth
                label="Resultado/Outcome"
                multiline
                rows={2}
                value={newActivity.outcome}
                onChange={(e) => setNewActivity({ ...newActivity, outcome: e.target.value })}
              />
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
          <Button onClick={handleCreateActivity} variant="contained">
            ✅ Criar Atividade
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}