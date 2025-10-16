import { EmailRepository } from '../../domain/repositories/EmailRepository';
import { EmailProvider, MessageQueue } from '../../domain/services/EmailService';
import { EmailStatus } from '../../domain/entities/Email';

export class ProcessEmailQueueUseCase {
  constructor(
    private emailRepository: EmailRepository,
    private emailProvider: EmailProvider,
    private messageQueue: MessageQueue
  ) {}

  async execute(): Promise<void> {
    const messages = await this.messageQueue.receiveMessages();

    for (const message of messages) {
      try {
        const { emailId } = JSON.parse(message.Body);
        const email = await this.emailRepository.findById(emailId);

        if (!email || email.status !== EmailStatus.PENDING) {
          await this.messageQueue.deleteMessage(message.ReceiptHandle);
          continue;
        }

        try {
          const sesMessageId = await this.emailProvider.sendEmail(email);
          email.markAsSent(sesMessageId);
          await this.emailRepository.update(email);
        } catch (error) {
          email.markAsFailed(error instanceof Error ? error.message : 'Unknown error');
          email.incrementRetry();
          await this.emailRepository.update(email);

          if (email.canRetry()) {
            // Re-queue for retry with delay
            setTimeout(async () => {
              await this.messageQueue.sendMessage({
                emailId: email.id,
                priority: email.priority,
                timestamp: new Date().toISOString(),
                retryCount: email.retryCount
              });
            }, 60000 * email.retryCount); // Exponential backoff
          }
        }

        await this.messageQueue.deleteMessage(message.ReceiptHandle);
      } catch (error) {
        console.error('Error processing message:', error);
      }
    }
  }
}