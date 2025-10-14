import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

// Simple Login Component
function SimpleLogin({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if ((email === 'admin@quiz.com' && password === 'admin123') || 
        (email === 'user@quiz.com' && password === 'user123')) {
      localStorage.setItem('auth_token', 'mock-admin-token')
      onLogin()
    } else {
      setError('Credenciais inválidas')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0F0F10',
      color: '#F2F2F3',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        backgroundColor: '#171718',
        padding: '2rem',
        borderRadius: '16px',
        border: '1px solid #2A2A2B',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>Quiz Backoffice</h1>
        
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              marginBottom: '1rem',
              borderRadius: '8px',
              border: '1px solid #2A2A2B',
              backgroundColor: '#101012',
              color: '#F2F2F3'
            }}
            required
          />
          
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              marginBottom: '1rem',
              borderRadius: '8px',
              border: '1px solid #2A2A2B',
              backgroundColor: '#101012',
              color: '#F2F2F3'
            }}
            required
          />

          {error && (
            <div style={{ color: '#ff6b6b', marginBottom: '1rem', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(90deg, #8A05BE, #b5179e)',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Entrar
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#B0B0B5' }}>
          <p>admin@quiz.com / admin123</p>
          <p>user@quiz.com / user123</p>
        </div>
      </div>
    </div>
  )
}

// Simple Dashboard
function Dashboard() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginTop: '2rem' }}>
        <div style={{ backgroundColor: '#171718', padding: '1.5rem', borderRadius: '8px', border: '1px solid #2A2A2B' }}>
          <h3>Total de Leads</h3>
          <p style={{ fontSize: '2rem', margin: '0.5rem 0', color: '#8A05BE' }}>1,247</p>
        </div>
        <div style={{ backgroundColor: '#171718', padding: '1.5rem', borderRadius: '8px', border: '1px solid #2A2A2B' }}>
          <h3>Leads Hoje</h3>
          <p style={{ fontSize: '2rem', margin: '0.5rem 0', color: '#12CBC4' }}>45</p>
        </div>
        <div style={{ backgroundColor: '#171718', padding: '1.5rem', borderRadius: '8px', border: '1px solid #2A2A2B' }}>
          <h3>Taxa de Conversão</h3>
          <p style={{ fontSize: '2rem', margin: '0.5rem 0', color: '#f59e0b' }}>12.5%</p>
        </div>
      </div>
    </div>
  )
}

// Simple Layout
function Layout({ children, onLogout }: { children: React.ReactNode, onLogout: () => void }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0F0F10', color: '#F2F2F3' }}>
      <nav style={{
        width: '250px',
        backgroundColor: '#171718',
        borderRight: '1px solid #2A2A2B',
        padding: '1rem'
      }}>
        <h2 style={{ marginBottom: '2rem' }}>Quiz Backoffice</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: '0.5rem' }}>
            <a href="#" style={{ color: '#F2F2F3', textDecoration: 'none', padding: '0.5rem', display: 'block', borderRadius: '4px', backgroundColor: '#8A05BE' }}>
              Dashboard
            </a>
          </li>
        </ul>
        <button
          onClick={onLogout}
          style={{
            position: 'absolute',
            bottom: '1rem',
            left: '1rem',
            right: '1rem',
            padding: '0.5rem',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: '#2A2A2B',
            color: '#F2F2F3',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </nav>
      <main style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  )
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    setIsAuthenticated(!!token)
    setIsLoading(false)
  }, [])

  const handleLogin = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    setIsAuthenticated(false)
  }

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0F0F10',
        color: '#F2F2F3'
      }}>
        Carregando...
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? 
            <Navigate to="/" replace /> : 
            <SimpleLogin onLogin={handleLogin} />
          } 
        />
        <Route 
          path="/" 
          element={
            isAuthenticated ? 
            <Layout onLogout={handleLogout}>
              <Dashboard />
            </Layout> : 
            <Navigate to="/login" replace />
          } 
        />
      </Routes>
    </Router>
  )
}

export default App