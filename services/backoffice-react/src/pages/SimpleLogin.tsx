import { useState } from 'react'
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

export function SimpleLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      setError('Preencha todos os campos')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const success = await login(email, password)
      if (!success) {
        setError('Credenciais inválidas')
      }
    } catch (err) {
      setError('Erro ao fazer login')
    } finally {
      setIsLoading(false)
    }
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
              <Typography variant="h4" component="h1" gutterBottom>
                Quiz CRM
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Faça login para continuar
              </Typography>
            </Box>

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                type="email"
                label="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                required
              />

              <TextField
                fullWidth
                type="password"
                label="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                required
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
                Credenciais de teste:
              </Typography>
              <Typography variant="caption" display="block" color="text.secondary">
                admin@quiz.com / admin123
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  )
}