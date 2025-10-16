import axios from 'axios';
import { WhatsAppService } from '../domain/WhatsAppService';
import { WhatsAppMessage } from '../domain/WhatsAppMessage';

export class MetaWhatsAppService implements WhatsAppService {
  private accessToken: string;
  private phoneNumberId: string;
  private baseUrl: string;

  constructor(accessToken: string, phoneNumberId: string) {
    this.accessToken = accessToken;
    this.phoneNumberId = phoneNumberId;
    this.baseUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  }

  async sendMessage(message: WhatsAppMessage): Promise<string> {
    const payload = {
      messaging_product: 'whatsapp',
      to: message.to,
      type: message.type,
      [message.type]: message.content
    };

    const response = await axios.post(this.baseUrl, payload, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.messages[0].id;
  }

  async sendTemplateMessage(to: string, templateName: string, parameters: any[] = []): Promise<string> {
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'pt_BR'
        },
        components: parameters.length > 0 ? [{
          type: 'body',
          parameters: parameters.map(param => ({
            type: 'text',
            text: param
          }))
        }] : []
      }
    };

    const response = await axios.post(this.baseUrl, payload, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.messages[0].id;
  }

  async sendInteractiveMessage(to: string, interactive: any): Promise<string> {
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive
    };

    const response = await axios.post(this.baseUrl, payload, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.messages[0].id;
  }

  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'quiz-whatsapp-token';
    
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }
    
    return null;
  }
}