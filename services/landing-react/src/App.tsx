import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline, Container, Box, Typography, Card, CardContent } from '@mui/material'
import { theme } from './theme/theme'
import { Header } from './components/Header'
import { LeadForm } from './components/LeadForm'

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', background: 'radial-gradient(1200px 600px at -10% -10%, rgba(138,5,190,.24), transparent 50%), radial-gradient(800px 500px at 120% -20%, rgba(181,23,158,.14), transparent 60%), #0F0F10' }}>
        <Header />
        
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ flex: '1 1 320px', maxWidth: 400 }}>
              <Typography variant="h1" sx={{ mb: 1.5 }}>
                Abra sua conta em minutos
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Rápido, sem burocracia e 100% digital.
              </Typography>
            </Box>
            
            <Card sx={{ flex: '1 1 520px', minWidth: 520 }}>
              <CardContent sx={{ p: 3 }}>
                <LeadForm />
              </CardContent>
            </Card>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  )
}

export default App