import { FastifyInstance } from 'fastify';
import { WhatsAppService } from '../../domain/WhatsAppService';
import { WhatsAppLeadService } from '../../application/WhatsAppLeadService';
import { LeadWebhookService } from '../../application/LeadWebhookService';
import { WhatsAppWebhook } from '../../domain/WhatsAppMessage';

export async function registerRoutes(
  app: FastifyInstance,
  whatsappService: WhatsAppService,
  leadService: WhatsAppLeadService,
  webhookService: LeadWebhookService
) {
  
  // Health check
  app.get('/health', async () => {
    return { 
      status: 'ok', 
      service: 'whatsapp', 
      timestamp: new Date().toISOString() 
    };
  });

  // Webhook verification (GET)
  app.get('/webhook', async (req, reply) => {
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query as any;
    
    const result = whatsappService.verifyWebhook(mode, token, challenge);
    
    if (result) {
      reply.code(200).send(result);
    } else {
      reply.code(403).send('Forbidden');
    }
  });

  // Webhook para receber mensagens (POST)
  app.post('/webhook', async (req, reply) => {
    try {
      const webhook = req.body as WhatsAppWebhook;
      
      if (webhook.object !== 'whatsapp_business_account') {
        reply.code(404).send('Not Found');
        return;
      }

      for (const entry of webhook.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            const { messages, statuses } = change.value;
            
            // Processar mensagens recebidas
            if (messages) {
              for (const message of messages) {
                if (message.type === 'text' && message.text) {
                  await leadService.processIncomingMessage(
                    message.from,
                    message.text.body,
                    message.id
                  );
                }
              }
            }

            // Processar status de mensagens enviadas
            if (statuses) {
              for (const status of statuses) {
                console.log(`Mensagem ${status.id} - Status: ${status.status}`);
              }
            }
          }
        }
      }

      reply.code(200).send('OK');
    } catch (error) {
      app.log.error(error);
      reply.code(500).send('Internal Server Error');
    }
  });

  // Enviar mensagem de texto
  app.post('/send-message', async (req, reply) => {
    try {
      const { to, message, leadId } = req.body as any;
      
      const messageId = await whatsappService.sendMessage({
        to,
        type: 'text',
        content: message,
        leadId
      });

      reply.code(200).send({ messageId, status: 'sent' });
    } catch (error) {
      app.log.error(error);
      reply.code(500).send({ error: 'Failed to send message' });
    }
  });

  // Enviar template
  app.post('/send-template', async (req, reply) => {
    try {
      const { to, templateName, parameters } = req.body as any;
      
      const messageId = await whatsappService.sendTemplateMessage(to, templateName, parameters);

      reply.code(200).send({ messageId, status: 'sent' });
    } catch (error) {
      app.log.error(error);
      reply.code(500).send({ error: 'Failed to send template' });
    }
  });

  // Enviar mensagem interativa
  app.post('/send-interactive', async (req, reply) => {
    try {
      const { to, interactive } = req.body as any;
      
      const messageId = await whatsappService.sendInteractiveMessage(to, interactive);

      reply.code(200).send({ messageId, status: 'sent' });
    } catch (error) {
      app.log.error(error);
      reply.code(500).send({ error: 'Failed to send interactive message' });
    }
  });

  // Integração com leads - enviar boas-vindas
  app.post('/leads/:id/welcome', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { phone, name } = req.body as any;
      
      await leadService.sendWelcomeMessage(id, phone, name);

      reply.code(200).send({ status: 'sent' });
    } catch (error) {
      app.log.error(error);
      reply.code(500).send({ error: 'Failed to send welcome message' });
    }
  });

  // Integração com leads - enviar follow-up
  app.post('/leads/:id/follow-up', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { phone, name } = req.body as any;
      
      await leadService.sendFollowUpMessage(id, phone, name);

      reply.code(200).send({ status: 'sent' });
    } catch (error) {
      app.log.error(error);
      reply.code(500).send({ error: 'Failed to send follow-up message' });
    }
  });

  // Integração com leads - enviar qualificação
  app.post('/leads/:id/qualification', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { phone, name } = req.body as any;
      
      await leadService.sendQualificationMessage(id, phone, name);

      reply.code(200).send({ status: 'sent' });
    } catch (error) {
      app.log.error(error);
      reply.code(500).send({ error: 'Failed to send qualification message' });
    }
  });

  // Webhook para novos leads (chamado pelo serviço de leads)
  app.post('/webhook/lead-created', async (req, reply) => {
    try {
      const leadData = req.body as any;
      await webhookService.handleNewLead(leadData);
      reply.code(200).send({ status: 'processed' });
    } catch (error) {
      app.log.error(error);
      reply.code(500).send({ error: 'Failed to process lead webhook' });
    }
  });

  // Webhook para atualizações de leads
  app.post('/webhook/lead-updated', async (req, reply) => {
    try {
      const { leadId, updates } = req.body as any;
      await webhookService.handleLeadUpdate(leadId, updates);
      reply.code(200).send({ status: 'processed' });
    } catch (error) {
      app.log.error(error);
      reply.code(500).send({ error: 'Failed to process lead update webhook' });
    }
  });

  // Endpoint para desenvolvimento - simular mensagem recebida (apenas para mock)
  if (process.env.NODE_ENV !== 'production') {
    app.post('/simulate-incoming', async (req, reply) => {
      try {
        const { from, message } = req.body as any;
        
        await leadService.processIncomingMessage(from, message, `sim_${Date.now()}`);

        reply.code(200).send({ status: 'processed' });
      } catch (error) {
        app.log.error(error);
        reply.code(500).send({ error: 'Failed to process simulated message' });
      }
    });

    // Simular novo lead para teste
    app.post('/simulate-lead', async (req, reply) => {
      try {
        const leadData = req.body as any;
        await webhookService.handleNewLead(leadData);
        reply.code(200).send({ status: 'processed' });
      } catch (error) {
        app.log.error(error);
        reply.code(500).send({ error: 'Failed to process simulated lead' });
      }
    });
  }
}