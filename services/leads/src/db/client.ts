import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pgSslMode = (process.env.PGSSLMODE || '').toLowerCase();
const ssl = pgSslMode === 'require'
  ? { rejectUnauthorized: false }
  : undefined;

export const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      max: 20,
      ssl,
    })
  : new Pool({
      host: process.env.POSTGRES_HOST || 'db',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'quiz',
      user: process.env.POSTGRES_USER || 'quiz',
      password: process.env.POSTGRES_PASSWORD || 'quiz',
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      max: 20,
      ssl,
    });

export const db = drizzle(pool, { schema });
