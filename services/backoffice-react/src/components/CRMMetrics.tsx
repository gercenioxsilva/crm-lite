import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider
} from '@mui/material'
import {
  TrendingUp,
  TrendingDown,
  People,
  AttachMoney,
  Schedule,
  Star,
  Business
} from '@mui/icons-material'
import { apiService } from '../services/api'

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
  color?: string
}

function MetricCard({ title, value, change, icon, color = 'primary' }: MetricCardProps) {
  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="text.secondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
            {change !== undefined && (
              <Box display="flex" alignItems="center" mt={1}>
                {change >= 0 ? (
                  <TrendingUp color="success" fontSize="small" />
                ) : (
                  <TrendingDown color="error" fontSize="small" />
                )}
                <Typography
                  variant="body2"
                  color={change >= 0 ? 'success.main' : 'error.main'}
                  sx={{ ml: 0.5 }}
                >
                  {Math.abs(change)}%
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar sx={{ bgcolor: `${color}.main`, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  )
}

export function CRMMetrics() {
  const { data: stats } = useQuery({
    queryKey: ['crm-stats'],
    queryFn: () => apiService.getStats()
  })

  const { data: leads } = useQuery({
    queryKey: ['leads'],
    queryFn: () => apiService.getLeads()
  })

  // Calculate metrics from leads data
  const totalValue = leads?.reduce((sum: number, lead: any) => sum + (lead.lead_value || 0), 0) || 0
  const highPriorityLeads = leads?.filter((lead: any) => lead.priority === 'high' || lead.priority === 'urgent').length || 0
  const hotLeads = leads?.filter((lead: any) => lead.temperature === 'hot').length || 0
  const followUpsToday = leads?.filter((lead: any) => {
    if (!lead.next_follow_up) return false
    const today = new Date().toDateString()
    const followUpDate = new Date(lead.next_follow_up).toDateString()
    return today === followUpDate
  }).length || 0

  // Top leads by value
  const topLeads = leads?.filter((lead: any) => lead.lead_value > 0)
    .sort((a: any, b: any) => (b.lead_value || 0) - (a.lead_value || 0))
    .slice(0, 5) || []

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Métricas do CRM
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total de Leads"
            value={stats?.totalLeads || leads?.length || 0}
            change={stats?.monthlyGrowth}
            icon={<People />}
            color="primary"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Valor Total Pipeline"
            value={`R$ ${totalValue.toLocaleString('pt-BR')}`}
            change={15.2}
            icon={<AttachMoney />}
            color="success"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Leads Prioritários"
            value={highPriorityLeads}
            icon={<Star />}
            color="warning"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Follow-ups Hoje"
            value={followUpsToday}
            icon={<Schedule />}
            color="info"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Distribuição por Temperatura
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2">Quente</Typography>
                  <Typography variant="body2">{hotLeads}</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={(hotLeads / (leads?.length || 1)) * 100} 
                  color="error"
                  sx={{ mb: 2 }}
                />
                
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2">Morno</Typography>
                  <Typography variant="body2">
                    {leads?.filter((l: any) => l.temperature === 'warm').length || 0}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={((leads?.filter((l: any) => l.temperature === 'warm').length || 0) / (leads?.length || 1)) * 100} 
                  color="warning"
                  sx={{ mb: 2 }}
                />
                
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2">Frio</Typography>
                  <Typography variant="body2">
                    {leads?.filter((l: any) => l.temperature === 'cold').length || 0}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={((leads?.filter((l: any) => l.temperature === 'cold').length || 0) / (leads?.length || 1)) * 100} 
                  color="info"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top 5 Leads por Valor
              </Typography>
              <List>
                {topLeads.map((lead: any, index: number) => (
                  <Box key={lead.id}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {lead.name.charAt(0).toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle2">
                              {lead.name}
                            </Typography>
                            <Chip
                              label={`R$ ${lead.lead_value.toLocaleString('pt-BR')}`}
                              color="primary"
                              size="small"
                            />
                          </Box>
                        }
                        secondary={
                          <Box display="flex" alignItems="center" gap={1}>
                            {lead.company && (
                              <>
                                <Business fontSize="small" />
                                <Typography variant="caption">
                                  {lead.company}
                                </Typography>
                              </>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < topLeads.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
              
              {topLeads.length === 0 && (
                <Typography color="text.secondary" textAlign="center" py={2}>
                  Nenhum lead com valor definido
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}