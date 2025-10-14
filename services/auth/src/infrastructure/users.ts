import { User } from '../types/user'
import * as crypto from 'crypto'

// Mock users database - em produção usar banco real
const users: User[] = [
  {
    id: '1',
    email: 'admin@quiz.com',
    name: 'Admin User',
    password: hashPassword('admin123'),
    role: 'admin',
    createdAt: new Date()
  },
  {
    id: '2', 
    email: 'user@quiz.com',
    name: 'Regular User',
    password: hashPassword('user123'),
    role: 'user',
    createdAt: new Date()
  }
]

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export function findUserByEmail(email: string): User | undefined {
  return users.find(u => u.email === email)
}

export function validatePassword(user: User, password: string): boolean {
  return user.password === hashPassword(password)
}

export function getUserById(id: string): User | undefined {
  return users.find(u => u.id === id)
}