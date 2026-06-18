import { Pool } from 'pg';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

if (process.env.DATABASE_URL) {
  try {
    const u = new URL(process.env.DATABASE_URL);
    console.log(`DB target: ${u.hostname}:${u.port || 5432}${u.pathname}`);
  } catch { /* malformed URL — pg will surface a clearer error */ }
}

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 })
  : new Pool({
      host: process.env.POSTGRES_HOST || 'db',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'quiz',
      user: process.env.POSTGRES_USER || 'quiz',
      password: process.env.POSTGRES_PASSWORD || 'quiz',
      connectionTimeoutMillis: 5000,
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

async function waitForDatabase(maxRetries = 30, delay = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('Database connection established');
      return;
    } catch (error) {
      console.log(`Waiting for database... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Failed to connect to database after maximum retries');
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
  return result.rowCount > 0;
}

async function markMigrationApplied(migration: string): Promise<void> {
  await pool.query(
    'INSERT INTO schema_migrations (migration) VALUES ($1) ON CONFLICT (migration) DO NOTHING',
    [migration]
  );
}

async function tableExists(tableName: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return result.rowCount > 0;
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

function isSafeAlreadyAppliedError(error: any): boolean {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('already exists') || message.includes('duplicate key value');
}

async function runMigrations() {
  try {
    console.log('Starting migrations...');

    await waitForDatabase();
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
      try {
        const sql = readFileSync(join(migrationsDir, migration), 'utf8');
        await pool.query(sql);
        await markMigrationApplied(migration);
        console.log(`${migration} completed`);
      } catch (migrationError: any) {
        if (isSafeAlreadyAppliedError(migrationError)) {
          await markMigrationApplied(migration);
          console.log(`${migration} appears to be already applied, marking as complete`);
        } else {
          throw migrationError;
        }
      }
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
