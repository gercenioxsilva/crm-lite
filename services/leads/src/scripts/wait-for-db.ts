import { Pool } from 'pg';

if (process.env.DATABASE_URL) {
  try {
    const u = new URL(process.env.DATABASE_URL);
    console.log(`DB target: ${u.hostname}:${u.port || 5432}${u.pathname}`);
  } catch {
    // pg will surface malformed connection strings with the original error.
  }
}

const connectionTimeoutMillis = parseInt(process.env.DB_CONNECT_TIMEOUT_MS || '10000', 10);
const dbConnectMaxRetries = parseInt(process.env.DB_CONNECT_MAX_RETRIES || '60', 10);
const dbConnectRetryDelayMs = parseInt(process.env.DB_CONNECT_RETRY_DELAY_MS || '5000', 10);
const pgSslMode = (process.env.PGSSLMODE || '').toLowerCase();
const ssl = pgSslMode === 'require'
  ? { rejectUnauthorized: false }
  : undefined;

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis, ssl })
  : new Pool({
      host: process.env.POSTGRES_HOST || 'db',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'quiz',
      user: process.env.POSTGRES_USER || 'quiz',
      password: process.env.POSTGRES_PASSWORD || 'quiz',
      connectionTimeoutMillis,
      ssl,
    });

function connectionErrorSummary(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as any).code ? ` code=${(error as any).code}` : '';
    return `${error.name}${code}: ${error.message}`;
  }

  return String(error);
}

async function waitForDatabase(maxRetries = dbConnectMaxRetries, delay = dbConnectRetryDelayMs) {
  let lastError = 'unknown error';

  for (let i = 0; i < maxRetries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('Database connection established');
      await pool.end();
      return true;
    } catch (error) {
      lastError = connectionErrorSummary(error);
      console.log(`Waiting for database... (${i + 1}/${maxRetries}) Last error: ${lastError}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.error(`Failed to connect to database after maximum retries. Last error: ${lastError}`);
  process.exit(1);
}

if (require.main === module) {
  waitForDatabase().then(() => {
    console.log('Database is ready!');
    process.exit(0);
  });
}

export { waitForDatabase };
