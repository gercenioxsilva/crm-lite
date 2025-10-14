import { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

// Types
interface User {
  id: string
  email: string
  name: string
  password: string
  role: 'admin' | 'user'
  createdAt: Date
}

interface LoginRequest {
  email: string
  password: string
}

interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: Omit<User, 'password'>
}

// Users database
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

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

function findUserByEmail(email: string): User | undefined {
  return users.find(u => u.email === email)
}

function validatePassword(user: User, password: string): boolean {
  return user.password === hashPassword(password)
}

function getUserById(id: string): User | undefined {
  return users.find(u => u.id === id)
}

// OAuth2 clients
type Client = { client_id: string; client_secret: string; scopes: string[] };

function loadClients(): Client[] {
  try { const raw = process.env.AUTH_CLIENTS || '[]'; return JSON.parse(raw); } catch { return []; }
}

function getJWTSecret(): string {
  return process.env.AUTH_JWT_SECRET || 'changeme-dev-secret';
}

export async function registerRoutes(app: FastifyInstance){
  app.get('/health', async ()=> ({ status: 'ok', service: 'auth' }));

  // OAuth2 Client Credentials Flow
  app.post('/oauth/token', async (req, reply) => {
    const body = req.body as any || {};
    const grant = body.grant_type;
    const cid = body.client_id;
    const csecret = body.client_secret;

    if (grant !== 'client_credentials') {
      reply.code(400); return { error: 'unsupported_grant_type' };
    }

    const clients = loadClients();
    const found = clients.find(c => c.client_id === cid && c.client_secret === csecret);
    if (!found) { reply.code(401); return { error: 'invalid_client' }; }

    const secret = getJWTSecret();
    const ttl = Number(process.env.AUTH_TOKEN_TTL || '3600');
    const now = Math.floor(Date.now()/1000);
    const payload = { 
      iss: 'quiz-auth',
      aud: 'quiz-services',
      iat: now,
      scope: found.scopes.join(' ')
    } as any;
    const token = jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: ttl, subject: cid });
    return { access_token: token, token_type: 'Bearer', expires_in: ttl, scope: payload.scope };
  });

  // User Login
  app.post('/login', async (req, reply) => {
    const { email, password } = req.body as LoginRequest;

    if (!email || !password) {
      reply.code(400);
      return { error: 'Email and password are required' };
    }

    const user = findUserByEmail(email);
    if (!user || !validatePassword(user, password)) {
      reply.code(401);
      return { error: 'Invalid credentials' };
    }

    const secret = getJWTSecret();
    const ttl = Number(process.env.AUTH_TOKEN_TTL || '3600');
    const payload = {
      iss: 'quiz-auth',
      aud: 'quiz-backoffice',
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      iat: Math.floor(Date.now() / 1000)
    };

    const token = jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: ttl });
    
    const response: LoginResponse = {
      access_token: token,
      token_type: 'Bearer',
      expires_in: ttl,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt
      }
    };

    return response;
  });

  // Token Validation
  app.post('/validate', async (req, reply) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401);
      return { error: 'Missing or invalid authorization header' };
    }

    const token = authHeader.substring(7);
    const secret = getJWTSecret();

    try {
      const decoded = jwt.verify(token, secret) as any;
      
      // For user tokens, return user info
      if (decoded.sub && decoded.email) {
        const user = getUserById(decoded.sub);
        if (!user) {
          reply.code(401);
          return { error: 'User not found' };
        }
        
        return {
          valid: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            createdAt: user.createdAt
          }
        };
      }
      
      // For client tokens, return scope info
      return {
        valid: true,
        client_id: decoded.sub,
        scope: decoded.scope
      };
    } catch (error) {
      reply.code(401);
      return { error: 'Invalid token' };
    }
  });
}