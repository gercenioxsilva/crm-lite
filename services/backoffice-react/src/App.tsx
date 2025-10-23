import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { theme } from './theme/theme'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Leads } from './pages/Leads'
import { Pipeline } from './pages/Pipeline'
import { Activities } from './pages/Activities'
import { Reports } from './pages/Reports'
import { CustomFields } from './pages/CustomFields'
import { SimpleLogin } from './pages/SimpleLogin'
import { AuthProvider } from './hooks/useAuth'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ErrorBoundary } from './components/ErrorBoundary'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5000,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Router basename="/crm">
              <Routes>
                <Route path="/login" element={<SimpleLogin />} />
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Dashboard />} />
                  <Route path="leads" element={<Leads />} />
                  <Route path="pipeline" element={<Pipeline />} />
                  <Route path="activities" element={<Activities />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="custom-fields" element={<CustomFields />} />
                </Route>
              </Routes>
            </Router>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App