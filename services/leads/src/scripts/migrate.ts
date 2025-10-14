import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'db',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'quiz',
  user: process.env.POSTGRES_USER || 'quiz',
  password: process.env.POSTGRES_PASSWORD || 'quiz',
});

async function waitForDatabase(maxRetries = 30, delay = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('✅ Database connection established');
      return true;
    } catch (error) {
      console.log(`⏳ Waiting for database... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.error('❌ Failed to connect to database after maximum retries');
  process.exit(1);
}

async function runMigrations() {
  try {
    console.log('Starting migrations...');
    
    await waitForDatabase();
    
    const migrations = [
      '0001_init.sql',
      '0002_crm_struct.sql', 
      '0003_sample_data.sql',
      '0004_crm_enhancements.sql',
      '0005_pipefy_crm_complete.sql'
    ];

    for (const migration of migrations) {
      console.log(`Running migration: ${migration}`);
      try {
        const sql = readFileSync(join('/app/db/migrations', migration), 'utf8');
        await pool.query(sql);
        console.log(`✓ ${migration} completed`);
      } catch (migrationError: any) {
        if (migrationError.message?.includes('already exists')) {
          console.log(`⚠ ${migration} already applied, skipping`);
        } else {
          throw migrationError;
        }
      }
    }

    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();