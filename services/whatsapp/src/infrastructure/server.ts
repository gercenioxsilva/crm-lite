import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerRoutes } from '../interfaces/http/routes';
import { MetaWhatsAppService } from './MetaWhatsAppService';
import { MockWhatsAppService } from './MockWhatsAppService';
import { WhatsAppLeadService } from '../application/WhatsAppLeadService';
import { LeadWebhookService } from '../application/LeadWebhookService';

export function buildServer() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info'
    }
  });

  // CORS
  app.register(cors, {
    origin: true,
    credentials: true
  });

  // Inicializar serviços
  const useMock = process.env.WHATSAPP_USE_MOCK === 'true' || !process.env.WHATSAPP_ACCESS_TOKEN;
  
  const whatsappService = useMock 
    ? new MockWhatsAppService()
    : new MetaWhatsAppService(
        process.env.WHATSAPP_ACCESS_TOKEN!,
        process.env.WHATSAPP_PHONE_NUMBER_ID!
      );

  const leadService = new WhatsAppLeadService(whatsappService);
  const webhookService = new LeadWebhookService(leadService);

  // Registrar rotas
  app.register(async (fastify) => {
    await registerRoutes(fastify, whatsappService, leadService, webhookService);
  });

  return app;
}