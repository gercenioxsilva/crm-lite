import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { SendEmailUseCase } from '../../application/usecases/SendEmailUseCase';
import { EmailRepository } from '../../domain/repositories/EmailRepository';
import { EmailPriority } from '../../domain/entities/Email';

const EmailAddressSchema = z.object({
  email: z.string().email(),
  name: z.string().optional()
});

const SendEmailSchema = z.object({
  from: EmailAddressSchema,
  to: z.array(EmailAddressSchema),
  subject: z.string().min(1),
  htmlBody: z.string().min(1),
  textBody: z.string().optional(),
  cc: z.array(EmailAddressSchema).optional(),
  bcc: z.array(EmailAddressSchema).optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  templateId: z.string().optional(),
  templateData: z.record(z.any()).optional(),
  leadId: z.string().optional(),
  campaignId: z.string().optional()
});

export async function registerRoutes(
  app: FastifyInstance,
  sendEmailUseCase: SendEmailUseCase,
  emailRepository: EmailRepository
) {
  app.get('/health', async () => ({ status: 'ok', service: 'email' }));

  app.post('/emails', async (req, reply) => {
    try {
      const body = SendEmailSchema.parse(req.body);
      const emailId = await sendEmailUseCase.execute({
        ...body,
        priority: body.priority as EmailPriority
      });
      
      reply.code(201);
      return { emailId, status: 'queued' };
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400);
        return { error: 'Validation error', details: error.errors };
      }
      
      reply.code(500);
      return { error: 'Internal server error' };
    }
  });

  app.get('/emails/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const email = await emailRepository.findById(id);
      
      if (!email) {
        reply.code(404);
        return { error: 'Email not found' };
      }
      
      return {
        id: email.id,
        status: email.status,
        subject: email.subject,
        to: email.to,
        createdAt: email.createdAt,
        sentAt: email.sentAt,
        deliveredAt: email.deliveredAt,
        errorMessage: email.errorMessage,
        retryCount: email.retryCount
      };
    } catch (error) {
      reply.code(500);
      return { error: 'Internal server error' };
    }
  });

  app.get('/emails/lead/:leadId', async (req, reply) => {
    try {
      const { leadId } = req.params as { leadId: string };
      const emails = await emailRepository.findByLeadId(leadId);
      
      return emails.map(email => ({
        id: email.id,
        status: email.status,
        subject: email.subject,
        to: email.to,
        createdAt: email.createdAt,
        sentAt: email.sentAt,
        deliveredAt: email.deliveredAt
      }));
    } catch (error) {
      reply.code(500);
      return { error: 'Internal server error' };
    }
  });
}