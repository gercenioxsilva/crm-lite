import { ThemeProvider } from '@mui/material/styles'
import { Box, Card, CardContent, Chip, Container, CssBaseline, Stack, Typography } from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import { theme } from './theme/theme'
import { Header } from './components/Header'
import { LeadForm } from './components/LeadForm'

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          background:
            'radial-gradient(900px 500px at 5% 0%, rgba(20,184,166,.18), transparent 58%), radial-gradient(700px 420px at 100% 5%, rgba(59,130,246,.14), transparent 62%), linear-gradient(180deg, #071113 0%, #0B0F14 100%)',
        }}
      >
        <Header />

        <Container maxWidth="lg" sx={{ py: { xs: 3, md: 6 } }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, .9fr) minmax(480px, 1fr)' },
              gap: { xs: 3, md: 5 },
              alignItems: 'center',
            }}
          >
            <Box>
              <Chip
                label="Atendimento empresarial"
                color="secondary"
                variant="outlined"
                sx={{ mb: 2, bgcolor: 'rgba(20,184,166,.08)' }}
              />
              <Typography variant="h1" sx={{ mb: 2, maxWidth: 620 }}>
                Qualifique sua empresa para falar com nosso time comercial
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560 }}>
                Preencha os dados do CNPJ e do responsavel. O cadastro vai direto para o CRM para uma abordagem consultiva, sem login social e sem etapas desnecessarias.
              </Typography>

              <Stack spacing={1.25} sx={{ mt: 3 }}>
                {['Formulario focado em CNPJ', 'Dados enviados para o pipeline comercial', 'Tratamento conforme LGPD'].map((item) => (
                  <Box key={item} sx={{ display: 'flex', gap: 1.25, alignItems: 'center', color: 'text.secondary' }}>
                    <CheckCircleOutlineIcon color="secondary" fontSize="small" />
                    <Typography variant="body2">{item}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>

            <Card>
              <CardContent sx={{ p: { xs: 2.25, sm: 3 } }}>
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
