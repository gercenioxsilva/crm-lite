import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Grid,
  MenuItem,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material'
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined'
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined'
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined'
import SendOutlinedIcon from '@mui/icons-material/SendOutlined'
import { DynamicFormFields } from './DynamicFormFields'
import { api } from '../services/api'
import { formatCNPJ, formatPhone, isValidCNPJ, isValidPhone, onlyDigits } from '../utils/validation'

const companySchema = z.object({
  company: z.string().min(2, 'Informe a razao social ou nome fantasia'),
  cnpj: z.string().min(1, 'Informe o CNPJ').refine(isValidCNPJ, 'CNPJ invalido'),
  name: z.string().min(2, 'Informe o nome do contato'),
  jobTitle: z.string().optional(),
  email: z.string().email('E-mail invalido'),
  phone: z.string().optional().refine((val) => !val || isValidPhone(val), 'Telefone invalido'),
})

const opportunitySchema = z.object({
  leadValue: z.number().optional(),
  expectedCloseDate: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  city: z.string().optional(),
  state: z.string().optional(),
  termsAccepted: z.boolean().refine((val) => val, 'Voce deve aceitar os termos'),
  consentLgpd: z.boolean().refine((val) => val, 'Voce deve autorizar o tratamento de dados'),
})

const steps = ['Empresa', 'Oportunidade', 'Complementos']

export function LeadForm() {
  const [activeStep, setActiveStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({})

  const companyForm = useForm({
    resolver: zodResolver(companySchema),
    defaultValues: {
      company: '',
      cnpj: '',
      name: '',
      jobTitle: '',
      email: '',
      phone: '',
    },
  })

  const opportunityForm = useForm({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      leadValue: undefined,
      expectedCloseDate: '',
      priority: 'medium' as const,
      city: '',
      state: '',
      termsAccepted: false,
      consentLgpd: false,
    },
  })

  const handleNext = async () => {
    const isValid = activeStep === 0
      ? await companyForm.trigger()
      : await opportunityForm.trigger()

    if (isValid) setActiveStep(activeStep + 1)
  }

  const handleBack = () => {
    setActiveStep(Math.max(activeStep - 1, 0))
  }

  const resetForm = () => {
    companyForm.reset()
    opportunityForm.reset()
    setCustomFieldValues({})
    setActiveStep(0)
    setResult(null)
  }

  const handleFinalSubmit = async () => {
    setIsSubmitting(true)
    setResult(null)

    const companyData = companyForm.getValues()
    const opportunityData = opportunityForm.getValues()
    const cnpj = onlyDigits(companyData.cnpj)

    const formData = {
      name: companyData.name,
      email: companyData.email,
      phone: companyData.phone ? onlyDigits(companyData.phone) : undefined,
      company: companyData.company,
      jobTitle: companyData.jobTitle || undefined,
      document: cnpj,
      document_type: 'cnpj' as const,
      leadValue: opportunityData.leadValue,
      expectedCloseDate: opportunityData.expectedCloseDate || undefined,
      priority: opportunityData.priority,
      city: opportunityData.city || undefined,
      state: opportunityData.state?.toUpperCase() || undefined,
      termsAccepted: opportunityData.termsAccepted,
      consentLgpd: opportunityData.consentLgpd,
      source: 'landing-b2b-cnpj',
      customFields: customFieldValues,
    }

    try {
      const response = await api.createLead(formData)
      setResult({
        type: response.success ? 'success' : 'error',
        message: response.success
          ? 'Recebemos os dados da empresa. Nossa equipe entrara em contato.'
          : response.error || 'Nao foi possivel enviar o cadastro.',
      })

      if (response.success) {
        companyForm.reset()
        opportunityForm.reset()
        setCustomFieldValues({})
        setActiveStep(0)
      }
    } catch {
      setResult({ type: 'error', message: 'Erro de conexao. Tente novamente em alguns instantes.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            color: 'primary.main',
            bgcolor: 'rgba(20, 184, 166, 0.12)',
            border: '1px solid rgba(20, 184, 166, 0.22)',
          }}
        >
          <ApartmentOutlinedIcon />
        </Box>
        <Box>
          <Typography variant="h2">Cadastro empresarial</Typography>
          <Typography variant="body2" color="text.secondary">
            Informe os dados da empresa para avaliarmos o atendimento.
          </Typography>
        </Box>
      </Box>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {activeStep === 0 && (
        <Box component="form" onSubmit={companyForm.handleSubmit(handleNext)}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Controller
                name="company"
                control={companyForm.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Empresa"
                    placeholder="Razao social ou nome fantasia"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="cnpj"
                control={companyForm.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="CNPJ"
                    placeholder="00.000.000/0000-00"
                    inputProps={{ maxLength: 18 }}
                    onChange={(event) => field.onChange(formatCNPJ(event.target.value))}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message || 'Usado apenas para identificar o lead empresarial.'}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="name"
                control={companyForm.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Contato responsavel"
                    placeholder="Nome e sobrenome"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="jobTitle"
                control={companyForm.control}
                render={({ field }) => (
                  <TextField {...field} fullWidth label="Cargo" placeholder="Ex.: Diretor, Compras, Financeiro" />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="email"
                control={companyForm.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="email"
                    label="E-mail corporativo"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="phone"
                control={companyForm.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Telefone ou WhatsApp"
                    placeholder="(11) 99999-9999"
                    onChange={(event) => field.onChange(formatPhone(event.target.value))}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between', mt: 3 }}>
            <Button onClick={resetForm}>Limpar</Button>
            <Button type="submit" variant="contained" endIcon={<ArrowForwardOutlinedIcon />}>Continuar</Button>
          </Box>
        </Box>
      )}

      {activeStep === 1 && (
        <Box component="form" onSubmit={opportunityForm.handleSubmit(handleNext)}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="leadValue"
                control={opportunityForm.control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="number"
                    label="Valor estimado do projeto"
                    placeholder="Ex.: 50000"
                    inputProps={{ min: 0, step: 0.01 }}
                    onChange={(event) => field.onChange(event.target.value ? Number(event.target.value) : undefined)}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="priority"
                control={opportunityForm.control}
                render={({ field }) => (
                  <TextField {...field} select fullWidth label="Urgencia">
                    <MenuItem value="low">Baixa</MenuItem>
                    <MenuItem value="medium">Media</MenuItem>
                    <MenuItem value="high">Alta</MenuItem>
                    <MenuItem value="urgent">Urgente</MenuItem>
                  </TextField>
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="expectedCloseDate"
                control={opportunityForm.control}
                render={({ field }) => (
                  <TextField {...field} fullWidth type="date" label="Previsao de decisao" InputLabelProps={{ shrink: true }} />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <Controller
                name="city"
                control={opportunityForm.control}
                render={({ field }) => (
                  <TextField {...field} fullWidth label="Cidade" />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={2}>
              <Controller
                name="state"
                control={opportunityForm.control}
                render={({ field }) => (
                  <TextField {...field} fullWidth label="UF" inputProps={{ maxLength: 2 }} />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="termsAccepted"
                control={opportunityForm.control}
                render={({ field, fieldState }) => (
                  <Box>
                    <FormControlLabel
                      control={<Checkbox {...field} checked={field.value} />}
                      label="Aceito os termos de contato comercial"
                    />
                    {fieldState.error && <Typography variant="caption" color="error">{fieldState.error.message}</Typography>}
                  </Box>
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="consentLgpd"
                control={opportunityForm.control}
                render={({ field, fieldState }) => (
                  <Box>
                    <FormControlLabel
                      control={<Checkbox {...field} checked={field.value} />}
                      label="Autorizo o tratamento dos dados para atendimento conforme LGPD"
                    />
                    {fieldState.error && <Typography variant="caption" color="error">{fieldState.error.message}</Typography>}
                  </Box>
                )}
              />
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between', mt: 3 }}>
            <Button onClick={handleBack} startIcon={<ArrowBackOutlinedIcon />}>Voltar</Button>
            <Button type="submit" variant="contained" endIcon={<ArrowForwardOutlinedIcon />}>Continuar</Button>
          </Box>
        </Box>
      )}

      {activeStep === 2 && (
        <Box>
          <DynamicFormFields
            onFieldChange={(fieldName, value) => {
              setCustomFieldValues((prev) => ({ ...prev, [fieldName]: value }))
            }}
            values={customFieldValues}
          />

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between', mt: 3 }}>
            <Button onClick={handleBack} startIcon={<ArrowBackOutlinedIcon />}>Voltar</Button>
            <Button
              onClick={handleFinalSubmit}
              variant="contained"
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={20} /> : <SendOutlinedIcon />}
            >
              {isSubmitting ? 'Enviando...' : 'Enviar cadastro'}
            </Button>
          </Box>
        </Box>
      )}

      {result && (
        <Alert severity={result.type} sx={{ mt: 3 }}>
          {result.message}
        </Alert>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        Dados protegidos e usados apenas para contato comercial e qualificacao do atendimento.
      </Typography>
    </Box>
  )
}
