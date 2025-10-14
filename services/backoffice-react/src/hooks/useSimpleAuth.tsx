import { createContext, useContext, useState, ReactNode } from 'react'

interface User {
  id: string
  email: string
  name: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => boolean
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function SimpleAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('auth_token')
    if (token === 'mock-admin-token') {
      return {
        id: '1',
        email: 'admin@quiz.com',
        name: 'Admin User'
      }
    }
    return null
  })

  const login = (email: string, password: string): boolean => {
    if ((email === 'admin@quiz.com' && password === 'admin123') || 
        (email === 'user@quiz.com' && password === 'user123')) {
      
      localStorage.setItem('auth_token', 'mock-admin-token')
      
      const userData = {
        id: '1',
        email: email,
        name: email === 'admin@quiz.com' ? 'Admin User' : 'Regular User'
      }
      
      setUser(userData)
      return true
    }
    return false
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading: false }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useSimpleAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider')
  }
  return context
}