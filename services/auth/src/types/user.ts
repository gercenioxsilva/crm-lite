export interface User {
  id: string
  email: string
  name: string
  password: string
  role: 'admin' | 'user'
  createdAt: Date
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: Omit<User, 'password'>
}