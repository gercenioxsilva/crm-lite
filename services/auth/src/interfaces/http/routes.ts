import { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { Pool } from 'pg';

type UserRole = 'admin' | 'user';

interface User {
  id: string
  tenantId: string
  email: string
  name: string
  passwordHash: string
  role: UserRole
  status: 'active' | 'disabled'
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
  user: Omit<User, 'passwordHash'>
}

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001';
const pgSslMode = (process.env.PGSSLMODE || '').toLowerCase();
const ssl = pgSslMode === 'require'
  ? { rejectUnauthorized: false }
  : undefined;

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      max: 5,
      ssl
    })
  : null;

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const fallbackUsers: User[] = [
  {
    id: '00000000-0000-0000-0000-000000000101',
    tenantId: DEFAULT_TENANT_ID,
    email: 'admin@quiz.com',
    name: 'Admin User',
    passwordHash: hashPassword('admin123'),
    role: 'admin',
    status: 'active',
    createdAt: new Date()
  },
  {
    id: '00000000-0000-0000-0000-000000000102',
    tenantId: DEFAULT_TENANT_ID,
    email: 'user@quiz.com',
    name: 'Regular User',
    passwordHash: hashPassword('user123'),
    role: 'user',
    status: 'active',
    createdAt: new Date()
  }
];

function toUser(row: any): User {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
    role: row.role,
    status: row.status,
    createdAt: row.created_at
  };
}

async function findUserByEmail(email: string): Promise<User | undefined> {
  if (!pool) {
    return fallbackUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  try {
    const result = await pool.query(
      `SELECT id, tenant_id, email, name, password_hash, role, status, created_at
       FROM users
       WHERE lower(email) = lower($1) AND status = 'active'
       LIMIT 1`,
      [email]
    );
    return result.rows[0] ? toUser(result.rows[0]) : undefined;
  } catch (error) {
    console.error('Auth database lookup failed, using fallback users:', error);
    return fallbackUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  }
}

async function getUserById(id: string): Promise<User | undefined> {
  if (!pool) {
    return fallbackUsers.find(u => u.id === id);
  }

  try {
    const result = await pool.query(
      `SELECT id, tenant_id, email, name, password_hash, role, status, created_at
       FROM users
       WHERE id = $1 AND status = 'active'
       LIMIT 1`,
      [id]
    );
    return result.rows[0] ? toUser(result.rows[0]) : undefined;
  } catch (error) {
    console.error('Auth database lookup failed, using fallback users:', error);
    return fallbackUsers.find(u => u.id === id);
  }
}

function validatePassword(user: User, password: string): boolean {
  return user.passwordHash === hashPassword(password);
}

type Client = { client_id: string; client_secret: string; scopes: string[] };

function loadClients(): Client[] {
  try { const raw = process.env.AUTH_CLIENTS || '[]'; return JSON.parse(raw); } catch { return []; }
}

function getJWTSecret(): string {
  return process.env.AUTH_JWT_SECRET || 'changeme-dev-secret';
}

function publicUser(user: User): Omit<User, 'passwordHash'> {
  return {
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt
  };
}

export async function registerRoutes(app: FastifyInstance){
  app.get('/health', async ()=> ({ status: 'ok', service: 'auth' }));

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
      tenantId: DEFAULT_TENANT_ID,
      scope: found.scopes.join(' ')
    } as any;
    const token = jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: ttl, subject: cid });
    return { access_token: token, token_type: 'Bearer', expires_in: ttl, scope: payload.scope };
  });

  app.post('/login', async (req, reply) => {
    const { email, password } = req.body as LoginRequest;

    if (!email || !password) {
      reply.code(400);
      return { error: 'Email and password are required' };
    }

    const user = await findUserByEmail(email);
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
      tenantId: user.tenantId,
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
      user: publicUser(user)
    };

    return response;
  });

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

      if (decoded.sub && decoded.email) {
        const user = await getUserById(decoded.sub);
        if (!user) {
          reply.code(401);
          return { error: 'User not found' };
        }

        return {
          valid: true,
          user: publicUser(user)
        };
      }

      return {
        valid: true,
        client_id: decoded.sub,
        tenantId: decoded.tenantId || DEFAULT_TENANT_ID,
        scope: decoded.scope
      };
    } catch (error) {
      reply.code(401);
      return { error: 'Invalid token' };
    }
  });
}
