import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../hooks/useAuth'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container
} from '@mui/material'

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória')
})

type LoginForm = z.infer<typeof loginSchema>

export function Login() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()

  const { control, handleSubmit } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    setError('')

    const success = await login(data.email, data.password)
    
    if (!success) {
      setError('Credenciais inválidas')
    }
    
    setIsLoading(false)
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default'
      }}
    >
      <Container maxWidth="sm">
        <Card sx={{ maxWidth: 400, mx: 'auto' }}>
          <CardContent sx={{ p: 4 }}>
            <Box textAlign="center" mb={4}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  mx: 'auto',
                  mb: 2,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #8A05BE, #b5179e)',
                  boxShadow: '0 6px 24px rgba(138,5,190,.35)'
                }}
              />
              <Typography variant="h4" component="h1" gutterBottom>
                Quiz Backoffice
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Faça login para continuar
              </Typography>
            </Box>

            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
              <Controller
                name="email"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="email"
                    label="E-mail"
                    margin="normal"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />

              <Controller
                name="password"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="password"
                    label="Senha"
                    margin="normal"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isLoading}
                startIcon={isLoading ? <CircularProgress size={20} /> : null}
                sx={{ mt: 3, mb: 2 }}
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </Box>

            <Box mt={3} textAlign="center">
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Usuários de teste:
              </Typography>
              <Typography variant="caption" display="block" color="text.secondary">
                admin@quiz.com / admin123
              </Typography>
              <Typography variant="caption" display="block" color="text.secondary">
                user@quiz.com / user123
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  )
}