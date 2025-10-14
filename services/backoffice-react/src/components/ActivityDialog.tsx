import { useState } from 'react'
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert
} from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'

const activitySchema = z.object({
  type: z.enum(['call', 'email', 'meeting', 'note', 'task']),
  description: z.string().min(5, 'Descrição deve ter pelo menos 5 caracteres'),
  outcome: z.enum(['interested', 'not_interested', 'callback', 'meeting_scheduled', 'no_answer', 'completed']).optional(),
  followUpRequired: z.boolean().default(false),
  nextAction: z.string().optional(),
  durationMinutes: z.number().optional(),
})

type ActivityFormData = z.infer<typeof activitySchema>

interface ActivityDialogProps {
  open: boolean
  onClose: () => void
  leadId: string
  leadName: string
}

const activityTypes = [
  { value: 'call', label: 'Ligação' },
  { value: 'email', label: 'E-mail' },
  { value: 'meeting', label: 'Reunião' },
  { value: 'note', label: 'Anotação' },
  { value: 'task', label: 'Tarefa' }
]

const outcomeOptions = [
  { value: 'interested', label: 'Interessado' },
  { value: 'not_interested', label: 'Não interessado' },
  { value: 'callback', label: 'Retornar ligação' },
  { value: 'meeting_scheduled', label: 'Reunião agendada' },
  { value: 'no_answer', label: 'Não atendeu' },
  { value: 'completed', label: 'Concluído' }
]

export function ActivityDialog({ open, onClose, leadId, leadName }: ActivityDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      type: 'call',
      description: '',
      outcome: undefined,
      followUpRequired: false,
      nextAction: '',
      durationMinutes: undefined,
    }
  })

  const activityType = watch('type')

  const createActivityMutation = useMutation({
    mutationFn: async (data: ActivityFormData) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/backoffice/activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          leadId,
          type: data.type,
          description: data.description,
          outcome: data.outcome,
          follow_up_required: data.followUpRequired,
          next_action: data.nextAction,
          duration_minutes: data.durationMinutes,
        })
      })
      
      if (!response.ok) {
        throw new Error('Erro ao criar atividade')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['pipeline-board'] })
      queryClient.invalidateQueries({ queryKey: ['activities', leadId] })
      onClose()
      reset()
    }
  })

  const onSubmit = async (data: ActivityFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      await createActivityMutation.mutateAsync(data)
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
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Nova Atividade - {leadName}
      </DialogTitle>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box display="flex" flexDirection="column" gap={2}>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Tipo de Atividade</InputLabel>
                  <Select {...field} label="Tipo de Atividade">
                    {activityTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />

            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  multiline
                  rows={3}
                  label="Descrição"
                  placeholder="Descreva o que foi feito ou discutido..."
                  error={!!errors.description}
                  helperText={errors.description?.message}
                  required
                />
              )}
            />

            {(activityType === 'call' || activityType === 'meeting') && (
              <Controller
                name="durationMinutes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="number"
                    label="Duração (minutos)"
                    inputProps={{ min: 1, max: 480 }}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  />
                )}
              />
            )}

            <Controller
              name="outcome"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Resultado</InputLabel>
                  <Select {...field} label="Resultado">
                    <MenuItem value="">Selecione um resultado</MenuItem>
                    {outcomeOptions.map((outcome) => (
                      <MenuItem key={outcome.value} value={outcome.value}>
                        {outcome.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />

            <Controller
              name="nextAction"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Próxima Ação"
                  placeholder="O que deve ser feito em seguida?"
                />
              )}
            />
          </Box>
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
            {isSubmitting ? 'Salvando...' : 'Salvar Atividade'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}