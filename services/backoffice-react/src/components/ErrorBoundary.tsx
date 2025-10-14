import React from 'react'
import { Box, Typography, Button, Card, CardContent } from '@mui/material'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#0F0F10',
            p: 2
          }}
        >
          <Card sx={{ maxWidth: 500 }}>
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <Typography variant="h5" gutterBottom color="error">
                Ops! Algo deu errado
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Ocorreu um erro inesperado. Tente recarregar a página.
              </Typography>
              <Button
                variant="contained"
                onClick={() => window.location.reload()}
              >
                Recarregar Página
              </Button>
            </CardContent>
          </Card>
        </Box>
      )
    }

    return this.props.children
  }
}