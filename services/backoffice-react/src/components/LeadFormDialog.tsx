import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
  Divider,
  Alert
} from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'

const leadSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  phone: z.string().optional(),
  leadValue: z.number().optional(),
  expectedCloseDate: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assignedTo: z.string().optional(),
  source: z.string().optional(),
  monthlyIncome: z.number().optional(),
  notes: z.string().optional(),
})

type LeadFormData = z.infer<typeof leadSchema>

interface LeadFormDialogProps {
  open: boolean
  onClose: () => void
  lead?: any
  mode: 'create' | 'edit'
}

const priorityOptions = [
  { value: 'low', label: 'Baixa', color: '#94a3b8' },
  { value: 'medium', label: 'Média', color: '#3b82f6' },
  { value: 'high', label: 'Alta', color: '#f59e0b' },
  { value: 'urgent', label: 'Urgente', color: '#ef4444' }
]

const sourceOptions = [
  'Website',
  'Google Ads',
  'Facebook Ads',
  'LinkedIn',
  'Indicação',
  'Cold Call',
  'Email Marketing',
  'Evento',
  'Outros'
]

export function LeadFormDialog({ open, onClose, lead, mode }: LeadFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { control, handleSubmit, reset, formState: { errors } } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: '',
      email: '',
      company: '',
      jobTitle: '',
      phone: '',
      leadValue: undefined,
      expectedCloseDate: '',
      priority: 'medium',
      assignedTo: '',
      source: '',
      monthlyIncome: undefined,
      notes: '',
    }
  })

  useEffect(() => {
    if (lead && mode === 'edit') {
      reset({
        name: lead.name || '',
        email: lead.email || '',
        company: lead.company || '',
        jobTitle: lead.job_title || '',
        phone: lead.phone || '',
        leadValue: lead.lead_value || undefined,
        expectedCloseDate: lead.expected_close_date || '',
        priority: lead.priority || 'medium',
        assignedTo: lead.assigned_to || '',
        source: lead.source || '',
        monthlyIncome: lead.monthly_income || undefined,
        notes: lead.notes || '',
      })
    }
  }, [lead, mode, reset])

  const createLeadMutation = useMutation({
    mutationFn: async (data: LeadFormData) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/backoffice/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          ...data,
          job_title: data.jobTitle,
          lead_value: data.leadValue,
          expected_close_date: data.expectedCloseDate,
          assigned_to: data.assignedTo,
          monthly_income: data.monthlyIncome,
        })
      })
      
      if (!response.ok) {
        throw new Error('Erro ao criar lead')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['pipeline-board'] })
      onClose()
      reset()
    }
  })

  const updateLeadMutation = useMutation({
    mutationFn: async (data: LeadFormData) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/backoffice/leads/${lead.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          ...data,
          job_title: data.jobTitle,
          lead_value: data.leadValue,
          expected_close_date: data.expectedCloseDate,
          assigned_to: data.assignedTo,
          monthly_income: data.monthlyIncome,
        })
      })
      
      if (!response.ok) {
        throw new Error('Erro ao atualizar lead')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['pipeline-board'] })
      onClose()
    }
  })

  const onSubmit = async (data: LeadFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      if (mode === 'create') {
        await createLeadMutation.mutateAsync(data)
      } else {
        await updateLeadMutation.mutateAsync(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
      reset()
      setError(null)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {mode === 'create' ? 'Novo Lead' : 'Editar Lead'}
      </DialogTitle>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Typography variant="h6" gutterBottom>
            Informações Básicas
          </Typography>
          
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Nome completo"
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    required
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="email"
                    label="E-mail"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    required
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Controller
                name="company"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Empresa"
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Controller
                name="jobTitle"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Cargo"
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Telefone"
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Controller
                name="source"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Origem</InputLabel>
                    <Select {...field} label="Origem">
                      {sourceOptions.map((source) => (
                        <MenuItem key={source} value={source}>
                          {source}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />
          
          <Typography variant="h6" gutterBottom>
            Informações Comerciais
          </Typography>
          
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="leadValue"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="number"
                    label="Valor do negócio (R$)"
                    inputProps={{ min: 0, step: 0.01 }}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Controller
                name="expectedCloseDate"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="date"
                    label="Data esperada de fechamento"
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Prioridade</InputLabel>
                    <Select {...field} label="Prioridade">
                      {priorityOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Chip
                              size="small"
                              label={option.label}
                              sx={{ backgroundColor: option.color, color: 'white' }}
                            />
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Controller
                name="assignedTo"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Responsável"
                    placeholder="email@empresa.com"
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Controller
                name="monthlyIncome"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="number"
                    label="Renda mensal (R$)"
                    inputProps={{ min: 0, step: 0.01 }}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  />
                )}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    multiline
                    rows={3}
                    label="Observações"
                    placeholder="Adicione observações sobre o lead..."
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Salvando...' : mode === 'create' ? 'Criar Lead' : 'Salvar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}