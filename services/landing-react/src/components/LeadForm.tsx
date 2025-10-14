import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Box, 
  Button, 
  TextField, 
  FormControlLabel, 
  Checkbox, 
  Grid, 
  Stepper, 
  Step, 
  StepLabel,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material'
import { GoogleSignIn } from './GoogleSignIn'
import { api } from '../services/api'
import { isValidCPF, isValidPhone, isValidCEP, onlyDigits } from '../utils/validation'

const step1Schema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  cpf: z.string().optional().refine((val) => !val || isValidCPF(val), 'CPF inválido'),
  phone: z.string().optional().refine((val) => !val || isValidPhone(val), 'Celular inválido'),
  birthDate: z.string().optional(),
})

const step2Schema = z.object({
  leadValue: z.number().optional(),
  expectedCloseDate: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  cep: z.string().optional().refine((val) => !val || isValidCEP(val), 'CEP inválido'),
  addressLine: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  monthlyIncome: z.number().optional(),
  termsAccepted: z.boolean().refine((val) => val, 'Você deve aceitar os termos'),
  consentLgpd: z.boolean().refine((val) => val, 'Você deve autorizar o tratamento de dados'),
})

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'GOOGLE_CLIENT_ID_REPLACE'

const steps = ['Dados Pessoais', 'Informações Comerciais']

export function LeadForm() {
  const [activeStep, setActiveStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  const step1Form = useForm({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      name: '',
      email: '',
      company: '',
      jobTitle: '',
      cpf: '',
      phone: '',
      birthDate: '',
    }
  })

  const step2Form = useForm({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      leadValue: undefined,
      expectedCloseDate: '',
      priority: 'medium' as const,
      cep: '',
      addressLine: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      monthlyIncome: undefined,
      termsAccepted: false,
      consentLgpd: false,
    }
  })

  const handleNext = async () => {
    if (activeStep === 0) {
      const isValid = await step1Form.trigger()
      if (isValid) {
        setActiveStep(1)
      }
    }
  }

  const handleBack = () => {
    setActiveStep(0)
  }

  const handleStep2Submit = async (data: any) => {
    setIsSubmitting(true)
    setResult(null)

    const step1Data = step1Form.getValues()
    const formData = {
      ...step1Data,
      ...data,
      cpf: step1Data.cpf ? onlyDigits(step1Data.cpf) : undefined,
      phone: step1Data.phone ? onlyDigits(step1Data.phone) : undefined,
      cep: data.cep ? onlyDigits(data.cep) : undefined,
      state: data.state?.toUpperCase() || undefined,
      source: 'landing'
    }

    try {
      const response = await api.createLead(formData)
      setResult({
        type: response.success ? 'success' : 'error',
        message: response.success ? 'Cadastro enviado com sucesso!' : response.error || 'Erro desconhecido'
      })
    } catch (error) {
      setResult({ type: 'error', message: 'Erro de conexão' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSignIn = async (credential: string) => {
    setIsSubmitting(true)
    setResult(null)

    try {
      const response = await api.createGoogleLead(credential)
      setResult({
        type: response.success ? 'success' : 'error',
        message: response.success ? 'Inscrição com Google criada!' : response.error || 'Erro desconhecido'
      })
    } catch (error) {
      setResult({ type: 'error', message: 'Erro de conexão' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    step1Form.reset()
    step2Form.reset()
    setActiveStep(0)
    setResult(null)
  }

  return (
    <Box>
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {activeStep === 0 && (
        <Box component="form" onSubmit={step1Form.handleSubmit(handleNext)}>
          <GoogleSignIn onSuccess={handleGoogleSignIn} clientId={GOOGLE_CLIENT_ID} />
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Controller
                name="name"
                control={step1Form.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Nome completo"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Controller
                name="email"
                control={step1Form.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="email"
                    label="E-mail"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Controller
                name="company"
                control={step1Form.control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Empresa"
                    placeholder="Nome da empresa"
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Controller
                name="jobTitle"
                control={step1Form.control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Cargo"
                    placeholder="Seu cargo na empresa"
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Controller
                name="cpf"
                control={step1Form.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="CPF"
                    placeholder="Somente números"
                    inputProps={{ maxLength: 11 }}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Controller
                name="phone"
                control={step1Form.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Celular"
                    placeholder="Ex.: 5599999999999"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Controller
                name="birthDate"
                control={step1Form.control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="date"
                    label="Data de Nascimento"
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />
            </Grid>
          </Grid>
          
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 3 }}>
            <Button onClick={resetForm}>Limpar</Button>
            <Button type="submit" variant="contained">Continuar</Button>
          </Box>
        </Box>
      )}

      {activeStep === 1 && (
        <Box component="form" onSubmit={step2Form.handleSubmit(handleStep2Submit)}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="leadValue"
                control={step2Form.control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="number"
                    label="Valor estimado do negócio (R$)"
                    placeholder="Ex: 50000"
                    inputProps={{ min: 0, step: 0.01 }}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Controller
                name="expectedCloseDate"
                control={step2Form.control}
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
            
            <Grid item xs={12} sm={4}>
              <Controller
                name="cep"
                control={step2Form.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="CEP"
                    placeholder="Somente números"
                    inputProps={{ maxLength: 8 }}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={8}>
              <Controller
                name="addressLine"
                control={step2Form.control}
                render={({ field }) => (
                  <TextField {...field} fullWidth label="Logradouro" />
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Controller
                name="number"
                control={step2Form.control}
                render={({ field }) => (
                  <TextField {...field} fullWidth label="Número" />
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={8}>
              <Controller
                name="complement"
                control={step2Form.control}
                render={({ field }) => (
                  <TextField {...field} fullWidth label="Complemento" />
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Controller
                name="neighborhood"
                control={step2Form.control}
                render={({ field }) => (
                  <TextField {...field} fullWidth label="Bairro" />
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Controller
                name="city"
                control={step2Form.control}
                render={({ field }) => (
                  <TextField {...field} fullWidth label="Cidade" />
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={2}>
              <Controller
                name="state"
                control={step2Form.control}
                render={({ field }) => (
                  <TextField 
                    {...field} 
                    fullWidth 
                    label="UF" 
                    placeholder="UF"
                    inputProps={{ maxLength: 2 }}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Controller
                name="monthlyIncome"
                control={step2Form.control}
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
            
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Endereço (opcional)
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <Controller
                name="termsAccepted"
                control={step2Form.control}
                render={({ field, fieldState }) => (
                  <Box>
                    <FormControlLabel
                      control={<Checkbox {...field} checked={field.value} />}
                      label="Aceito os termos e condições"
                    />
                    {fieldState.error && (
                      <Typography variant="caption" color="error" display="block">
                        {fieldState.error.message}
                      </Typography>
                    )}
                  </Box>
                )}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Controller
                name="consentLgpd"
                control={step2Form.control}
                render={({ field, fieldState }) => (
                  <Box>
                    <FormControlLabel
                      control={<Checkbox {...field} checked={field.value} />}
                      label="Autorizo o tratamento de dados (LGPD)"
                    />
                    {fieldState.error && (
                      <Typography variant="caption" color="error" display="block">
                        {fieldState.error.message}
                      </Typography>
                    )}
                  </Box>
                )}
              />
            </Grid>
          </Grid>
          
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 3 }}>
            <Button onClick={handleBack}>Voltar</Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
            >
              {isSubmitting ? 'Cadastrando...' : 'Cadastrar'}
            </Button>
          </Box>
          
          {result && (
            <Alert severity={result.type} sx={{ mt: 2 }}>
              {result.message}
            </Alert>
          )}
        </Box>
      )}
      
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        Suas informações são protegidas conforme LGPD.
      </Typography>
    </Box>
  )
}