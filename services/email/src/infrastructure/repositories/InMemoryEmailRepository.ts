import { Email, EmailStatus } from '../../domain/entities/Email';
import { EmailRepository } from '../../domain/repositories/EmailRepository';

export class InMemoryEmailRepository implements EmailRepository {
  private emails: Map<string, Email> = new Map();

  async save(email: Email): Promise<void> {
    this.emails.set(email.id, email);
    console.log('InMemory: Saved email:', email.id);
  }

  async findById(id: string): Promise<Email | null> {
    return this.emails.get(id) || null;
  }

  async findByStatus(status: EmailStatus): Promise<Email[]> {
    return Array.from(this.emails.values()).filter(email => email.status === status);
  }

  async findByLeadId(leadId: string): Promise<Email[]> {
    return Array.from(this.emails.values()).filter(email => email.leadId === leadId);
  }

  async update(email: Email): Promise<void> {
    this.emails.set(email.id, email);
    console.log('InMemory: Updated email:', email.id, 'status:', email.status);
  }

  async findPendingRetries(): Promise<Email[]> {
    return Array.from(this.emails.values()).filter(
      email => email.status === EmailStatus.FAILED && email.retryCount < 3
    );
  }
}