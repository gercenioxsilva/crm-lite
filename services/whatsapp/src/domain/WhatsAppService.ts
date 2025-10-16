import { WhatsAppMessage } from './WhatsAppMessage';

export interface WhatsAppService {
  sendMessage(message: WhatsAppMessage): Promise<string>;
  sendTemplateMessage(to: string, templateName: string, parameters?: any[]): Promise<string>;
  sendInteractiveMessage(to: string, interactive: any): Promise<string>;
  verifyWebhook(mode: string, token: string, challenge: string): string | null;
}