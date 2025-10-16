import { Email, EmailStatus } from '../entities/Email';

export interface EmailRepository {
  save(email: Email): Promise<void>;
  findById(id: string): Promise<Email | null>;
  findByStatus(status: EmailStatus): Promise<Email[]>;
  findByLeadId(leadId: string): Promise<Email[]>;
  update(email: Email): Promise<void>;
  findPendingRetries(): Promise<Email[]>;
}