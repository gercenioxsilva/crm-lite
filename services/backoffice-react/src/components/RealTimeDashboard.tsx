import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  Add,
  AttachMoney,
  Business,
  Email,
  People,
  Phone,
  Refresh,
  Schedule,
  TrendingUp,
} from '@mui/icons-material'
import { apiService } from '../services/api'

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
  lead_value?: number | string
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

const emptyStats: Stats = {
  totalLeads: 0,
  todayLeads: 0,
  conversionRate: 0,
  monthlyGrowth: 0,
  totalValue: 0,
}

function currency(value: number | string | undefined) {
  const numericValue = Number(value || 0)
  return numericValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  })
}

function statusLabel(status?: string) {
  const labels: Record<string, string> = {
    new: 'Novo',
    contacted: 'Contatado',
    qualified: 'Qualificado',
    proposal: 'Proposta',
    negotiation: 'Negociacao',
    won: 'Ganho',
    lost: 'Perdido',
  }
  return labels[status || 'new'] || status || 'Novo'
}

function priorityLabel(priority?: string) {
  const labels: Record<string, string> = {
    low: 'Baixa',
    medium: 'Media',
    high: 'Alta',
    urgent: 'Urgente',
  }
  return labels[priority || 'medium'] || priority || 'Media'
}

export function RealTimeDashboard() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [stats, setStats] = useState<Stats>(emptyStats)
  const [leads, setLeads] = useState<Lead[]>([])
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [newLead, setNewLead] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    job_title: '',
    lead_value: '',
    priority: 'medium',
  })

  const fetchData = async (silent = false) => {
    try {
      if (silent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const [statsData, leadsData, chart] = await Promise.all([
        apiService.getStats().catch(() => emptyStats),
        apiService.getLeads().catch(() => []),
        apiService.getChartData().catch(() => []),
      ])

      setStats({ ...emptyStats, ...(statsData || {}) })
      setLeads(Array.isArray(leadsData) ? leadsData : [])
      setChartData(Array.isArray(chart) ? chart : [])
    } catch (err) {
      console.error('Dashboard load error:', err)
      setError('Nao foi possivel carregar os dados do dashboard.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleCreateLead = async () => {
    try {
      await apiService.createLead({
        ...newLead,
        lead_value: parseFloat(newLead.lead_value) || 0,
      })
      setOpenDialog(false)
      setNewLead({
        name: '',
        email: '',
        phone: '',
        company: '',
        job_title: '',
        lead_value: '',
        priority: 'medium',
      })
      await fetchData(true)
    } catch (err) {
      console.error('Error creating lead:', err)
      setError('Nao foi possivel criar o lead.')
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'qualified':
      case 'won':
        return 'success'
      case 'contacted':
        return 'info'
      case 'proposal':
        return 'warning'
      case 'negotiation':
        return 'secondary'
      case 'lost':
        return 'error'
      default:
        return 'default'
    }
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'error'
      case 'high':
        return 'warning'
      case 'medium':
        return 'info'
      default:
        return 'default'
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(() => fetchData(true), 30000)
    return () => clearInterval(interval)
  }, [])

  const statusData = useMemo(() => {
    return leads.reduce<Record<string, number>>((acc, lead) => {
      const status = lead.status || 'new'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})
  }, [leads])

  const sourceData = useMemo(() => {
    return leads.reduce<Record<string, number>>((acc, lead) => {
      const source = lead.source || 'unknown'
      acc[source] = (acc[source] || 0) + 1
      return acc
    }, {})
  }, [leads])

  const hotLeads = leads.filter((lead) => lead.temperature === 'hot').length
  const qualifiedLeads = leads.filter((lead) => lead.status === 'qualified').length
  const negotiationLeads = leads.filter((lead) => lead.status === 'negotiation').length
  const avgValue = leads.length > 0 ? stats.totalValue / leads.length : 0
  const updatedAt = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const statCards = [
    {
      label: 'Total de leads',
      value: stats.totalLeads,
      helper: `${stats.monthlyGrowth.toFixed(1)}% este mes`,
      icon: People,
      color: '#8A05BE',
    },
    {
      label: 'Valor em pipeline',
      value: currency(stats.totalValue),
      helper: `Ticket medio ${currency(avgValue)}`,
      icon: AttachMoney,
      color: '#12CBC4',
    },
    {
      label: 'Conversao',
      value: `${stats.conversionRate.toFixed(1)}%`,
      helper: `${qualifiedLeads} qualificados`,
      icon: TrendingUp,
      color: '#3B82F6',
    },
    {
      label: 'Leads hoje',
      value: stats.todayLeads,
      helper: `${hotLeads} leads quentes`,
      icon: Schedule,
      color: '#F59E0B',
    },
  ]

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Carregando dashboard...</Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight={700}>
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Visao operacional de leads, pipeline e atividades comerciais.
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: { sm: 'center' } }}>
            Atualizado as {updatedAt}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            Atualizar
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpenDialog(true)}>
            Novo lead
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} action={<Button onClick={() => fetchData()}>Tentar novamente</Button>}>
          {error}
        </Alert>
      )}

      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 3, md: 4 } }}>
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Grid item xs={12} sm={6} lg={3} key={card.label}>
              <Card sx={{ height: '100%', backgroundColor: 'background.paper' }}>
                <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                    <Box minWidth={0}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {card.label}
                      </Typography>
                      <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight={700} noWrap>
                        {card.value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {card.helper}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        display: 'grid',
                        placeItems: 'center',
                        color: card.color,
                        backgroundColor: `${card.color}22`,
                        flexShrink: 0,
                      }}
                    >
                      <Icon />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )
        })}
      </Grid>

      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 3, md: 4 } }}>
        <Grid item xs={12} lg={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="h6" gutterBottom>
                Leads por periodo
              </Typography>
              <Stack spacing={2}>
                {chartData.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Sem dados de periodo para exibir.
                  </Typography>
                )}
                {chartData.map((item) => {
                  const max = Math.max(...chartData.map((entry) => entry.leads), 1)
                  return (
                    <Box key={item.name}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.75}>
                        <Typography variant="body2">{item.name}</Typography>
                        <Typography variant="body2" fontWeight={700}>{item.leads}</Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={(item.leads / max) * 100}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  )
                })}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="h6" gutterBottom>
                Resumo rapido
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <MetricBlock label="Leads quentes" value={hotLeads} color="warning.main" />
                </Grid>
                <Grid item xs={6}>
                  <MetricBlock label="Qualificados" value={qualifiedLeads} color="success.main" />
                </Grid>
                <Grid item xs={6}>
                  <MetricBlock label="Negociacao" value={negotiationLeads} color="secondary.main" />
                </Grid>
                <Grid item xs={6}>
                  <MetricBlock label="Ticket medio" value={currency(avgValue)} color="info.main" />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 3, md: 4 } }}>
        <Grid item xs={12} md={6}>
          <BreakdownCard title="Status dos leads" data={statusData} formatter={statusLabel} />
        </Grid>
        <Grid item xs={12} md={6}>
          <BreakdownCard title="Origem dos leads" data={sourceData} formatter={(value) => value === 'unknown' ? 'Nao informado' : value} />
        </Grid>
      </Grid>

      <Card>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5} mb={2}>
            <Box>
              <Typography variant="h6">Leads recentes</Typography>
              <Typography variant="body2" color="text.secondary">
                Ultimos cadastros recebidos no CRM.
              </Typography>
            </Box>
          </Stack>

          {isMobile ? (
            <Stack spacing={1.5}>
              {leads.slice(0, 10).map((lead) => (
                <LeadMobileCard key={lead.id} lead={lead} getStatusColor={getStatusColor} getPriorityColor={getPriorityColor} />
              ))}
              {leads.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Nenhum lead encontrado.
                </Typography>
              )}
            </Stack>
          ) : (
            <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
              <Table size="medium">
                <TableHead>
                  <TableRow>
                    <TableCell>Lead</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Empresa</TableCell>
                    <TableCell>Valor</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Prioridade</TableCell>
                    <TableCell align="right">Acoes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leads.slice(0, 10).map((lead) => (
                    <TableRow key={lead.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {lead.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                        </Typography>
                      </TableCell>
                      <TableCell>{lead.email}</TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Business sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2">{lead.company || '-'}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700} color="success.main">
                          {currency(lead.lead_value)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={statusLabel(lead.status)} color={getStatusColor(lead.status) as any} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip label={priorityLabel(lead.priority)} color={getPriorityColor(lead.priority) as any} size="small" />
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" startIcon={<Phone />}>
                          Ligar
                        </Button>
                        <Button size="small" startIcon={<Email />}>
                          Email
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {leads.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <Typography variant="body2" color="text.secondary">
                          Nenhum lead encontrado.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>Novo lead</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome completo"
                value={newLead.name}
                onChange={(event) => setNewLead({ ...newLead, name: event.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={newLead.email}
                onChange={(event) => setNewLead({ ...newLead, email: event.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Telefone"
                value={newLead.phone}
                onChange={(event) => setNewLead({ ...newLead, phone: event.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Empresa"
                value={newLead.company}
                onChange={(event) => setNewLead({ ...newLead, company: event.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Cargo"
                value={newLead.job_title}
                onChange={(event) => setNewLead({ ...newLead, job_title: event.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Valor do lead"
                type="number"
                value={newLead.lead_value}
                onChange={(event) => setNewLead({ ...newLead, lead_value: event.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Prioridade</InputLabel>
                <Select
                  label="Prioridade"
                  value={newLead.priority}
                  onChange={(event) => setNewLead({ ...newLead, priority: event.target.value })}
                >
                  <MenuItem value="low">Baixa</MenuItem>
                  <MenuItem value="medium">Media</MenuItem>
                  <MenuItem value="high">Alta</MenuItem>
                  <MenuItem value="urgent">Urgente</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button onClick={handleCreateLead} variant="contained">
            Criar lead
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

function MetricBlock({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.default',
        minHeight: 104,
      }}
    >
      <Typography variant="h5" fontWeight={700} color={color} noWrap>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  )
}

function BreakdownCard({
  title,
  data,
  formatter,
}: {
  title: string
  data: Record<string, number>
  formatter: (value: string) => string
}) {
  const total = Object.values(data).reduce((sum, value) => sum + value, 0)

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Stack spacing={2}>
          {Object.entries(data).length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Sem dados para exibir.
            </Typography>
          )}
          {Object.entries(data).map(([key, count]) => (
            <Box key={key}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.75}>
                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                  {formatter(key)}
                </Typography>
                <Typography variant="body2" fontWeight={700}>{count}</Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={total > 0 ? (count / total) * 100 : 0}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  )
}

function LeadMobileCard({
  lead,
  getStatusColor,
  getPriorityColor,
}: {
  lead: Lead
  getStatusColor: (status?: string) => string
  getPriorityColor: (priority?: string) => string
}) {
  return (
    <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
      <Stack spacing={1.5}>
        <Box>
          <Typography variant="body1" fontWeight={700}>
            {lead.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
            {lead.email}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label={statusLabel(lead.status)} color={getStatusColor(lead.status) as any} size="small" />
          <Chip label={priorityLabel(lead.priority)} color={getPriorityColor(lead.priority) as any} size="small" />
        </Stack>
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Box minWidth={0}>
            <Typography variant="caption" color="text.secondary">Empresa</Typography>
            <Typography variant="body2" noWrap>{lead.company || '-'}</Typography>
          </Box>
          <Box textAlign="right">
            <Typography variant="caption" color="text.secondary">Valor</Typography>
            <Typography variant="body2" fontWeight={700} color="success.main">{currency(lead.lead_value)}</Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button size="small" startIcon={<Phone />} fullWidth>Ligar</Button>
          <Button size="small" startIcon={<Email />} fullWidth>Email</Button>
        </Stack>
      </Stack>
    </Paper>
  )
}
