import { Email, EmailAddress, EmailPriority } from '../../domain/entities/Email';
import { EmailRepository } from '../../domain/repositories/EmailRepository';
import { MessageQueue } from '../../domain/services/EmailService';
import { randomUUID } from 'crypto';

export interface SendEmailRequest {
  from: EmailAddress;
  to: EmailAddress[];
  subject: string;
  htmlBody: string;
  textBody?: string;
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  priority?: EmailPriority;
  templateId?: string;
  templateData?: Record<string, any>;
  leadId?: string;
  campaignId?: string;
}

export class SendEmailUseCase {
  constructor(
    private emailRepository: EmailRepository,
    private messageQueue: MessageQueue
  ) {}

  async execute(request: SendEmailRequest): Promise<string> {
    const email = new Email(
      randomUUID(),
      request.from,
      request.to,
      request.subject,
      request.htmlBody,
      request.textBody,
      request.cc,
      request.bcc,
      request.priority,
      request.templateId,
      request.templateData,
      request.leadId,
      request.campaignId
    );

    await this.emailRepository.save(email);
    
    await this.messageQueue.sendMessage({
      emailId: email.id,
      priority: email.priority,
      timestamp: new Date().toISOString()
    });

    return email.id;
  }
}