import { useState, useEffect } from 'react'
import {
  Box, Grid, Card, CardContent, Typography, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel, LinearProgress
} from '@mui/material'
import {
  People, AttachMoney, TrendingUp, Schedule, Add, Phone, Email,
  Business
} from '@mui/icons-material'

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
  phone?: string
  company?: string
  job_title?: string
  source?: string
  lead_value?: number
  priority?: string
  temperature?: string
  status?: string
  stage_name?: string
  assigned_to?: string
  created_at: string
}

interface ChartData {
  name: string
  leads: number
}

export function RealTimeDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [newLead, setNewLead] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    job_title: '',
    lead_value: '',
    priority: 'medium'
  })

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = localStorage.getItem('auth_token') || 'mock-admin-token'
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

      // Fetch stats with fallback
      try {
        const statsRes = await fetch('http://localhost:3000/backoffice/stats', { headers })
        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData)
        }
      } catch (statsError) {
        console.error('Stats error:', statsError)
        setStats({ totalLeads: 0, todayLeads: 0, conversionRate: 0, monthlyGrowth: 0, totalValue: 0 })
      }

      // Fetch leads with fallback
      try {
        const leadsRes = await fetch('http://localhost:3000/backoffice/leads', { headers })
        if (leadsRes.ok) {
          const leadsData = await leadsRes.json()
          setLeads(Array.isArray(leadsData) ? leadsData : [])
        }
      } catch (leadsError) {
        console.error('Leads error:', leadsError)
        setLeads([])
      }

      // Fetch chart data with fallback
      try {
        const chartRes = await fetch('http://localhost:3000/backoffice/chart', { headers })
        if (chartRes.ok) {
          const chartData = await chartRes.json()
          setChartData(Array.isArray(chartData) ? chartData : [])
        }
      } catch (chartError) {
        console.error('Chart error:', chartError)
        setChartData([])
      }

    } catch (err) {
      console.error('General error:', err)
      setError('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateLead = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('http://localhost:3000/backoffice/leads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newLead,
          lead_value: parseFloat(newLead.lead_value) || 0
        })
      })

      if (response.ok) {
        setOpenDialog(false)
        setNewLead({
          name: '',
          email: '',
          phone: '',
          company: '',
          job_title: '',
          lead_value: '',
          priority: 'medium'
        })
        fetchData()
      }
    } catch (err) {
      console.error('Error creating lead:', err)
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'qualified': return 'success'
      case 'contacted': return 'info'
      case 'proposal': return 'warning'
      case 'negotiation': return 'secondary'
      case 'won': return 'success'
      case 'lost': return 'error'
      default: return 'default'
    }
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 'error'
      case 'high': return 'warning'
      case 'medium': return 'info'
      case 'low': return 'default'
      default: return 'default'
    }
  }

  const getTemperatureIcon = (temperature?: string) => {
    switch (temperature) {
      case 'hot': return '🔥'
      case 'warm': return '🌡️'
      case 'cold': return '❄️'
      default: return '⚪'
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000) // Atualiza a cada 10 segundos
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>🔄 Carregando dados em tempo real...</Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" action={
        <Button onClick={fetchData}>🔄 Tentar Novamente</Button>
      }>
        ❌ Erro ao carregar dados: {error}
      </Alert>
    )
  }

  // Calculate additional metrics
  const sourceData = leads.reduce((acc: any, lead) => {
    const source = lead.source || 'unknown'
    acc[source] = (acc[source] || 0) + 1
    return acc
  }, {})

  const statusData = leads.reduce((acc: any, lead) => {
    const status = lead.status || 'new'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})

  const hotLeads = leads.filter(l => l.temperature === 'hot').length
  const qualifiedLeads = leads.filter(l => l.status === 'qualified').length
  const negotiationLeads = leads.filter(l => l.status === 'negotiation').length
  const avgValue = leads.length > 0 ? (stats?.totalValue || 0) / leads.length : 0

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          🚀 CRM Dashboard - Dados em Tempo Real
        </Typography>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 2 }}>
            🔄 Atualizado: {new Date().toLocaleTimeString('pt-BR')}
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenDialog(true)}
          >
            ➕ Novo Lead
          </Button>
        </Box>
      </Box>
      
      {/* Main Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="inherit" gutterBottom variant="body2">
                    Total de Leads
                  </Typography>
                  <Typography variant="h3" component="div" fontWeight="bold">
                    {stats?.totalLeads || 0}
                  </Typography>
                  {stats?.monthlyGrowth !== undefined && (
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      📈 +{stats.monthlyGrowth.toFixed(1)}% este mês
                    </Typography>
                  )}
                </Box>
                <People sx={{ fontSize: 50, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="inherit" gutterBottom variant="body2">
                    Valor Pipeline
                  </Typography>
                  <Typography variant="h3" component="div" fontWeight="bold">
                    R$ {(stats?.totalValue || 0).toLocaleString('pt-BR')}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    💰 Valor médio: R$ {avgValue.toLocaleString('pt-BR')}
                  </Typography>
                </Box>
                <AttachMoney sx={{ fontSize: 50, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="inherit" gutterBottom variant="body2">
                    Taxa Conversão
                  </Typography>
                  <Typography variant="h3" component="div" fontWeight="bold">
                    {(stats?.conversionRate || 0).toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    🎯 {qualifiedLeads} qualificados
                  </Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 50, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="inherit" gutterBottom variant="body2">
                    Leads Hoje
                  </Typography>
                  <Typography variant="h3" component="div" fontWeight="bold">
                    {stats?.todayLeads || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    🔥 {hotLeads} leads quentes
                  </Typography>
                </Box>
                <Schedule sx={{ fontSize: 50, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts and Analytics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 Leads por Dia da Semana
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
        
        <Grid item xs={12} md={6}>
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
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📈 Status dos Leads
              </Typography>
              {Object.entries(statusData).map(([status, count]: [string, any]) => (
                <Box key={status} sx={{ mb: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {status === 'new' ? '🆕 Novo' :
                       status === 'qualified' ? '✅ Qualificado' :
                       status === 'contacted' ? '📞 Contatado' :
                       status === 'proposal' ? '📋 Proposta' :
                       status === 'negotiation' ? '🤝 Negociação' :
                       status === 'won' ? '🏆 Ganho' :
                       status === 'lost' ? '❌ Perdido' : status}
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">{count}</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={leads.length > 0 ? (count / leads.length) * 100 : 0}
                    sx={{ height: 8, borderRadius: 4 }}
                    color={status === 'won' ? 'success' : 
                           status === 'qualified' ? 'primary' : 
                           status === 'lost' ? 'error' : 'info'}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🎯 Métricas Rápidas
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box textAlign="center" p={2} bgcolor="success.light" borderRadius={2}>
                    <Typography variant="h4" color="success.contrastText">
                      {hotLeads}
                    </Typography>
                    <Typography variant="body2" color="success.contrastText">
                      🔥 Leads Quentes
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center" p={2} bgcolor="info.light" borderRadius={2}>
                    <Typography variant="h4" color="info.contrastText">
                      {qualifiedLeads}
                    </Typography>
                    <Typography variant="body2" color="info.contrastText">
                      ✅ Qualificados
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center" p={2} bgcolor="warning.light" borderRadius={2}>
                    <Typography variant="h4" color="warning.contrastText">
                      {negotiationLeads}
                    </Typography>
                    <Typography variant="body2" color="warning.contrastText">
                      🤝 Negociação
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center" p={2} bgcolor="secondary.light" borderRadius={2}>
                    <Typography variant="h4" color="secondary.contrastText">
                      R$ {avgValue.toFixed(0)}
                    </Typography>
                    <Typography variant="body2" color="secondary.contrastText">
                      💰 Valor Médio
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Leads Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            👥 Leads Recentes (Dados Reais)
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Empresa</TableCell>
                  <TableCell>Valor</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Temp.</TableCell>
                  <TableCell>Prioridade</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leads.slice(0, 10).map((lead) => (
                  <TableRow key={lead.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {lead.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                      </Typography>
                    </TableCell>
                    <TableCell>{lead.email}</TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Business sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                        {lead.company || '-'}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold" color="success.main">
                        R$ {(lead.lead_value || 0).toLocaleString('pt-BR')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={lead.status || 'new'}
                        color={getStatusColor(lead.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {getTemperatureIcon(lead.temperature)} {lead.temperature || 'cold'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={lead.priority || 'medium'}
                        color={getPriorityColor(lead.priority) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Button size="small" startIcon={<Phone />} sx={{ mr: 1 }}>
                        📞
                      </Button>
                      <Button size="small" startIcon={<Email />}>
                        ✉️
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Create Lead Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>➕ Novo Lead</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome Completo"
                value={newLead.name}
                onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={newLead.email}
                onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Telefone"
                value={newLead.phone}
                onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Empresa"
                value={newLead.company}
                onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Cargo"
                value={newLead.job_title}
                onChange={(e) => setNewLead({ ...newLead, job_title: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Valor do Lead (R$)"
                type="number"
                value={newLead.lead_value}
                onChange={(e) => setNewLead({ ...newLead, lead_value: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Prioridade</InputLabel>
                <Select
                  value={newLead.priority}
                  onChange={(e) => setNewLead({ ...newLead, priority: e.target.value })}
                >
                  <MenuItem value="low">🟢 Baixa</MenuItem>
                  <MenuItem value="medium">🟡 Média</MenuItem>
                  <MenuItem value="high">🟠 Alta</MenuItem>
                  <MenuItem value="urgent">🔴 Urgente</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button onClick={handleCreateLead} variant="contained">
            ✅ Criar Lead
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}