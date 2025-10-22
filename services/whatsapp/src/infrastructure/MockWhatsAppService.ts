import { WhatsAppService } from '../domain/WhatsAppService';
import { WhatsAppMessage } from '../domain/WhatsAppMessage';

export class MockWhatsAppService implements WhatsAppService {
  private messages: Array<WhatsAppMessage & { id: string }> = [];

  async sendMessage(message: WhatsAppMessage): Promise<string> {
    const messageId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const mockMessage = {
      ...message,
      id: messageId,
      status: 'sent' as 'pending' | 'sent' | 'delivered' | 'read' | 'failed',
      timestamp: new Date()
    };

    this.messages.push(mockMessage);
    
    console.log('📱 Mock WhatsApp Message Sent:', {
      id: messageId,
      to: message.to,
      type: message.type,
      content: message.content,
      leadId: message.leadId
    });

    // Simular callback de entrega após 2 segundos
    setTimeout(() => {
      mockMessage.status = 'delivered';
      console.log('✅ Mock WhatsApp Message Delivered:', messageId);
    }, 2000);

    return messageId;
  }

  async sendTemplateMessage(to: string, templateName: string, parameters: any[] = []): Promise<string> {
    const messageId = `mock_template_${Date.now()}`;
    
    console.log('📱 Mock WhatsApp Template Sent:', {
      id: messageId,
      to,
      template: templateName,
      parameters
    });

    return messageId;
  }

  async sendInteractiveMessage(to: string, interactive: any): Promise<string> {
    const messageId = `mock_interactive_${Date.now()}`;
    
    console.log('📱 Mock WhatsApp Interactive Sent:', {
      id: messageId,
      to,
      interactive
    });

    return messageId;
  }

  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'quiz-whatsapp-token';
    
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('✅ Mock WhatsApp Webhook Verified');
      return challenge;
    }
    
    console.log('❌ Mock WhatsApp Webhook Verification Failed');
    return null;
  }

  // Método adicional para desenvolvimento
  getMessages(): Array<WhatsAppMessage & { id: string }> {
    return this.messages;
  }

  // Simular recebimento de mensagem
  simulateIncomingMessage(from: string, text: string): any {
    const webhook = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'mock_entry',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '5511999999999',
              phone_number_id: 'mock_phone_id'
            },
            messages: [{
              from,
              id: `mock_incoming_${Date.now()}`,
              timestamp: Date.now().toString(),
              text: { body: text },
              type: 'text'
            }]
          },
          field: 'messages'
        }]
      }]
    };

    console.log('📱 Mock WhatsApp Incoming Message:', webhook);
    return webhook;
  }
}