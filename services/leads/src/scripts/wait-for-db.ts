import { Pool } from 'pg';

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
      await pool.end();
      return true;
    } catch (error) {
      console.log(`⏳ Waiting for database... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.error('❌ Failed to connect to database after maximum retries');
  process.exit(1);
}

if (require.main === module) {
  waitForDatabase().then(() => {
    console.log('Database is ready!');
    process.exit(0);
  });
}

export { waitForDatabase };