import { buildServer } from './infrastructure/server';

async function start() {
  try {
    const port = Number(process.env.WHATSAPP_PORT ?? 3050);
    const app = buildServer();
    
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 WhatsApp service running on port ${port}`);
    console.log(`📱 Using ${process.env.WHATSAPP_USE_MOCK === 'true' ? 'MOCK' : 'REAL'} WhatsApp API`);
  } catch (err) {
    console.error('Failed to start WhatsApp service:', err);
    process.exit(1);
  }
}

start();