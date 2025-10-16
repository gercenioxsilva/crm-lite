import { MessageQueue } from '../../domain/services/EmailService';

export class MockMessageQueue implements MessageQueue {
  private messages: any[] = [];

  async sendMessage(message: any): Promise<void> {
    console.log('Mock: Sending message to queue:', message);
    this.messages.push({
      Body: JSON.stringify(message),
      ReceiptHandle: `mock-${Date.now()}`,
      MessageId: `mock-msg-${Date.now()}`
    });
  }

  async receiveMessages(): Promise<any[]> {
    const messages = this.messages.splice(0, 10);
    console.log(`Mock: Received ${messages.length} messages from queue`);
    return messages;
  }

  async deleteMessage(receiptHandle: string): Promise<void> {
    console.log('Mock: Deleting message:', receiptHandle);
  }
}