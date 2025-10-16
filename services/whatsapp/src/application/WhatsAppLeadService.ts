import axios from 'axios';
import { WhatsAppService } from '../domain/WhatsAppService';

export class WhatsAppLeadService {
  constructor(
    private whatsappService: WhatsAppService,
    private leadsServiceUrl: string = process.env.LEADS_SERVICE_URL || 'http://leads:3020'
  ) {}

  async sendWelcomeMessage(leadId: string, phone: string, name: string): Promise<void> {
    try {
      const messageId = await this.whatsappService.sendTemplateMessage(
        phone,
        'welcome_lead',
        [name]
      );

      await this.createActivity(leadId, 'whatsapp', `Mensagem de boas-vindas enviada via WhatsApp`, 'sent', messageId);
    } catch (error) {
      console.error('Erro ao enviar mensagem de boas-vindas:', error);
      await this.createActivity(leadId, 'whatsapp', `Falha ao enviar mensagem de boas-vindas`, 'failed');
    }
  }

  async sendFollowUpMessage(leadId: string, phone: string, name: string): Promise<void> {
    try {
      const interactive = {
        type: 'button',
        body: {
          text: `Olá ${name}! 👋\n\nVi que você se interessou pelos nossos serviços financeiros. Gostaria de agendar uma conversa para conhecer melhor suas necessidades?`
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: 'schedule_yes',
                title: '✅ Sim, quero agendar'
              }
            },
            {
              type: 'reply',
              reply: {
                id: 'schedule_later',
                title: '⏰ Talvez mais tarde'
              }
            },
            {
              type: 'reply',
              reply: {
                id: 'not_interested',
                title: '❌ Não tenho interesse'
              }
            }
          ]
        }
      };

      const messageId = await this.whatsappService.sendInteractiveMessage(phone, interactive);
      await this.createActivity(leadId, 'whatsapp', `Mensagem de follow-up enviada via WhatsApp`, 'sent', messageId);
    } catch (error) {
      console.error('Erro ao enviar follow-up:', error);
      await this.createActivity(leadId, 'whatsapp', `Falha ao enviar follow-up`, 'failed');
    }
  }

  async sendQualificationMessage(leadId: string, phone: string, name: string): Promise<void> {
    try {
      const interactive = {
        type: 'list',
        body: {
          text: `${name}, para oferecer a melhor solução, preciso entender melhor seu perfil. Qual seu principal interesse?`
        },
        action: {
          button: 'Ver opções',
          sections: [{
            title: 'Serviços Financeiros',
            rows: [
              {
                id: 'credit_card',
                title: 'Cartão de Crédito',
                description: 'Cartões com benefícios exclusivos'
              },
              {
                id: 'personal_loan',
                title: 'Empréstimo Pessoal',
                description: 'Crédito rápido e fácil'
              },
              {
                id: 'investment',
                title: 'Investimentos',
                description: 'Faça seu dinheiro render mais'
              },
              {
                id: 'business_account',
                title: 'Conta Empresarial',
                description: 'Soluções para seu negócio'
              }
            ]
          }]
        }
      };

      const messageId = await this.whatsappService.sendInteractiveMessage(phone, interactive);
      await this.createActivity(leadId, 'whatsapp', `Mensagem de qualificação enviada via WhatsApp`, 'sent', messageId);
    } catch (error) {
      console.error('Erro ao enviar qualificação:', error);
      await this.createActivity(leadId, 'whatsapp', `Falha ao enviar qualificação`, 'failed');
    }
  }

  async processIncomingMessage(from: string, message: string, messageId: string): Promise<void> {
    try {
      // Buscar lead pelo telefone
      const lead = await this.findLeadByPhone(from);
      
      if (!lead) {
        console.log(`Lead não encontrado para o telefone: ${from}`);
        return;
      }

      // Registrar atividade
      await this.createActivity(
        lead.id,
        'whatsapp',
        `Mensagem recebida: "${message}"`,
        'received',
        messageId
      );

      // Processar resposta baseada no conteúdo
      await this.handleMessageResponse(lead, from, message);

    } catch (error) {
      console.error('Erro ao processar mensagem recebida:', error);
    }
  }

  private async handleMessageResponse(lead: any, phone: string, message: string): Promise<void> {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('schedule_yes') || lowerMessage.includes('sim') || lowerMessage.includes('agendar')) {
      await this.updateLeadTemperature(lead.id, 'hot');
      await this.whatsappService.sendMessage({
        to: phone,
        type: 'text',
        content: `Perfeito! 🎉 Vou transferir você para um de nossos especialistas que entrará em contato em breve para agendar sua consulta.`,
        leadId: lead.id
      });
    } else if (lowerMessage.includes('not_interested') || lowerMessage.includes('não')) {
      await this.updateLeadTemperature(lead.id, 'cold');
      await this.whatsappService.sendMessage({
        to: phone,
        type: 'text',
        content: `Sem problemas! Caso mude de ideia, estaremos sempre aqui para ajudar. Tenha um ótimo dia! 😊`,
        leadId: lead.id
      });
    } else if (lowerMessage.includes('schedule_later') || lowerMessage.includes('mais tarde')) {
      await this.updateLeadTemperature(lead.id, 'warm');
      await this.whatsappService.sendMessage({
        to: phone,
        type: 'text',
        content: `Entendo! Vou entrar em contato novamente em alguns dias. Obrigado pelo interesse! 👍`,
        leadId: lead.id
      });
    }
  }

  private async findLeadByPhone(phone: string): Promise<any> {
    try {
      const response = await axios.get(`${this.leadsServiceUrl}/leads`);
      const leads = response.data;
      
      // Normalizar telefone para busca
      const normalizedPhone = phone.replace(/\D/g, '');
      
      return leads.find((lead: any) => {
        if (!lead.phone) return false;
        const leadPhone = lead.phone.replace(/\D/g, '');
        return leadPhone.includes(normalizedPhone) || normalizedPhone.includes(leadPhone);
      });
    } catch (error) {
      console.error('Erro ao buscar lead por telefone:', error);
      return null;
    }
  }

  private async createActivity(leadId: string, type: string, description: string, outcome: string, messageId?: string): Promise<void> {
    try {
      await axios.post(`${this.leadsServiceUrl}/activities`, {
        lead_id: leadId,
        type,
        description,
        outcome,
        created_by: 'whatsapp-service',
        external_id: messageId
      });
    } catch (error) {
      console.error('Erro ao criar atividade:', error);
    }
  }

  private async updateLeadTemperature(leadId: string, temperature: string): Promise<void> {
    try {
      await axios.put(`${this.leadsServiceUrl}/leads/${leadId}`, {
        temperature
      });
    } catch (error) {
      console.error('Erro ao atualizar temperatura do lead:', error);
    }
  }
}