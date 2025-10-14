import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { theme } from './theme/theme'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Leads } from './pages/Leads'
import { Pipeline } from './pages/Pipeline'
import { Activities } from './pages/Activities'
import { Reports } from './pages/Reports'
import { BasicLogin } from './pages/BasicLogin'
import { SimpleAuthProvider } from './hooks/useSimpleAuth'
import { SimpleProtectedRoute } from './components/SimpleProtectedRoute'

function SimpleApp() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SimpleAuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<BasicLogin />} />
            <Route path="/" element={
              <SimpleProtectedRoute>
                <Layout />
              </SimpleProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="leads" element={<Leads />} />
              <Route path="pipeline" element={<Pipeline />} />
              <Route path="activities" element={<Activities />} />
              <Route path="reports" element={<Reports />} />
            </Route>
          </Routes>
        </Router>
      </SimpleAuthProvider>
    </ThemeProvider>
  )
}

export default SimpleApp