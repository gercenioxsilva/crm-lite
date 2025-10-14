import { buildServer } from './infrastructure/server';
import { waitForDatabase } from './scripts/wait-for-db';

async function start() {
  try {
    await waitForDatabase();
    
    const port = Number(process.env.LEADS_PORT ?? 3020);
    const app = buildServer();
    
    await app.listen({ port, host: '0.0.0.0' });
    (app.log as any).info('leads up on :' + port);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();