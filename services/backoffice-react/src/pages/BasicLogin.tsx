import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSimpleAuth } from '../hooks/useSimpleAuth'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container
} from '@mui/material'

export function BasicLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useSimpleAuth()
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      setError('Preencha todos os campos')
      return
    }

    const success = login(email, password)
    if (success) {
      navigate('/')
    } else {
      setError('Credenciais inválidas')
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f5f5f5'
      }}
    >
      <Container maxWidth="sm">
        <Card sx={{ maxWidth: 400, mx: 'auto' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom textAlign="center">
              Quiz CRM
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
              Sistema de Gestão de Leads
            </Typography>

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="E-mail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                required
              />

              <TextField
                fullWidth
                label="Senha"
                type="password"
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
                sx={{ mt: 3, mb: 2 }}
              >
                Entrar
              </Button>
            </form>

            <Box textAlign="center">
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Credenciais de teste:
              </Typography>
              <Typography variant="caption" display="block">
                admin@quiz.com / admin123
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  )
}