import { useState, useEffect } from 'react'
import { SimpleLogin } from './components/SimpleLogin'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    setIsAuthenticated(!!token)
    setIsLoading(false)
  }, [])

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

  if (!isAuthenticated) {
    return <SimpleLogin />
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0F0F10',
      color: '#F2F2F3',
      padding: '2rem'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1>Quiz Backoffice</h1>
        <p>Sistema funcionando! Login realizado com sucesso.</p>
        <button
          onClick={() => {
            localStorage.removeItem('auth_token')
            window.location.reload()
          }}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(90deg, #8A05BE, #b5179e)',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>
    </div>
  )
}

export default App