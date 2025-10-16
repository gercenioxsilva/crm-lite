import { createServer } from './infrastructure/server';

async function start() {
  try {
    const app = await createServer();
    const port = parseInt(process.env.PORT || '3040');
    
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`Email service running on port ${port}`);
  } catch (error) {
    console.error('Failed to start email service:', error);
    process.exit(1);
  }
}

start();