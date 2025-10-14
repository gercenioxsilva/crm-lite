import { useState } from 'react'

export function SimpleLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if ((email === 'admin@quiz.com' && password === 'admin123') || 
        (email === 'user@quiz.com' && password === 'user123')) {
      localStorage.setItem('auth_token', 'mock-admin-token')
      window.location.href = '/'
    } else {
      setError('Credenciais inválidas')
    }
    
    setLoading(false)
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
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            margin: '0 auto 1rem',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #8A05BE, #b5179e)'
          }} />
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem' }}>Quiz Backoffice</h1>
          <p style={{ margin: 0, color: '#B0B0B5' }}>Faça login para continuar</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #2A2A2B',
                backgroundColor: '#101012',
                color: '#F2F2F3',
                fontSize: '1rem'
              }}
              required
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #2A2A2B',
                backgroundColor: '#101012',
                color: '#F2F2F3',
                fontSize: '1rem'
              }}
              required
            />
          </div>

          {error && (
            <div style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              backgroundColor: '#ff6b6b20',
              border: '1px solid #ff6b6b',
              borderRadius: '8px',
              color: '#ff6b6b',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(90deg, #8A05BE, #b5179e)',
              color: 'white',
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#B0B0B5' }}>
          <p>Usuários de teste:</p>
          <p>admin@quiz.com / admin123</p>
          <p>user@quiz.com / user123</p>
        </div>
      </div>
    </div>
  )
}