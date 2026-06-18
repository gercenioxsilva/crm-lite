import { Pool } from 'pg';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

if (process.env.DATABASE_URL) {
  try {
    const u = new URL(process.env.DATABASE_URL);
    console.log(`DB target: ${u.hostname}:${u.port || 5432}${u.pathname}`);
  } catch { /* malformed URL — pg will surface a clearer error */ }
}

const connectionTimeoutMillis = parseInt(process.env.DB_CONNECT_TIMEOUT_MS || '10000', 10);
const dbConnectMaxRetries = parseInt(process.env.DB_CONNECT_MAX_RETRIES || '30', 10);
const dbConnectRetryDelayMs = parseInt(process.env.DB_CONNECT_RETRY_DELAY_MS || '2000', 10);

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis })
  : new Pool({
      host: process.env.POSTGRES_HOST || 'db',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'quiz',
      user: process.env.POSTGRES_USER || 'quiz',
      password: process.env.POSTGRES_PASSWORD || 'quiz',
      connectionTimeoutMillis,
    });

const migrations = [
  '0001_init.sql',
  '0002_crm_struct.sql',
  '0003_sample_data.sql',
  '0004_crm_enhancements.sql',
  '0005_pipefy_crm_complete.sql',
  '0008_custom_fields_simple.sql',
  '0009_saas_mvp.sql',
  '0010_document_field.sql',
];

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
      return;
    } catch (error) {
      lastError = connectionErrorSummary(error);
      console.log(`Waiting for database... (${i + 1}/${maxRetries}) Last error: ${lastError}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error(`Failed to connect to database after maximum retries. Last error: ${lastError}`);
}

async function ensureMigrationTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      migration text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function isMigrationApplied(migration: string): Promise<boolean> {
  const result = await pool.query('SELECT 1 FROM schema_migrations WHERE migration = $1', [migration]);
  return (result.rowCount ?? 0) > 0;
}

async function markMigrationApplied(migration: string): Promise<void> {
  await pool.query(
    'INSERT INTO schema_migrations (migration) VALUES ($1) ON CONFLICT (migration) DO NOTHING',
    [migration]
  );
}

async function tableExists(tableName: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return (result.rowCount ?? 0) > 0;
}

// Splits a SQL file into individual statements, correctly handling:
//  - dollar-quoted strings: $$...$$ and $tag$...$tag$
//  - single-quoted strings with '' escaping
//  - line comments (--)
//  - block comments (/* */)
function splitSqlStatements(sql: string): string[] {
  const stmts: string[] = [];
  let buf = '';
  let i = 0;
  const len = sql.length;

  while (i < len) {
    const ch = sql[i];

    // Dollar-quoted string $$...$$ or $tag$...$tag$
    if (ch === '$') {
      const tagMatch = sql.slice(i).match(/^\$([^$]*)\$/);
      if (tagMatch) {
        const tag = tagMatch[0];
        const closeIdx = sql.indexOf(tag, i + tag.length);
        if (closeIdx !== -1) {
          buf += sql.slice(i, closeIdx + tag.length);
          i = closeIdx + tag.length;
          continue;
        }
      }
    }

    // Single-quoted string 'value' with '' escape
    if (ch === "'") {
      let j = i + 1;
      while (j < len) {
        if (sql[j] === "'" && j + 1 < len && sql[j + 1] === "'") {
          j += 2;
        } else if (sql[j] === "'") {
          j++;
          break;
        } else {
          j++;
        }
      }
      buf += sql.slice(i, j);
      i = j;
      continue;
    }

    // Line comment -- until end of line
    if (ch === '-' && i + 1 < len && sql[i + 1] === '-') {
      const eol = sql.indexOf('\n', i);
      buf += eol === -1 ? sql.slice(i) : sql.slice(i, eol + 1);
      i = eol === -1 ? len : eol + 1;
      continue;
    }

    // Block comment /* ... */
    if (ch === '/' && i + 1 < len && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2);
      buf += end === -1 ? sql.slice(i) : sql.slice(i, end + 2);
      i = end === -1 ? len : end + 2;
      continue;
    }

    // Statement separator
    if (ch === ';') {
      const stmt = buf.trim();
      if (stmt) stmts.push(stmt);
      buf = '';
      i++;
      continue;
    }

    buf += ch;
    i++;
  }

  const last = buf.trim();
  if (last) stmts.push(last);

  // Remove statements that are only comments / whitespace after stripping comments
  return stmts.filter(s =>
    s.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim().length > 0
  );
}

function isSafeAlreadyAppliedError(error: any): boolean {
  const msg = String(error?.message || '').toLowerCase();
  return msg.includes('already exists') || msg.includes('duplicate key value');
}

// Runs each statement in a SQL file individually.
// "Already exists" errors are skipped per-statement so a partial failure
// in a previous run never blocks subsequent statements in the same file.
async function runMigrationFile(filename: string, sql: string): Promise<void> {
  const statements = splitSqlStatements(sql);
  let idx = 0;
  for (const stmt of statements) {
    idx++;
    try {
      await pool.query(stmt);
    } catch (err: any) {
      if (isSafeAlreadyAppliedError(err)) {
        const preview = stmt.replace(/\s+/g, ' ').slice(0, 100);
        console.log(`  [${filename}:${idx}] skipped (already applied): ${preview}`);
      } else {
        console.error(`  [${filename}:${idx}] FAILED: ${stmt.replace(/\s+/g, ' ').slice(0, 200)}`);
        console.error(`  Error: ${err.message}`);
        throw err;
      }
    }
  }
}

async function resetSchema(): Promise<void> {
  console.log('RESET_SCHEMA=true — dropping entire public schema for a clean slate...');
  await pool.query('DROP SCHEMA public CASCADE');
  await pool.query('CREATE SCHEMA public');
  await pool.query('GRANT ALL ON SCHEMA public TO public');
  console.log('Schema reset complete. All migrations will run from scratch.');
}

async function baselineExistingDatabase() {
  const result = await pool.query('SELECT count(*)::int AS count FROM schema_migrations');
  if (result.rows[0]?.count > 0) return;

  const hasLegacyCrmSchema =
    await tableExists('leads') &&
    await tableExists('pipelines') &&
    await tableExists('custom_fields');

  if (!hasLegacyCrmSchema) return;

  console.log('Existing CRM schema detected without migration history. Baselining legacy migrations.');
  for (const migration of migrations.filter(name => name !== '0009_saas_mvp.sql')) {
    await markMigrationApplied(migration);
  }
}

async function runMigrations() {
  try {
    console.log('Starting migrations...');

    await waitForDatabase();

    if (process.env.RESET_SCHEMA === 'true') {
      await resetSchema();
    }

    await ensureMigrationTable();
    await baselineExistingDatabase();

    const migrationsDir = existsSync('/app/db/migrations')
      ? '/app/db/migrations'
      : join(process.cwd(), 'db', 'migrations');

    for (const migration of migrations) {
      if (await isMigrationApplied(migration)) {
        console.log(`${migration} already applied, skipping`);
        continue;
      }

      console.log(`Running migration: ${migration}`);
      const sql = readFileSync(join(migrationsDir, migration), 'utf8');
      await runMigrationFile(migration, sql);
      await markMigrationApplied(migration);
      console.log(`${migration} completed`);
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
