export interface EmailAddress {
  email: string;
  name?: string;
}

export enum EmailStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  BOUNCED = 'bounced',
  FAILED = 'failed'
}

export enum EmailPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high'
}

export class Email {
  constructor(
    public readonly id: string,
    public readonly from: EmailAddress,
    public readonly to: EmailAddress[],
    public readonly subject: string,
    public readonly htmlBody: string,
    public readonly textBody?: string,
    public readonly cc?: EmailAddress[],
    public readonly bcc?: EmailAddress[],
    public readonly priority: EmailPriority = EmailPriority.NORMAL,
    public readonly templateId?: string,
    public readonly templateData?: Record<string, any>,
    public readonly leadId?: string,
    public readonly campaignId?: string,
    public status: EmailStatus = EmailStatus.PENDING,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public sentAt?: Date,
    public deliveredAt?: Date,
    public errorMessage?: string,
    public sesMessageId?: string,
    public retryCount: number = 0
  ) {}

  markAsSent(sesMessageId: string): void {
    this.status = EmailStatus.SENT;
    this.sesMessageId = sesMessageId;
    this.sentAt = new Date();
    this.updatedAt = new Date();
  }

  markAsDelivered(): void {
    this.status = EmailStatus.DELIVERED;
    this.deliveredAt = new Date();
    this.updatedAt = new Date();
  }

  markAsFailed(errorMessage: string): void {
    this.status = EmailStatus.FAILED;
    this.errorMessage = errorMessage;
    this.updatedAt = new Date();
  }

  incrementRetry(): void {
    this.retryCount++;
    this.updatedAt = new Date();
  }

  canRetry(): boolean {
    return this.retryCount < 3 && this.status === EmailStatus.FAILED;
  }
}