import { Email } from '../entities/Email';

export interface EmailProvider {
  sendEmail(email: Email): Promise<string>;
}

export interface MessageQueue {
  sendMessage(message: any): Promise<void>;
  receiveMessages(): Promise<any[]>;
  deleteMessage(receiptHandle: string): Promise<void>;
}