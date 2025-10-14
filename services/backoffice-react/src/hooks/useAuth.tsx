import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface User {
  id: string
  email: string
  name: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        if (token === 'mock-admin-token') {
          setUser({
            id: '1',
            email: 'admin@quiz.com',
            name: 'Admin User'
          })
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        setIsLoading(false)
      }
    }
    initAuth()
  }, [])



  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Accept valid credentials
      if ((email === 'admin@quiz.com' && password === 'admin123') || 
          (email === 'user@quiz.com' && password === 'user123')) {
        
        localStorage.setItem('auth_token', 'mock-admin-token')
        
        const userData = {
          id: '1',
          email: email,
          name: email === 'admin@quiz.com' ? 'Admin User' : 'Regular User'
        }
        
        setUser(userData)
        navigate('/')
        return true
      }
      return false
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    setUser(null)
    navigate('/login')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}