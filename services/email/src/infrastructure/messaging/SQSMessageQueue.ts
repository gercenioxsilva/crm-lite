import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { MessageQueue } from '../../domain/services/EmailService';

export class SQSMessageQueue implements MessageQueue {
  private sqsClient: SQSClient;
  private queueUrl: string;

  constructor(queueUrl: string, region: string = 'us-east-1') {
    this.sqsClient = new SQSClient({ region });
    this.queueUrl = queueUrl;
  }

  async sendMessage(message: any): Promise<void> {
    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(message),
      MessageAttributes: {
        Priority: {
          DataType: 'String',
          StringValue: message.priority || 'normal'
        }
      }
    });

    await this.sqsClient.send(command);
  }

  async receiveMessages(): Promise<any[]> {
    const command = new ReceiveMessageCommand({
      QueueUrl: this.queueUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20,
      MessageAttributeNames: ['All']
    });

    const response = await this.sqsClient.send(command);
    return response.Messages || [];
  }

  async deleteMessage(receiptHandle: string): Promise<void> {
    const command = new DeleteMessageCommand({
      QueueUrl: this.queueUrl,
      ReceiptHandle: receiptHandle
    });

    await this.sqsClient.send(command);
  }
}