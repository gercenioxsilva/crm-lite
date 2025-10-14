import { FastifyRequest, FastifyReply } from 'fastify'
import jwt from 'jsonwebtoken'

interface AuthPayload {
  sub: string
  email?: string
  name?: string
  role?: string
  scope?: string
  iat: number
  exp: number
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401)
    return { error: 'Missing or invalid authorization header' }
  }

  const token = authHeader.substring(7)
  const secret = process.env.AUTH_JWT_SECRET || 'changeme-dev-secret'

  try {
    const decoded = jwt.verify(token, secret) as AuthPayload
    
    // Add user/client info to request
    ;(request as any).auth = {
      userId: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      scope: decoded.scope,
      isUser: !!decoded.email,
      isClient: !decoded.email
    }
  } catch (error) {
    reply.code(401)
    return { error: 'Invalid token' }
  }
}

export function requireScope(requiredScope: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = (request as any).auth
    
    if (!auth) {
      reply.code(401)
      return { error: 'Authentication required' }
    }

    // For user tokens, check role-based access
    if (auth.isUser) {
      if (auth.role === 'admin') return // Admin has all access
      if (requiredScope.includes('admin') && auth.role !== 'admin') {
        reply.code(403)
        return { error: 'Admin access required' }
      }
      return
    }

    // For client tokens, check scope
    if (auth.isClient && auth.scope) {
      const scopes = auth.scope.split(' ')
      if (!scopes.includes(requiredScope)) {
        reply.code(403)
        return { error: `Scope '${requiredScope}' required` }
      }
    } else {
      reply.code(403)
      return { error: 'Insufficient permissions' }
    }
  }
}